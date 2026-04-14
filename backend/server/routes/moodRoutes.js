const express = require("express");
const router = express.Router();
const Mood = require("../models/Mood");

router.post("/mood/save", async (req, res) => {
  try {
    const { userId, emotion, confidence, note } = req.body;
    const mood = new Mood({ userId, emotion, confidence, note });
    await mood.save();
    res.json({ message: "Mood saved" });
  } catch (err) {
    console.error("Mood save error:", err);
    res.status(500).json({ message: "Error saving mood" });
  }
});

router.get("/mood/history/:userId", async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const moods = await Mood.find({
      userId: req.params.userId,
      createdAt: { $gte: sevenDaysAgo }
    }).sort({ createdAt: 1 });
    res.json(moods);
  } catch (err) {
    res.status(500).json({ message: "Error fetching mood history" });
  }
});

module.exports = router;