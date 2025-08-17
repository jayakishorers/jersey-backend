  const express = require('express');
  const { body, validationResult } = require('express-validator');
  const Order = require('../models/Order');
  const User = require('../models/User');
  const auth = require('../middleware/auth');

  const router = express.Router();

  // Create new order
  router.post('/create', auth, [
    body('shippingAddress.name').notEmpty().withMessage('Name is required'),
  body('shippingAddress.email').isEmail().withMessage('Valid email is required'),
  body('shippingAddress.contactNumber').notEmpty().withMessage('Contact number is required'),
  body('shippingAddress.address').notEmpty().withMessage('Address is required'),
  body('shippingAddress.city').notEmpty().withMessage('City is required'),
  body('shippingAddress.district').notEmpty().withMessage('District is required'),
  body('shippingAddress.state').notEmpty().withMessage('State is required'),
  body('shippingAddress.pincode').notEmpty().withMessage('Pincode is required'),

  ], async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const {
        items,
        totalAmount,
        shippingAddress,
        paymentMethod,
        notes
      } = req.body;

      // Create new order
      const order = new Order({
    userId: req.user.userId,
    orderNumber: `ORD-${Date.now()}`, // ✅ Add this line
    items,
    totalAmount,
    shippingAddress,
    paymentMethod,
    notes
  });


      await order.save();

      // Populate user details for response
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
            createdAt: order.createdAt
          }
        }
      });

    } catch (error) {
      console.error('Order creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create order. Please try again.'
      });
    }
  });

  // Get user orders
  // Get user orders by matching email in shippingAddress
router.get('/my-orders', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // ✅ Match orders using the user's email stored in JWT
    const filter = { 'shippingAddress.email': req.user.email };

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-userId'); // optional: hide internal reference

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
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

  // Delete order by id (only owner can delete)
router.delete('/:orderId', auth, async (req, res) => {
  try {const order = await Order.findOne({ 
  _id: req.params.orderId, 
  'shippingAddress.email': req.user.email 
});

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    await order.remove();

    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete order' });
  }
});
// Get all orders (admin only)
router.get('/all-orders', auth, async (req, res) => {
  try {
    // Optional: restrict to superadmin only
    // if (req.user.email !== "123@gmail.com") {
    //   return res.status(403).json({ success: false, message: "Forbidden" });
    // }

    const orders = await Order.find()
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .lean(); // ✅ safer, prevents serialization issues

    res.json({ success: true, data: { orders } });
  } catch (error) {
    console.error("Get all orders error:", error); // ✅ check Render logs
    res.status(500).json({ success: false, message: "Failed to fetch all orders" });
  }
});


  // Get specific order
  router.get('/:orderId', auth, async (req, res) => {
    try {
      const order = await Order.findOne({
  _id: req.params.orderId,
  'shippingAddress.email': req.user.email
}).select('-userId');

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      res.json({
        success: true,
        data: { order }
      });

    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch order'
      });
    }
  });

  // Update order status (for admin use - simplified version)
  router.patch('/:orderId/status', auth, [
    body('orderStatus').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid order status'),
    body('trackingNumber').optional().isString()
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { orderStatus, trackingNumber } = req.body;

     const order = await Order.findOne({
  _id: req.params.orderId,
  'shippingAddress.email': req.user.email
});


      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
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
            trackingNumber: order.trackingNumber
          }
        }
      });

    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update order status'
      });
    }
  });

  module.exports = router;