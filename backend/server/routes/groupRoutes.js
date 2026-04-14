const express = require("express");
const router = express.Router();
const Group = require("../models/Group");
const User = require("../models/User");

// ==================== PUBLIC ROUTES ====================

// Get all verified groups (public)
router.get("/groups", async (req, res) => {
  try {
    const { category, search } = req.query;
    
    let query = { isActive: true, isVerified: true };
    
    if (category && category !== "all") {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } }
      ];
    }
    
    const groups = await Group.find(query)
      .populate("facilitator", "name role specialization bio")
      .sort({ createdAt: -1 });
    
    res.json(groups);
  } catch (err) {
    console.error("Get groups error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get single group details
router.get("/groups/:id", async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("facilitator", "name role specialization bio qualifications experience")
      .populate("members", "name email role");
    
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    
    res.json(group);
  } catch (err) {
    console.error("Get group error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get popular groups
router.get("/groups/popular/top", async (req, res) => {
  try {
    const groups = await Group.getPopularGroups(6);
    res.json(groups);
  } catch (err) {
    console.error("Popular groups error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ==================== USER GROUP ACTIONS ====================

// Join a group
router.post("/groups/:id/join", async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: "User ID required" });
    }
    
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    
    await group.addMember(userId);
    
    res.json({ 
      success: true, 
      message: "Successfully joined group",
      memberCount: group.members.length 
    });
  } catch (err) {
    console.error("Join group error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Leave a group
router.post("/groups/:id/leave", async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: "User ID required" });
    }
    
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    
    // Don't allow facilitator to leave their own group
    if (group.facilitator.toString() === userId) {
      return res.status(400).json({ 
        message: "Facilitator cannot leave their own group. Transfer ownership or delete the group." 
      });
    }
    
    await group.removeMember(userId);
    
    res.json({ 
      success: true, 
      message: "Successfully left group",
      memberCount: group.members.length 
    });
  } catch (err) {
    console.error("Leave group error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Check if user is member
router.get("/groups/:id/check-membership/:userId", async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    
    const isMember = group.isMember(req.params.userId);
    res.json({ isMember });
  } catch (err) {
    console.error("Check membership error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ==================== USER'S GROUPS ====================

// Get user's joined groups
router.get("/users/:userId/groups", async (req, res) => {
  try {
    const groups = await Group.find({ 
      members: req.params.userId,
      isActive: true 
    })
      .populate("facilitator", "name role")
      .sort({ meetingTime: 1 });
    
    res.json(groups);
  } catch (err) {
    console.error("User groups error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get groups facilitated by user
router.get("/users/:userId/facilitating", async (req, res) => {
  try {
    const groups = await Group.find({ 
      facilitator: req.params.userId,
      isActive: true 
    })
      .populate("members", "name email")
      .sort({ createdAt: -1 });
    
    res.json(groups);
  } catch (err) {
    console.error("Facilitating groups error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ==================== FACILITATOR ACTIONS ====================

// Create new group (therapists/interns only)
router.post("/groups", async (req, res) => {
  try {
    const { 
      name, 
      category, 
      description, 
      meetingTime, 
      meetingLink,
      format,
      tags, 
      guidelines,
      facilitatorId 
    } = req.body;

    // Verify facilitator
    const facilitator = await User.findById(facilitatorId);
    if (!facilitator) {
      return res.status(404).json({ message: "Facilitator not found" });
    }
    
    // Check if user can facilitate
    const canFacilitate = ["therapist", "intern", "admin"].includes(facilitator.role);
    if (!canFacilitate) {
      return res.status(403).json({ 
        message: "Only verified therapists and interns can create groups" 
      });
    }

    // Get icon and color based on category
    const icon = getIconForCategory(category);
    const color = getColorForCategory(category);

    const group = new Group({
      name,
      category,
      description,
      meetingTime,
      meetingLink: meetingLink || generateMeetingLink(),
      format: format || "Online Video Call",
      facilitator: facilitatorId,
      facilitatorRole: facilitator.role === "intern" ? "Therapist Intern" : "Therapist",
      tags: tags || [category],
      guidelines: guidelines || undefined,
      icon,
      color,
      members: [facilitatorId], // Facilitator auto-joins
      isVerified: facilitator.role === "admin" // Auto-verify if admin creates
    });

    await group.save();
    
    // Add to facilitator's joinedGroups
    await User.findByIdAndUpdate(facilitatorId, {
      $addToSet: { joinedGroups: group._id }
    });

    res.status(201).json({
      success: true,
      message: "Group created successfully! Waiting for admin approval.",
      group
    });
  } catch (err) {
    console.error("Create group error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Update group (facilitator only)
router.put("/groups/:id", async (req, res) => {
  try {
    const { userId, ...updates } = req.body;
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    
    // Check if user is facilitator
    if (group.facilitator.toString() !== userId) {
      return res.status(403).json({ message: "Only the facilitator can update this group" });
    }
    
    Object.assign(group, updates);
    await group.save();
    
    res.json({ success: true, message: "Group updated successfully", group });
  } catch (err) {
    console.error("Update group error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Delete group (facilitator or admin only)
router.delete("/groups/:id", async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.id);
    const user = await User.findById(userId);
    
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    
    // Check permissions
    const isFacilitator = group.facilitator.toString() === userId;
    const isAdmin = user?.role === "admin";
    
    if (!isFacilitator && !isAdmin) {
      return res.status(403).json({ message: "Unauthorized to delete this group" });
    }
    
    // Remove group from all members' joinedGroups
    await User.updateMany(
      { joinedGroups: group._id },
      { $pull: { joinedGroups: group._id } }
    );
    
    await Group.findByIdAndDelete(req.params.id);
    
    res.json({ success: true, message: "Group deleted successfully" });
  } catch (err) {
    console.error("Delete group error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Post announcement (facilitator only)
router.post("/groups/:id/announcements", async (req, res) => {
  try {
    const { userId, title, content } = req.body;
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    
    if (group.facilitator.toString() !== userId) {
      return res.status(403).json({ message: "Only facilitator can post announcements" });
    }
    
    group.announcements.push({ title, content, postedBy: userId });
    await group.save();
    
    res.json({ success: true, message: "Announcement posted", group });
  } catch (err) {
    console.error("Announcement error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ==================== APPLICATION ROUTES ====================

// Submit application to facilitate
router.post("/groups/apply", async (req, res) => {
  try {
    const { 
      userId, 
      groupName, 
      category, 
      description, 
      meetingTime, 
      experience, 
      qualifications 
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user can apply
    const canApply = ["therapist", "intern"].includes(user.role);
    if (!canApply) {
      return res.status(403).json({ 
        message: "Only therapists and interns can apply to facilitate groups" 
      });
    }

    // Add application
    user.groupApplications.push({
      groupName,
      category,
      description,
      meetingTime,
      experience,
      qualifications,
      status: "pending"
    });

    await user.save();

    res.json({ 
      success: true, 
      message: "Application submitted successfully! We'll review it within 48 hours." 
    });
  } catch (err) {
    console.error("Apply error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get user's applications
router.get("/users/:userId/applications", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("groupApplications");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(user.groupApplications || []);
  } catch (err) {
    console.error("Get applications error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ==================== ADMIN ROUTES ====================

// Get pending groups (admin only)
router.get("/admin/groups/pending", async (req, res) => {
  try {
    const groups = await Group.find({ isVerified: false, isActive: true })
      .populate("facilitator", "name email role")
      .sort({ createdAt: -1 });
    
    res.json(groups);
  } catch (err) {
    console.error("Pending groups error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Verify group (admin only)
router.put("/admin/groups/:id/verify", async (req, res) => {
  try {
    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { isVerified: true },
      { new: true }
    );
    
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    
    res.json({ success: true, message: "Group verified", group });
  } catch (err) {
    console.error("Verify group error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get all facilitation applications (admin only)
router.get("/admin/applications", async (req, res) => {
  try {
    const users = await User.find({ "groupApplications.0": { $exists: true } })
      .select("name email role groupApplications")
      .sort({ "groupApplications.appliedAt": -1 });
    
    const applications = users.flatMap(user => 
      user.groupApplications.map(app => ({
        ...app.toObject(),
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role
      }))
    );
    
    res.json(applications);
  } catch (err) {
    console.error("Admin applications error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Approve/reject application (admin only)
router.put("/admin/applications/:userId/:appId", async (req, res) => {
  try {
    const { status, reviewNotes } = req.body;
    const { userId, appId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const application = user.groupApplications.id(appId);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }
    
    application.status = status;
    application.reviewedAt = new Date();
    application.reviewNotes = reviewNotes || "";
    
    // If approved, create the group
    if (status === "approved") {
      const icon = getIconForCategory(application.category);
      const color = getColorForCategory(application.category);
      
      const group = new Group({
        name: application.groupName,
        category: application.category,
        description: application.description,
        meetingTime: application.meetingTime,
        facilitator: userId,
        facilitatorRole: user.role === "intern" ? "Therapist Intern" : "Therapist",
        tags: [application.category],
        icon,
        color,
        members: [userId],
        isVerified: true
      });
      
      await group.save();
      
      await User.findByIdAndUpdate(userId, {
        $addToSet: { joinedGroups: group._id }
      });
    }
    
    await user.save();
    
    res.json({ success: true, message: `Application ${status}`, application });
  } catch (err) {
    console.error("Review application error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ==================== HELPER FUNCTIONS ====================

function getIconForCategory(category) {
  const icons = {
    anxiety: "😰",
    depression: "🌧️",
    stress: "😓",
    mindfulness: "🧘",
    relationships: "💑",
    grief: "🕊️",
    selfcare: "💆",
    other: "👥"
  };
  return icons[category] || "👥";
}

function getColorForCategory(category) {
  const colors = {
    anxiety: "#f59e0b",
    depression: "#3b82f6",
    stress: "#ef4444",
    mindfulness: "#10b981",
    relationships: "#ec4899",
    grief: "#8b5cf6",
    selfcare: "#06b6d4",
    other: "#7c3aed"
  };
  return colors[category] || "#7c3aed";
}

function generateMeetingLink() {
  return `https://meet.google.com/${Math.random().toString(36).substring(2, 10)}`;
}

module.exports = router;
module.exports = router;