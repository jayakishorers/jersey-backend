const mongoose = require('mongoose');

const emailSubscriptionSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  source: {
    type: String,
    enum: ['footer', 'popup', 'checkout'],
    default: 'footer'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('EmailSubscription', emailSubscriptionSchema);