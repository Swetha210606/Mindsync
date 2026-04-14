const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Booking = require("../models/Booking");

// Submit a rating/review
router.post("/ratings", async (req, res) => {
  try {
    const { therapistId, patientId, bookingId, rating, review } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    // Find therapist
    const therapist = await User.findById(therapistId);
    if (!therapist) {
      return res.status(404).json({ message: "Therapist not found" });
    }

    // Check if already rated this booking
    const existingRating = therapist.ratings.find(
      r => r.bookingId?.toString() === bookingId
    );

    if (existingRating) {
      return res.status(400).json({ message: "You have already rated this session" });
    }

    // Add rating
    therapist.ratings.push({
      patientId,
      bookingId,
      rating,
      review: review || "",
      timestamp: new Date()
    });

    // Calculate new average
    const total = therapist.ratings.reduce((sum, r) => sum + r.rating, 0);
    therapist.averageRating = total / therapist.ratings.length;

    await therapist.save();

    // Mark booking as rated
    if (bookingId) {
      await Booking.findByIdAndUpdate(bookingId, { rated: true });
    }

    res.json({ 
      success: true, 
      message: "Rating submitted successfully",
      averageRating: therapist.averageRating
    });
  } catch (err) {
    console.error("Rating error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get therapist ratings
router.get("/ratings/:therapistId", async (req, res) => {
  try {
    const therapist = await User.findById(req.params.therapistId)
      .select("ratings averageRating name")
      .populate("ratings.patientId", "name");

    if (!therapist) {
      return res.status(404).json({ message: "Therapist not found" });
    }

    // Sort ratings by newest first
    const sortedRatings = (therapist.ratings || []).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    res.json({
      therapistName: therapist.name,
      ratings: sortedRatings,
      averageRating: therapist.averageRating || 0,
      totalRatings: therapist.ratings?.length || 0
    });
  } catch (err) {
    console.error("Get ratings error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Check if booking is already rated
router.get("/ratings/check/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json({ 
      alreadyRated: booking.rated || false 
    });
  } catch (err) {
    console.error("Check rating error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get therapist's average rating only
router.get("/ratings/:therapistId/average", async (req, res) => {
  try {
    const therapist = await User.findById(req.params.therapistId)
      .select("averageRating ratings");

    if (!therapist) {
      return res.status(404).json({ message: "Therapist not found" });
    }

    res.json({
      averageRating: therapist.averageRating || 0,
      totalRatings: therapist.ratings?.length || 0
    });
  } catch (err) {
    console.error("Average rating error:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;