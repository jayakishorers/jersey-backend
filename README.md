# JerseyPro Backend API

Backend API for JerseyPro - Premium Football Jerseys application.

## Features

- User authentication (signup/signin)
- Email newsletter subscription
- Order management
- MongoDB integration
- JWT token authentication
- Input validation
- Email notifications

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
PORT=5000
```

3. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login

### Email
- `POST /api/email/subscribe` - Subscribe to newsletter
- `POST /api/email/unsubscribe` - Unsubscribe from newsletter

### Orders
- `POST /api/orders/create` - Create new order (requires auth)
- `GET /api/orders/my-orders` - Get user orders (requires auth)
- `GET /api/orders/:orderId` - Get specific order (requires auth)
- `PATCH /api/orders/:orderId/status` - Update order status (requires auth)

## Database Models

### User
- name, email, password, phone
- address information
- wishlist
- timestamps

### EmailSubscription
- email, isActive, source
- timestamps

### Order
- userId, orderNumber, items
- totalAmount, shippingAddress
- paymentMethod, paymentStatus, orderStatus
- trackingNumber, notes
- timestamps

## Frontend Integration

Update your frontend to make API calls to these endpoints. Example:

```javascript
// Newsletter subscription
const subscribeToNewsletter = async (email) => {
  const response = await fetch('http://localhost:5000/api/email/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  return response.json();
};

// User signup
const signUp = async (userData) => {
  const response = await fetch('http://localhost:5000/api/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  return response.json();
};
```