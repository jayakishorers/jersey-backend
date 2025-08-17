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
    const { userId, message, type } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ success: false, message: "UserId and message are required" });
    }

    const user = await User.findById(userId).select('name email');
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const newMessage = new Message({
      userId,
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
    // Optional: restrict to superadmin only
    // if (req.user.email !== "123@gmail.com") {
    //   return res.status(403).json({ success: false, message: "Forbidden" });
    // }

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
    const messages = await Message.find({ userId: req.user.id })
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
      { _id: req.params.id, userId: req.user.id },
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
