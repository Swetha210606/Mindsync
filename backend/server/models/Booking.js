const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  therapistName: { type: String, required: true },
  therapistRole: { type: String, enum: ["therapist", "intern"] },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  patientName: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  mode: { type: String, enum: ["online", "offline"], default: "online" },
  status: { type: String, enum: ["pending", "confirmed", "cancelled", "completed"], default: "pending" },
  rated: { type: Boolean, default: false }, // ⭐ NEW - Track if session was rated
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Booking", BookingSchema);