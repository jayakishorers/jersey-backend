const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');

// Configure the nodemailer transporter once at the top of the file
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'chennaiyinjersey@gmail.com', // Your Gmail address
        pass: 'zfjm cqjz ncjs pflw',        // Your App-specific password
    },
});

// =============================
// Send message to a user (Admin/Superadmin)
// =============================
router.post('/send', auth, async (req, res) => {
    try {
        // Ensure only an admin can perform this action
        if (req.user.email !== "123@gmail.com") {
            return res.status(403).json({ success: false, message: 'Forbidden: Admin only' });
        }

        const { userId, message, type, isBroadcast } = req.body;

        if (!userId || !message) {
            return res.status(400).json({ success: false, message: "UserId and message are required" });
        }

        // Find target user
        const user = await User.findById(userId).select('name email');
        if (!user) {
            return res.status(404).json({ success: false, message: "Target user not found" });
        }

        // Save message for that user
        const newMessage = new Message({
            userId: user._id,
            userName: user.name,
            message,
            type: type || "info",
            read: false,
            isBroadcast: isBroadcast || false
        });

        await newMessage.save();

        // ----------------------------------------------------
        // Corrected code: The email logic is now outside the conditional
        // ----------------------------------------------------
        const emailSubject = isBroadcast ? 'Important Announcement!' : 'You Have a New Message!';
        const emailHtml = `
            <h1>${isBroadcast ? '📣 Special Announcement!' : '📧 New Message from The Jersey Store!'}</h1>
            <p>Dear ${user.name},</p>
            <p>You have a new message from our team:</p>
            <div style="background-color: #f0f4f8; padding: 15px; border-radius: 8px;">
                <p style="font-style: italic;">"${message}"</p>
            </div>
            <p>Thank you for being a part of our community. If you have any questions, please contact us directly.</p>
            <p>Best regards,</p>
            <p>The Jersey Store Team</p>
        `;

        const mailOptions = {
            from: 'chennaiyinjersey@gmail.com',
            to: user.email,
            subject: emailSubject,
            html: emailHtml,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
            } else {
                console.log('Email sent:', info.response);
            }
        });

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