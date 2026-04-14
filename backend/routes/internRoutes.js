const express = require("express");
const router = express.Router();

router.get("/interns", (req, res) => {
  res.json({
    message: "Intern route working"
  });
});

module.exports = router;