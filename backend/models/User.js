const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  dob: { type: String, default: "" },
  age: { type: Number, default: 0 },
  location: { type: String, required: true },
  language: { type: String, required: true },
  role: {
    type: String,
    enum: ["patient", "therapist", "intern", "corporate", "admin"],
    required: true
  },
  issue: { type: String, default: "" },
  specialization: { type: String, default: "" },
  experience: { type: String, default: "" },
  budget: { type: Number, default: 0 },
  companyName: { type: String, default: "" },
  employeeCount: { type: String, default: "" },
  organizationType: { type: String, default: "" },
  isVerified: { type: Boolean, default: false },
  ratings: [
    {
      patientId: { type: String },
      patientName: { type: String },
      rating: { type: Number, min: 1, max: 5 },
      review: { type: String },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", UserSchema);