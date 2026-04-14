const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  // ─── Basic Info ──────────────────────────────────────────────
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  dob: { type: String, default: "" },
  age: { type: Number, default: 0 },
  location: { type: String, required: true },
  language: { type: String, required: true },
  
  // ─── Role & Verification ─────────────────────────────────────
  role: {
    type: String,
    enum: ["patient", "therapist", "intern", "corporate", "admin"],
    required: true
  },
  isVerified: { type: Boolean, default: false },
  
  // ─── Patient Fields ──────────────────────────────────────────
  issue: { type: String, default: "" },
  
  // ─── Therapist/Intern Fields ─────────────────────────────────
  specialization: { type: String, default: "" },
  experience: { type: String, default: "" },
  licenseNumber: { type: String, default: "" },
  qualifications: { type: String, default: "" },
  bio: { type: String, default: "" },
  sessionPrice: { type: Number, default: 0 },
  
  // ─── Corporate Fields ────────────────────────────────────────
  budget: { type: Number, default: 0 },
  companyName: { type: String, default: "" },
  employeeCount: { type: String, default: "" },
  organizationType: { type: String, default: "" },
  
  // ─── Mood Tracking ───────────────────────────────────────────
  moodHistory: [{
    mood: String,
    score: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  
  // ─── AI Chat History ─────────────────────────────────────────
  chatHistory: [{
    message: String,
    response: String,
    timestamp: { type: Date, default: Date.now }
  }],
  
  // ─── Crisis Detection ────────────────────────────────────────
  crisisFlag: { type: Boolean, default: false },
  lastCrisisAt: Date,
  crisisLogs: [{
    message: String,
    timestamp: { type: Date, default: Date.now }
  }],
  
  // ─── Ratings ─────────────────────────────────────────────────
  ratings: [{
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" }, // ⭐ NEW
    rating: { type: Number, min: 1, max: 5 },
    review: String,
    timestamp: { type: Date, default: Date.now }
  }],
  averageRating: { type: Number, default: 0 },
  
  // ─── Support Group Applications ──────────────────────────────
  groupApplications: [{
    groupName: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    meetingTime: { type: String, required: true },
    experience: { type: String, required: true },
    qualifications: { type: String, default: "" },
    status: { 
      type: String, 
      enum: ["pending", "approved", "rejected"], 
      default: "pending" 
    },
    appliedAt: { type: Date, default: Date.now },
    reviewedAt: Date,
    reviewNotes: { type: String, default: "" }
  }],
  
  // ─── Joined Groups ───────────────────────────────────────────
  joinedGroups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group"
  }],
  
  // ─── Timestamps ───────────────────────────────────────────────
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", UserSchema);