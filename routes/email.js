const express = require('express');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const EmailSubscription = require('../models/EmailSubscription');

const router = express.Router();

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Subscribe to newsletter
router.post('/subscribe', [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address',
        errors: errors.array()
      });
    }

    const { email, source = 'footer' } = req.body;

    // Check if email already exists
    const existingSubscription = await EmailSubscription.findOne({ email });
    if (existingSubscription) {
      if (existingSubscription.isActive) {
        return res.status(400).json({
          success: false,
          message: 'This email is already subscribed to our newsletter'
        });
      } else {
        // Reactivate subscription
        existingSubscription.isActive = true;
        existingSubscription.source = source;
        await existingSubscription.save();
        
        return res.json({
          success: true,
          message: 'Welcome back! Your subscription has been reactivated.'
        });
      }
    }

    // Create new subscription
    const subscription = new EmailSubscription({
      email,
      source
    });

    await subscription.save();

    // Send welcome email
    try {
      const transporter = createTransporter();
      
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Welcome to JerseyPro Newsletter!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1f2937;">Welcome to JerseyPro!</h2>
            <p>Thank you for subscribing to our newsletter. You'll be the first to know about:</p>
            <ul>
              <li>New jersey releases</li>
              <li>Exclusive discounts and offers</li>
              <li>Limited edition collections</li>
              <li>Football news and updates</li>
            </ul>
            <p>Stay tuned for amazing deals on premium football jerseys!</p>
            <p style="color: #6b7280; font-size: 14px;">
              If you didn't subscribe to this newsletter, you can safely ignore this email.
            </p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('Welcome email error:', emailError);
      // Don't fail the subscription if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to newsletter! Check your email for confirmation.'
    });

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to subscribe. Please try again later.'
    });
  }
});

// Unsubscribe from newsletter
router.post('/unsubscribe', [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    const { email } = req.body;

    const subscription = await EmailSubscription.findOne({ email });
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Email not found in our subscription list'
      });
    }

    subscription.isActive = false;
    await subscription.save();

    res.json({
      success: true,
      message: 'Successfully unsubscribed from newsletter'
    });

  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unsubscribe. Please try again later.'
    });
  }
});

module.exports = router;