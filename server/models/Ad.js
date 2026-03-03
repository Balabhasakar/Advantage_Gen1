const mongoose = require("mongoose");

const AdSchema = new mongoose.Schema({
  prompt: String,
  imageUrl: String, // This will be the Cloudinary URL (https://res.cloudinary.com/...)
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Ad", AdSchema);