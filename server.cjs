const express = require('express');
const app = express();
app.use(express.json());
const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

// Simulated payment store (for demo)
const paidPlans = new Set();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Endpoint to simulate marking a plan as paid (for testing)
app.post('/api/mark-paid', (req, res) => {
  const { plan } = req.body;
  paidPlans.add(plan);
  res.json({ success: true });
});

// Create Razorpay order
app.post('/api/create-order', async (req, res) => {
  const { amount, currency = 'INR', receipt } = req.body;
  try {
    const order = await razorpay.orders.create({
      amount: amount * 100, // amount in paise
      currency,
      receipt,
      payment_capture: 1
    });
    res.json(order);
  } catch (err) {
    console.error('Razorpay order creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Verify Razorpay payment
app.post('/api/verify-payment', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  const generated_signature = crypto
    .createHmac('sha256', key_secret)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');
  if (generated_signature === razorpay_signature) {
    // Payment is verified, update DB, grant access, etc.
    res.json({ verified: true });
  } else {
    res.status(400).json({ verified: false, message: 'Payment verification failed' });
  }
});

app.listen(3001, () => console.log('Server running on port 3001'));
