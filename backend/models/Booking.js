const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  therapistId: String,
  therapistName: String,
  therapistRole: { type: String, enum: ["therapist", "intern"] },
  patientId: String,
  patientName: String,
  corporateId: String,
  corporateName: String,
  organizationType: String,
  date: String,
  time: String,
  mode: { type: String, enum: ["online", "offline"], default: "online" },
  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled"],
    default: "pending"
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Booking", BookingSchema);