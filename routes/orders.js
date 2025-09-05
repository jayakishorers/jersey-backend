    const express = require('express');
    const { body, validationResult } = require('express-validator');
    const Order = require('../models/Order');
    const auth = require('../middleware/auth');
    const nodemailer = require('nodemailer');

    const router = express.Router();

    // Configure the nodemailer transporter once at the top of the file
    const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'chennaiyinjersey@gmail.com', // Your Gmail address (e.g., yourstore@gmail.com)
        pass: 'zfjm cqjz ncjs pflw',   // The App-specific password for your Gmail account
    },
    });

    /**
     * Create new order
     */
    router.post(
  '/create',
  auth,
  [
    body('shippingAddress.name').notEmpty().withMessage('Name is required'),
    body('shippingAddress.email').isEmail().withMessage('Valid email is required'),
    body('shippingAddress.contactNumber').notEmpty().withMessage('Contact number is required'),
    body('shippingAddress.address').notEmpty().withMessage('Address is required'),
    body('shippingAddress.city').notEmpty().withMessage('City is required'),
    body('shippingAddress.district').notEmpty().withMessage('District is required'),
    body('shippingAddress.state').notEmpty().withMessage('State is required'),
    body('shippingAddress.pincode').notEmpty().withMessage('Pincode is required'),
    body('shippingAddress.postOffice').notEmpty().withMessage('Post office is required'), // Add this line
  ],
    async (req, res) => {
        try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
            });
        }

        const { items, totalAmount, shippingAddress, paymentMethod, notes } = req.body;

        const order = new Order({
            userId: req.user.userId,
            orderNumber: `ORD-${Date.now()}`,
            items,
            totalAmount,
            shippingAddress,
            paymentMethod,
            notes,
        });

        await order.save();
        await order.populate('userId', 'name email');

        // ---------------------------------------------
        // 1. Email to the Business Owner (You)
        // ---------------------------------------------
        const adminEmailContent = `
            <h1>🚀 New Order Placed!</h1>
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Total Amount:</strong> ₹${totalAmount}</p>
            <h2>Customer Details:</h2>
            <ul>
            <li><strong>Name:</strong> ${shippingAddress.name}</li>
            <li><strong>Email:</strong> ${shippingAddress.email}</li>
            <li><strong>Phone:</strong> ${shippingAddress.contactNumber}</li>
            <li><strong>Address:</strong> ${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.district}, ${shippingAddress.state} - ${shippingAddress.pincode}</li>
            </ul>
            <h2>Order Items:</h2>
            <ul>
            ${items.map(item => `
                <li>
                <strong>${item.name}</strong> (${item.size}) - ${item.quantity} x ₹${item.price}
                </li>
            `).join('')}
            </ul>
            <p><strong>Payment Method:</strong> ${paymentMethod}</p>
            <p><strong>Notes:</strong> ${notes || 'N/A'}</p>
        `;

        const adminMailOptions = {
            from: 'your_email@gmail.com',
            to: 'leeaj653@gmail.com', // Your business email to receive notifications
            subject: `New Order Received - #${order.orderNumber}`,
            html: adminEmailContent,
        };

        transporter.sendMail(adminMailOptions, (error, info) => {
            if (error) {
            console.error('Error sending admin email:', error);
            } else {
            console.log('Admin email sent:', info.response);
            }
        });
        
        // ---------------------------------------------
        // 2. Email to the Customer
        // ---------------------------------------------
        const customerEmailContent = `
            <h1>🎉 Thank You for Your Order!</h1>
            <p>Hi ${shippingAddress.name},</p>
            <p>Thank you for your purchase from our store. Your order #${order.orderNumber} has been successfully placed and will be processed shortly.</p>
            <h2>Order Details:</h2>
            <ul>
            ${items.map(item => `
                <li>
                <strong>${item.name}</strong> (${item.size}) - ${item.quantity} x ₹${item.price}
                </li>
            `).join('')}
            </ul>
            <h3>Total Amount: ₹${totalAmount}</h3>
            <p>We'll notify you once your order has been shipped. In the meantime, if you have any questions, feel free to contact us.</p>
            <p>Best regards,</p>
            <p>Your Store Team</p>
        `;

        const customerMailOptions = {
            from: 'your_email@gmail.com',
            to: shippingAddress.email, // The customer's email from the request body
            subject: `Order Confirmation - #${order.orderNumber}`,
            html: customerEmailContent,
        };

        transporter.sendMail(customerMailOptions, (error, info) => {
            if (error) {
            console.error('Error sending customer email:', error);
            } else {
            console.log('Customer email sent:', info.response);
            }
        });

        // The rest of your original response remains the same
        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: {
            order: {
                id: order._id,
                orderNumber: order.orderNumber,
                items: order.items,
                totalAmount: order.totalAmount,
                shippingAddress: order.shippingAddress,
                paymentMethod: order.paymentMethod,
                paymentStatus: order.paymentStatus,
                orderStatus: order.orderStatus,
                createdAt: order.createdAt,
            },
            },
        });
        } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({ success: false, message: 'Failed to create order. Please try again.' });
        }
    }
    );

    /**
     * Get my orders (user only)
     */
    router.get('/my-orders', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = { 'shippingAddress.email': req.user.email };

        const orders = await Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-userId');

        const totalOrders = await Order.countDocuments(filter);

        res.json({
        success: true,
        data: {
            orders,
            pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit),
            totalOrders,
            hasNext: page < Math.ceil(totalOrders / limit),
            hasPrev: page > 1,
            },
        },
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch orders' });
    }
    });

    /**
     * Delete order by ID (admin only)
     */
    router.delete('/:id', auth, async (req, res) => {
    try {
        if (req.user.email !== "123@gmail.com") {
        return res.status(403).json({ success: false, message: 'Forbidden: Admin only' });
        }

        const orderId = req.params.id;
        const order = await Order.findByIdAndDelete(orderId);

        if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.json({ success: true, message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Delete order error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete order' });
    }
    });

    /**
     * Update order status (admin only)
     *//**
    * Update order status (admin only)
    */
    router.patch(
    '/:orderId/status',
    auth,
    [
        body('orderStatus')
        .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
        .withMessage('Invalid order status'),
        body('trackingNumber').optional().isString(),
    ],
    async (req, res) => {
        try {
        if (req.user.email !== "123@gmail.com") {
            return res.status(403).json({ success: false, message: 'Forbidden: Admin only' });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { orderStatus, trackingNumber } = req.body;
        const order = await Order.findById(req.params.orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.orderStatus = orderStatus;
        if (trackingNumber) {
            order.trackingNumber = trackingNumber;
        }

        await order.save();

        // New code block to send an email to the customer
        const customerEmailContent = `
            <h1>📦 Your Order Status Has Been Updated!</h1>
            <p>Dear ${order.shippingAddress.name},</p>
            <p>We're writing to let you know that the status of your order #${order.orderNumber} has been changed to: <strong>${orderStatus}</strong>.</p>
            <p>You can view your order details and its current status by logging into your account.</p>
            ${trackingNumber ? `
            <p>Your tracking number is: <strong>${trackingNumber}</strong></p>
            <p>You can track your package here: <a href="YOUR_TRACKING_URL_HERE">Track Your Order</a></p>
            ` : ''}
            <p>Thank you for your patience!</p>
            <p>Best regards,</p>
            <p>The Jersey Store Team</p>
        `;

        const customerMailOptions = {
            from: 'chennaiyinjersey@gmail.com', // Your business email
            to: order.shippingAddress.email, // The customer's email
            subject: `Update on your Order #${order.orderNumber} - Status: ${orderStatus}`,
            html: customerEmailContent,
        };

        transporter.sendMail(customerMailOptions, (error, info) => {
            if (error) {
            console.error('Error sending order status email:', error);
            } else {
            console.log('Order status email sent:', info.response);
            }
        });

        res.json({
            success: true,
            message: 'Order status updated and email sent successfully',
            data: {
            order: {
                id: order._id,
                orderNumber: order.orderNumber,
                orderStatus: order.orderStatus,
                trackingNumber: order.trackingNumber,
            },
            },
        });
        } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ success: false, message: 'Failed to update order status' });
        }
    }
    );

    /**
     * Get all orders (admin only)
     */
    router.get('/all-orders', auth, async (req, res) => {
    try {
        if (req.user.email !== "123@gmail.com") {
        return res.status(403).json({ success: false, message: 'Forbidden: Admin only' });
        }

        const orders = await Order.find()
        .populate('userId', 'name email phone')
        .sort({ createdAt: -1 })
        .lean();

        res.json({ success: true, data: { orders } });
    } catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch all orders' });
    }
    });

    /**
     * Get specific order (user only)
     */
    router.get('/:orderId', auth, async (req, res) => {
    try {
        const order = await Order.findOne({
        _id: req.params.orderId,
        'shippingAddress.email': req.user.email,
        }).select('-userId');

        if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.json({ success: true, data: { order } });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch order' });
    }
    });

    module.exports = router;