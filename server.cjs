const express = require('express');
const app = express();
app.use(express.json());
const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

// Import and Initialize Firebase Admin SDK
const admin = require('firebase-admin');
// You need to replace this with the actual path to your service account key file
const serviceAccount = require('./washitek-49eef-firebase-adminsdk-fbsvc-1e79ae5a3d.json'); // <-- UPDATE THIS PATH

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore(); // Get a Firestore instance

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
  console.log('[Backend] Received request body for /api/verify-payment:', req.body);
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body; // Also log bookingId and userId if present, but they aren't used for plan verification here
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  console.log('[Backend] Verifying with:');
  console.log('  Order ID:', razorpay_order_id);
  console.log('  Payment ID:', razorpay_payment_id);
  console.log('  Received Signature:', razorpay_signature);
  console.log('  Using Key Secret (ensure this is correct):', key_secret ? '*****' + key_secret.slice(-4) : 'NOT SET'); // Log last 4 chars to be safer

  const generated_signature = crypto
    .createHmac('sha256', key_secret)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');

  console.log('  Generated Signature:', generated_signature);

  if (generated_signature === razorpay_signature) {
    console.log('[Backend] Payment signature verified.');
    res.json({ verified: true });
  } else {
    console.warn('[Backend] Payment signature verification failed: Signature mismatch.');
    res.status(400).json({ verified: false, message: 'Payment verification failed: Signature mismatch' });
  }
});

// New endpoint to confirm manual payment from admin dashboard
app.post('/api/confirm-manual-payment', async (req, res) => {
  try {
    const { bookingId, userId, amountPaid } = req.body;

    if (!bookingId || !userId || amountPaid === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields (bookingId, userId, amountPaid).' });
    }

    const bookingRef = db.collection('bookings').doc(bookingId);
    const userRef = db.collection('users').doc(userId);

    // Use a batched write to ensure both updates happen atomically
    const batch = db.batch();

    // Update booking status
    batch.update(bookingRef, {
      status: 'paid', // Always set to paid on confirmation
      paymentConfirmed: true,
      paidAt: new Date().toISOString(),
      paymentMethod: 'cash', // Assume manual confirmation is for cash
    });

    // Add or update payment record in user's payments array
    const userSnap = await userRef.get();
    const userData = userSnap.data();
    const existingPayments = userData?.payments || [];

    const updatedPayments = existingPayments.map(payment => {
      if (payment.bookingId === bookingId && payment.status === 'Pending' && payment.method === 'cash') {
        return { ...payment, status: 'Success', date: new Date().toLocaleString() }; // Update status and date
      } else {
        return payment;
      }
    });
    
    // If no pending cash payment was found for this booking (shouldn't happen for cash_pending),
    // add a new one. This might be a fallback or for other manual payment scenarios.
    const pendingPaymentFound = updatedPayments.some(payment => payment.bookingId === bookingId && payment.status === 'Success');
    if (!pendingPaymentFound) {
        const newPaymentRecord = {
            date: new Date().toLocaleString(),
            amount: amountPaid,
            status: 'Success',
            bookingId: bookingId,
            paymentMethod: 'manual', // Use 'manual' for payments confirmed outside the cash_pending flow
        };
        updatedPayments.push(newPaymentRecord);
    }

    batch.update(userRef, { payments: updatedPayments });

    await batch.commit();

    console.log(`[Backend] Successfully confirmed manual payment for booking ${bookingId} and updated user ${userId}.`);
    res.json({ success: true, message: 'Manual payment confirmed successfully.' });

  } catch (error) {
    console.error('[Backend] Error confirming manual payment:', error);
    res.status(500).json({ success: false, message: 'Failed to confirm manual payment on backend.', error: error.message });
  }
});

app.listen(3001, () => console.log('Server running on port 3001'));
