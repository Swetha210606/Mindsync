const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const User = require("../models/User");

// Get all registered therapists and interns
router.get("/therapists", async (req, res) => {
  try {
    const { specialization, maxBudget, search } = req.query;
    let filter = { role: { $in: ["therapist", "intern"] } };
    if (specialization && specialization !== "") {
      filter.specialization = { $regex: specialization, $options: "i" };
    }
    if (search && search !== "") {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { specialization: { $regex: search, $options: "i" } }
      ];
    }
    if (maxBudget && maxBudget !== "") {
      filter.budget = { $lte: Number(maxBudget) };
    }
    const counsellors = await User.find(filter).select("-password");
    res.json(counsellors);
  } catch (err) {
    console.error("Therapist fetch error:", err);
    res.status(500).json({ message: "Error fetching counsellors" });
  }
});

// Book a single session
router.post("/book", async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();
    res.json({ message: "Session booked successfully!", booking });
  } catch (err) {
    console.error("Booking error:", err);
    res.status(500).json({ message: "Booking failed" });
  }
});

// Corporate bulk booking
router.post("/book/bulk", async (req, res) => {
  try {
    const { sessions, corporateId, corporateName, organizationType } = req.body;
    const bookings = sessions.map((s) => ({
      ...s,
      corporateId,
      corporateName,
      organizationType,
      status: "pending"
    }));
    await Booking.insertMany(bookings);
    res.json({ message: `${sessions.length} sessions booked successfully!` });
  } catch (err) {
    console.error("Bulk booking error:", err);
    res.status(500).json({ message: "Bulk booking failed" });
  }
});

// Get bookings for a patient
router.get("/bookings/patient/:patientId", async (req, res) => {
  try {
    const bookings = await Booking.find({ patientId: req.params.patientId })
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Error fetching bookings" });
  }
});

// Get bookings for a therapist/intern
router.get("/bookings/therapist/:therapistId", async (req, res) => {
  try {
    const bookings = await Booking.find({ therapistId: req.params.therapistId })
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Error fetching bookings" });
  }
});

// Get bookings for corporate
router.get("/bookings/corporate/:corporateId", async (req, res) => {
  try {
    const bookings = await Booking.find({ corporateId: req.params.corporateId })
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Error fetching corporate bookings" });
  }
});

module.exports = router;