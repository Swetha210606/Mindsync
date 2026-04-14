const mongoose = require("mongoose");

const MoodSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  emotion: { type: String, required: true },
  confidence: { type: Number, default: 0 },
  note: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Mood", MoodSchema);