const mongoose = require("mongoose");

const stockSchema = new mongoose.Schema({
  jerseyId: { type: String, required: true, unique: true }, // links to jerseys.ts id
  stockBySize: {
    type: Map,
    of: Number,
    default: {}, // e.g., { S: 10, M: 5, L: 0 }
  },
});

module.exports = mongoose.model("Stock", stockSchema);
