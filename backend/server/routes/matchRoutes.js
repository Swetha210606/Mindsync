const express = require("express");
const router = express.Router();
const User = require("../models/User");

router.get("/match", async (req, res) => {

  try {

    const { issue, language, budget, location } = req.query;

    const therapists = await User.find({
      role: { $in: ["therapist", "intern"] },
      specialization: { $regex: issue, $options: "i" },
      language: { $regex: language, $options: "i" },
      location: { $regex: location, $options: "i" },
      budget: { $lte: Number(budget) }
    });

    res.json(therapists);

  } catch (error) {

    res.status(500).json(error);

  }

});

module.exports = router;