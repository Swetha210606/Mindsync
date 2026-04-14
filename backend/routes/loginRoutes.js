const express = require("express");
const router = express.Router();
const User = require("../models/User");

router.post("/login", async (req, res) => {

  const { email, password } = req.body;

  try {

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ message: "User not found" });
    }

    if (user.password !== password) {
      return res.json({ message: "Incorrect password" });
    }

    res.json({
      message: "Login successful",
      user
    });

  } catch (err) {
    res.status(500).json(err);
  }

});

module.exports = router;