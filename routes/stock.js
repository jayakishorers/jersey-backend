const express = require("express");
const Stock = require("../models/Stock");
const auth = require("../middleware/auth");

const router = express.Router();

// Get all stock
router.get("/", async (req, res) => {
  try {
    const stocks = await Stock.find();
    res.json({ success: true, data: stocks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update stock for a jersey
router.patch("/:jerseyId", auth, async (req, res) => {
  try {
    const { jerseyId } = req.params;
    const { stockBySize } = req.body;

    const updated = await Stock.findOneAndUpdate(
      { jerseyId },
      { stockBySize },
      { new: true, upsert: true } // creates if doesn't exist
    );

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
