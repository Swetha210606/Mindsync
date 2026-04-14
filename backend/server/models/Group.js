const mongoose = require("mongoose");

const GroupSchema = new mongoose.Schema({
  // ─── Basic Info ──────────────────────────────────────────────
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  category: { 
    type: String, 
    required: true,
    enum: ["anxiety", "depression", "stress", "mindfulness", "relationships", "grief", "selfcare", "other"]
  },
  description: { 
    type: String, 
    required: true 
  },
  
  // ─── Meeting Details ─────────────────────────────────────────
  meetingTime: { 
    type: String, 
    required: true 
  },
  meetingLink: { 
    type: String, 
    default: "" 
  },
  format: { 
    type: String, 
    default: "Online Video Call",
    enum: ["Online Video Call", "Online Audio Session", "In-Person", "Hybrid"]
  },
  
  // ─── Facilitator ─────────────────────────────────────────────
  facilitator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  facilitatorRole: {
    type: String,
    default: "Facilitator"
  },
  
  // ─── Members ─────────────────────────────────────────────────
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  
  // ─── Group Details ───────────────────────────────────────────
  tags: [String],
  icon: { 
    type: String, 
    default: "👥" 
  },
  color: { 
    type: String, 
    default: "#7c3aed" 
  },
  guidelines: {
    type: [String],
    default: [
      "Confidentiality is mandatory - what's shared here stays here",
      "Be respectful and non-judgmental",
      "Share only if you're comfortable",
      "No recording of sessions",
      "Arrive on time for meetings"
    ]
  },
  
  // ─── Stats ───────────────────────────────────────────────────
  totalSessions: {
    type: Number,
    default: 0
  },
  averageAttendance: {
    type: Number,
    default: 0
  },
  
  // ─── Status ─────────────────────────────────────────────────
  isActive: { 
    type: Boolean, 
    default: true 
  },
  isVerified: {
    type: Boolean,
    default: false  // Admin needs to verify new groups
  },
  
  // ─── Images ─────────────────────────────────────────────────
  coverImage: {
    type: String,
    default: ""
  },
  
  // ─── Sessions History ────────────────────────────────────────
  pastSessions: [{
    date: Date,
    topic: String,
    attendeeCount: Number,
    notes: String
  }],
  
  // ─── Announcements ───────────────────────────────────────────
  announcements: [{
    title: String,
    content: String,
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    postedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // ─── Timestamps ───────────────────────────────────────────────
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// ─── Virtual for member count ─────────────────────────────────
GroupSchema.virtual("memberCount").get(function() {
  return this.members.length;
});

// ─── Auto-update updatedAt ────────────────────────────────────
GroupSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// ─── Static method to get popular groups ──────────────────────
GroupSchema.statics.getPopularGroups = function(limit = 6) {
  return this.find({ isActive: true, isVerified: true })
    .sort({ "members.length": -1 })
    .limit(limit)
    .populate("facilitator", "name role");
};

// ─── Instance method to check if user is member ───────────────
GroupSchema.methods.isMember = function(userId) {
  return this.members.some(id => id.toString() === userId.toString());
};

// ─── Instance method to add member ────────────────────────────
GroupSchema.methods.addMember = async function(userId) {
  if (!this.isMember(userId)) {
    this.members.push(userId);
    await this.save();
    
    // Also add to user's joinedGroups
    const User = mongoose.model("User");
    await User.findByIdAndUpdate(userId, {
      $addToSet: { joinedGroups: this._id }
    });
  }
  return this;
};

// ─── Instance method to remove member ─────────────────────────
GroupSchema.methods.removeMember = async function(userId) {
  this.members = this.members.filter(id => id.toString() !== userId.toString());
  await this.save();
  
  // Also remove from user's joinedGroups
  const User = mongoose.model("User");
  await User.findByIdAndUpdate(userId, {
    $pull: { joinedGroups: this._id }
  });
  
  return this;
};

// Ensure virtuals are included in JSON
GroupSchema.set('toJSON', { virtuals: true });
GroupSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("Group", GroupSchema);