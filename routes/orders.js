const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const auth = require('../middleware/auth');

const router = express.Router();

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

      res.json({
        success: true,
        message: 'Order status updated successfully',
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
