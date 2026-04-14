const express = require("express");
const router = express.Router();

router.get("/therapists", (req, res) => {
  res.json({
    message: "Therapist route working"
  });
});

module.exports = router;