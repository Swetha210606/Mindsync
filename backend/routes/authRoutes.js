const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Booking = require("../models/Booking");


const SECRET = "mindsync_secret_key";

// ─── REGISTER ────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const {
      name, email, password, phone, dob, age,
      location, language, role,
      issue, specialization, experience, budget,
      companyName, employeeCount, organizationType
    } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name, email,
      password: hashedPassword,
      phone, dob: dob || "", age: age || 0,
      location, language, role,
      issue: issue || "",
      specialization: specialization || "",
      experience: experience || "",
      budget: budget ? Number(budget) : 0,
      companyName: companyName || "",
      employeeCount: employeeCount || "",
      organizationType: organizationType || "",
      isVerified: role === "patient" || role === "corporate" ? true : false
    });

    await newUser.save();
    res.status(201).json({ message: "Account created successfully" });

  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error during registration" });
  }
});

// ─── LOGIN ───────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
        language: user.language,
        specialization: user.specialization,
        experience: user.experience,
        budget: user.budget,
        companyName: user.companyName,
        employeeCount: user.employeeCount,
        organizationType: user.organizationType,
        isVerified: user.isVerified
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
});

// ─── ADMIN — Get all users ────────────────────────────────────────
router.get("/admin/users", async (req, res) => {
  try {
    const users = await User.find({}).select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users" });
  }
});

// ─── ADMIN — Get all bookings ─────────────────────────────────────
router.get("/admin/bookings", async (req, res) => {
  try {
    const bookings = await Booking.find({}).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Error fetching bookings" });
  }
});

// ─── ADMIN — Verify therapist/intern ─────────────────────────────
router.patch("/admin/verify/:userId", async (req, res) => {
  try {
    const result = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: { isVerified: true } },
      { new: true, returnDocument: "after" }
    ).select("-password");
    if (!result) return res.status(404).json({ message: "User not found" });
    console.log("✅ Verified:", result.name, "isVerified:", result.isVerified);
    res.json({ message: "User verified successfully", user: result });
  } catch (err) {
    console.error("Verify error:", err);
    res.status(500).json({ message: "Error verifying user", error: err.message });
  }
});

// ─── ADMIN — Reject/Unverify ──────────────────────────────────────
router.patch("/admin/reject/:userId", async (req, res) => {
  try {
    const result = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: { isVerified: false } },
      { new: true, returnDocument: "after" }
    ).select("-password");
    if (!result) return res.status(404).json({ message: "User not found" });
    console.log("⚠️ Rejected:", result.name, "isVerified:", result.isVerified);
    res.json({ message: "User rejected", user: result });
  } catch (err) {
    console.error("Reject error:", err);
    res.status(500).json({ message: "Error rejecting user", error: err.message });
  }
});
// ─── ADMIN — Delete user ──────────────────────────────────────────
router.delete("/admin/user/:userId", async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.userId);
    if (!deleted) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Error deleting user" });
  }
});

module.exports = router;

module.exports = router;