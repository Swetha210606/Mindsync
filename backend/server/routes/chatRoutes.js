const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const Group = require("../models/Group");
const User = require("../models/User");

// Get messages for a group
router.get("/groups/:groupId/messages", async (req, res) => {
  try {
    const messages = await Message.find({ groupId: req.params.groupId })
      .populate("sender", "name role")
      .sort({ createdAt: 1 })
      .limit(100);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Send a message
router.post("/groups/:groupId/messages", async (req, res) => {
  try {
    const { userId, content, type = "user" } = req.body;
    
    const user = await User.findById(userId);
    const group = await Group.findById(req.params.groupId);
    
    if (!group.members.includes(userId)) {
      return res.status(403).json({ message: "You must join the group to send messages" });
    }
    
    const message = new Message({
      groupId: req.params.groupId,
      sender: userId,
      senderName: user.name,
      senderRole: user.role,
      content,
      type
    });
    
    await message.save();
    
    // Populate sender info
    await message.populate("sender", "name role");
    
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add reaction to message
router.post("/messages/:messageId/react", async (req, res) => {
  try {
    const { userId, emoji } = req.body;
    const message = await Message.findById(req.params.messageId);
    
    const existingReaction = message.reactions.find(r => r.userId.toString() === userId);
    if (existingReaction) {
      existingReaction.emoji = emoji;
    } else {
      message.reactions.push({ emoji, userId });
    }
    
    await message.save();
    res.json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Send awareness tip (facilitator only)
router.post("/groups/:groupId/awareness", async (req, res) => {
  try {
    const { userId, content } = req.body;
    const group = await Group.findById(req.params.groupId);
    
    if (group.facilitator.toString() !== userId) {
      return res.status(403).json({ message: "Only facilitator can send awareness tips" });
    }
    
    const message = new Message({
      groupId: req.params.groupId,
      sender: userId,
      senderName: "MindSync Bot",
      senderRole: "system",
      content: `📢 **Awareness Tip:** ${content}`,
      type: "awareness"
    });
    
    await message.save();
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;