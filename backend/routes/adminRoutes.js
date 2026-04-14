const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Booking = require("../models/Booking");

router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}).select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users" });
  }
});

router.get("/bookings", async (req, res) => {
  try {
    const bookings = await Booking.find({}).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Error fetching bookings" });
  }
});

router.patch("/verify/:userId", async (req, res) => {
  try {
    const result = await User.findByIdAndUpdate(
      req.params.userId,
      { isVerified: true },
      { new: true }
    ).select("-password");
    if (!result) return res.status(404).json({ message: "User not found" });
    console.log("✅ Verified:", result.name, "isVerified:", result.isVerified);
    res.json({ message: "Verified successfully", user: result });
  } catch (err) {
    console.error("Verify error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

router.patch("/reject/:userId", async (req, res) => {
  try {
    const result = await User.findByIdAndUpdate(
      req.params.userId,
      { isVerified: false },
      { new: true }
    ).select("-password");
    if (!result) return res.status(404).json({ message: "User not found" });
    console.log("⚠️ Rejected:", result.name, "isVerified:", result.isVerified);
    res.json({ message: "Rejected successfully", user: result });
  } catch (err) {
    console.error("Reject error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

router.delete("/user/:userId", async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.userId);
    if (!deleted) return res.status(404).json({ message: "User not found" });
    console.log("🗑️ Deleted:", deleted.name);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;