const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
  name: { type: String, required: true },
  basePrice: { type: Number, required: true },
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['upcoming', 'open', 'closed'], default: 'upcoming' },
  picture: { type: String }, // Store file path
  startTime: { type: Date }, // Auction start time
});

module.exports = mongoose.model('Crop', cropSchema);