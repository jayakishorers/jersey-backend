const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

// =============================
// Send message to a user (Admin/Superadmin)
// =============================
router.post('/send', auth, async (req, res) => {
  try {
    const { email, userId, message, type } = req.body;

    // Accept either userId or email
    if ((!userId && !email) || !message) {
      return res.status(400).json({ success: false, message: "UserId/email and message are required" });
    }

    // Find target user
    let user;
    if (userId) {
      user = await User.findById(userId).select('name email');
    } else if (email) {
      user = await User.findOne({ email }).select('name email');
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "Target user not found" });
    }

    // Save message for that user
    const newMessage = new Message({
      userId: user._id,
      userName: user.name,
      message,
      type: type || "info",
      read: false
    });

    await newMessage.save();

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: newMessage
    });
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
});

// =============================
// Get all messages (Admin/Superadmin only)
// =============================
router.get('/all', auth, async (req, res) => {
  try {
    const messages = await Message.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: { messages }
    });
  } catch (err) {
    console.error("Fetch messages error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch messages" });
  }
});

// =============================
// Get logged-in user's messages
// =============================
router.get('/my-messages', auth, async (req, res) => {
  try {
   const messages = await Message.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: { messages } });
  } catch (err) {
    console.error("Fetch user messages error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch messages" });
  }
});

// =============================
// Mark a message as read
// =============================
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const message = await Message.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { read: true },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    res.json({ success: true, data: { message } });
  } catch (err) {
    console.error("Mark message read error:", err);
    res.status(500).json({ success: false, message: "Failed to update message" });
  }
});

module.exports = router;
