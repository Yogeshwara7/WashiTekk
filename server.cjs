const express = require('express');
const app = express();
app.use(express.json());
const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

// Import the cors middleware
const cors = require('cors');

// Use cors middleware to enable CORS for all origins
app.use(cors());

// Import and Initialize Firebase Admin SDK
const admin = require('firebase-admin');
// You need to replace this with the actual path to your service account key file
const serviceAccount = require('./washitek-49eef-firebase-adminsdk-fbsvc-4b31cb322c.json'); // Updated filename

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore(); // Get a Firestore instance

// Import credit handler functions
const { restoreCreditAfterPayment } = require('./creditHandler.cjs'); // Assuming creditHandler.cjs is in the same directory

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
app.post('/api/verify-payment', async (req, res) => {
  console.log('[Backend] Received request body for /api/verify-payment:', req.body);
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId, userId, amount } = req.body;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  console.log('[Backend] Verifying with:');
  console.log('  Order ID:', razorpay_order_id);
  console.log('  Payment ID:', razorpay_payment_id);
  console.log('  Received Signature:', razorpay_signature);
  console.log('  Booking ID:', bookingId);
  console.log('  User ID:', userId);
  console.log('  Amount:', amount);
  console.log('  Using Key Secret (ensure this is correct):', key_secret ? '*****' + key_secret.slice(-4) : 'NOT SET');

  const generated_signature = crypto
    .createHmac('sha256', key_secret)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');

  console.log('  Generated Signature:', generated_signature);

  if (generated_signature === razorpay_signature) {
    console.log('[Backend] Payment signature verified.');

    try {
      // Update booking status in Firestore
      const bookingRef = db.collection('bookings').doc(bookingId);
      console.log(`[Backend] Attempting to update booking: ${bookingId}`);
      await bookingRef.update({
        status: 'paid',
        paymentConfirmed: true,
        paidAt: new Date().toISOString(),
        paymentMethod: 'online',
        txnId: razorpay_payment_id,
      });
      console.log(`[Backend] Successfully updated booking: ${bookingId}`);

      // Get booking details to extract plan information
      const bookingSnap = await bookingRef.get();
      const bookingData = bookingSnap.data();
      
      // Add payment record to user's payments array and update plan details
      const userRef = db.collection('users').doc(userId);
      console.log(`[Backend] Attempting to fetch user: ${userId}`);
      const userSnap = await userRef.get();
      
      if (!userSnap.exists) {
          console.error(`[Backend] User document not found for ID: ${userId}`);
          return res.status(404).json({ verified: true, success: false, message: 'Payment verified, but user document not found.' });
      }

      const userData = userSnap.data();
      const existingPayments = userData?.payments || [];

      const paymentRecord = {
        date: new Date().toLocaleString(),
        amount: amount,
        status: 'Success',
        method: 'online',
        bookingId: bookingId,
        txnId: razorpay_payment_id,
      };

      // Update user document with new plan details and payment record
      const updateData = {
        payments: [...existingPayments, paymentRecord],
      };

      // If this is a plan purchase, update the plan details
      if (bookingData?.planName) {
        updateData.planName = bookingData.planName;
        updateData.planPrice = bookingData.planPrice;
        updateData.planDuration = bookingData.planDuration;
        updateData.planStatus = 'Active';
        updateData.planStartDate = new Date().toISOString();
        // Calculate plan end date based on duration
        const endDate = new Date();
        if (bookingData.planDuration === '3 Months') {
          endDate.setMonth(endDate.getMonth() + 3);
        } else if (bookingData.planDuration === '1 Year') {
          endDate.setFullYear(endDate.getFullYear() + 1);
        }
        updateData.planEndDate = endDate.toISOString();
      }

      console.log(`[Backend] Attempting to update user ${userId} with new data:`, updateData);
      await userRef.update(updateData);
      console.log(`[Backend] Successfully updated user ${userId} data.`);

      // *** NEW: Restore user's credit if this was a credit booking being paid off ***
      if (bookingData?.paymentMethod === 'credit' && bookingData?.status === 'credit_pending') {
          console.log(`[Backend /verify-payment] Booking ${bookingId} was credit_pending. Restoring user credit.`);
          // Ensure you pass the correct amount that was originally due for the credit booking
          await restoreCreditAfterPayment(userId, bookingId);
      }

      console.log(`[Backend] Online payment processed successfully for booking ${bookingId}.`);
      res.json({ verified: true, success: true, message: 'Payment verified and processed successfully.' });

    } catch (error) {
      console.error('[Backend] Error processing online payment on backend:', error);
      res.status(500).json({ verified: true, success: false, message: 'Payment verified, but failed to update records.', error: error.message });
    }

  } else {
    console.warn('[Backend] Payment signature verification failed: Signature mismatch.');
    res.status(400).json({ verified: false, success: false, message: 'Payment verification failed: Signature mismatch' });
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
      if (payment.bookingId === bookingId && payment.status === 'Pending (Cash)' && payment.method === 'cash') {
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

    // Restore user's credit if this was a credit booking
    const bookingSnap = await bookingRef.get();
    const bookingData = bookingSnap.data();

    if (bookingData?.status === 'credit_pending' && bookingData?.paymentMethod === 'credit') {
        console.log(`[Backend] Booking ${bookingId} was credit_pending. Restoring user credit.`);
        await restoreCreditAfterPayment(userId, amountPaid);
    }

    await batch.commit();

    console.log(`[Backend] Successfully confirmed manual payment for booking ${bookingId} and updated user ${userId}.`);
    res.json({ success: true, message: 'Manual payment confirmed successfully.' });

  } catch (error) {
    console.error('[Backend] Error confirming manual payment:', error);
    res.status(500).json({ success: false, message: 'Failed to confirm manual payment on backend.', error: error.message });
  }
});

// New endpoint to deduct credit after a booking is made with credit
app.post('/api/deduct-credit', async (req, res) => {
    try {
        const { userId, bookingId, amount } = req.body;

        if (!userId || !bookingId || amount === undefined || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Missing required fields (userId, bookingId, amount) or amount is invalid.' });
        }

        const userRef = db.collection('users').doc(userId);
        const bookingRef = db.collection('bookings').doc(bookingId); // Reference the booking

        // Use a Firestore transaction to ensure atomicity
        await db.runTransaction(async (transaction) => {
            // Read both documents at the beginning of the transaction
            const userDoc = await transaction.get(userRef);
            const bookingSnap = await transaction.get(bookingRef);

            if (!userDoc.exists) {
                throw new Error('User document not found.');
            }

            const userData = userDoc.data();
            const currentCreditUsed = userData.creditUsed || 0;
            const hasActivePlan = userData.planStatus === 'Active'; // Assuming 'Active' means active plan
            const CREDIT_LIMIT = 500; // Define or import CREDIT_LIMIT on backend as well

            // In the wallet model, check if available credit balance is sufficient for the booking amount
            const availableCredit = CREDIT_LIMIT - currentCreditUsed;
            if (hasActivePlan || availableCredit < amount) { // Check only for active plan or insufficient available credit
                throw new Error('Insufficient credit or active plan.'); // More specific error message
            }

            // Deduct credit by increasing creditUsed amount
            const newCreditUsed = currentCreditUsed + amount;
            // Ensure the new creditUsed does not exceed the limit (should be covered by the previous check, but double check)
            if (newCreditUsed > CREDIT_LIMIT) {
                 throw new Error('Booking amount exceeds available credit.');
            }
            transaction.update(userRef, { creditUsed: newCreditUsed });

            // Update booking status to paid by credit
            // Assuming the booking was just created with status 'pending' before this call
            const currentBookingStatus = bookingSnap.data()?.status;
            if (bookingSnap.exists && (currentBookingStatus === 'pending' || currentBookingStatus === 'awaiting_payment' || currentBookingStatus === 'credit_pending')) {
                 transaction.update(bookingRef, {
                     status: 'credit_used_pending_refill', // New status for admin tracking
                     paymentMethod: 'credit',
                     amountDue: 0, // Amount due is 0 as it's paid by credit
                     creditAmountUsedInBooking: amount, // Store the amount of credit used for this booking
                     paidAt: new Date().toISOString(), // Set paid timestamp
                     paymentConfirmed: true, // Payment confirmed via credit
                 });
                 console.log(`[Backend /deduct-credit] Booking ${bookingId} status updated to 'credit_used_pending_refill' by credit.`);
            } else if (bookingSnap.exists) {
                 console.warn(`[Backend /deduct-credit] Booking ${bookingId} status is already ${bookingSnap.data().status}, expected 'pending'.`);
                 // Depending on desired behavior, you might throw an error or proceed.
                 // For now, we'll proceed with updating user credit but warn about booking status.
            } else {
                console.warn(`[Backend /deduct-credit] Booking ${bookingId} not found during transaction.`);
                // This indicates an issue as the booking should have been created just before this call.
                // Depending on desired behavior, you might throw an error.
            }

            console.log(`[Backend /deduct-credit] Successfully deducted ${amount} from credit balance for user ${userId}. New creditUsed: ${newCreditUsed}`);
        });

        res.json({ success: true, message: 'Credit deducted successfully. Booking paid by credit.' });

    } catch (error) {
        console.error('[Backend /deduct-credit] Error deducting credit:', error.message);
        // Provide specific error message if it's an insufficient credit error
        if (error.message.includes('Insufficient credit') || error.message.includes('active plan') || error.message.includes('exceeds available credit')) {
             res.status(400).json({ success: false, message: error.message }); // Send specific error to frontend
  } else {
             res.status(500).json({ success: false, message: 'Failed to deduct credit.', error: error.message });
        }
  }
});

// New endpoint for admin to update booking amount based on quantity
app.post('/api/admin/update-booking-amount', async (req, res) => {
    try {
        const { bookingId, quantityKg } = req.body;

        if (!bookingId || quantityKg === undefined || quantityKg < 0) {
            return res.status(400).json({ success: false, message: 'Missing required fields (bookingId, quantityKg) or quantityKg is invalid.' });
        }

        const bookingRef = db.collection('bookings').doc(bookingId);
        const bookingSnap = await bookingRef.get();

        if (!bookingSnap.exists) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        const bookingData = bookingSnap.data();

        // Calculate amount due
        const ratePerKg = 40; // Define your rate here
        const calculatedAmountDue = quantityKg * ratePerKg;

        // Update the booking document
        await bookingRef.update({
            usage: quantityKg, // Store the quantity
            amountDue: calculatedAmountDue, // Store the calculated amount
            status: 'awaiting_payment', // Update status to indicate it's ready for payment
            // You might want to add a timestamp for when admin finalized it
            adminFinalizedAt: new Date().toISOString(),
        });

        console.log(`[Backend /api/admin/update-booking-amount] Booking ${bookingId} updated with quantity ${quantityKg} kg and amount due ${calculatedAmountDue}.`);

        res.json({ success: true, message: 'Booking amount updated successfully.', amountDue: calculatedAmountDue });

    } catch (error) {
        console.error('[Backend /api/admin/update-booking-amount] Error updating booking amount:', error);
        res.status(500).json({ success: false, message: 'Failed to update booking amount.', error: error.message });
  }
});

// New endpoint to handle user refilling their credit
app.post('/api/refill-credit', async (req, res) => {
    try {
        const { userId, amount } = req.body;

        if (!userId || amount === undefined || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Missing required fields (userId, amount) or amount is invalid.' });
        }

        const userRef = db.collection('users').doc(userId);

        // Check if this is an online refill with Razorpay details
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const isOnlineRefill = razorpay_order_id && razorpay_payment_id && razorpay_signature;

        if (isOnlineRefill) {
            // Perform Razorpay signature verification for online refills
            const key_secret = process.env.RAZORPAY_KEY_SECRET;
            if (!key_secret) {
                console.error('[Backend /refill-credit] Razorpay key secret not configured.');
                return res.status(500).json({ success: false, message: 'Server configuration error.' });
            }

            const generated_signature = crypto
                .createHmac('sha256', key_secret)
                .update(razorpay_order_id + '|' + razorpay_payment_id)
                .digest('hex');

            if (generated_signature !== razorpay_signature) {
                console.warn('[Backend /refill-credit] Razorpay signature verification failed.');
                return res.status(400).json({ success: false, message: 'Payment verification failed.' });
            }
             console.log('[Backend /refill-credit] Razorpay signature verified successfully.');
        }

        // Use a transaction to ensure atomicity
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists) {
                throw new Error('User document not found.');
            }

            const userData = userDoc.data();
            const currentCreditUsed = userData.creditUsed || 0;

            // Only proceed if there is credit to refill (should match the amount sent)
            if (currentCreditUsed < amount) {
                console.warn(`[Backend /refill-credit] User ${userId} attempted to refill ${amount} but only has ${currentCreditUsed} credit used.`);
                // Depending on desired behavior, you might throw an error or adjust the refill amount
                // For this implementation, we expect amount to match currentCreditUsed
                 if (currentCreditUsed !== amount) {
                     throw new Error('Amount to refill does not match used credit.');
                 }
            }

            // Reset creditUsed to 0
            transaction.update(userRef, { creditUsed: 0 });

            // Add a payment record for the refill
            const existingPayments = userData.payments || [];
            const refillPaymentRecord = {
                date: new Date().toLocaleString(),
                amount: amount, // Amount paid to refill
                status: 'Success', // Assuming refill is always a successful payment action
                method: isOnlineRefill ? 'Credit Refill (Online)' : 'Credit Refill (Cash)', // Indicate method
                // No specific bookingId associated with the refill payment itself
            };

            // Add Razorpay details to the payment record if it was an online refill
            if (isOnlineRefill) {
                refillPaymentRecord.txnId = razorpay_payment_id;
                refillPaymentRecord.orderId = razorpay_order_id;
            }

            transaction.update(userRef, { payments: [...existingPayments, refillPaymentRecord] });

            console.log(`[Backend /refill-credit] Successfully refilled credit for user ${userId}. Amount refilled: ${amount}. creditUsed reset to 0.`);
        });

        // After successful refill, find the most recent booking with status 'credit_used_pending_refill' and mark it as completed
        console.log(`[Backend /refill-credit] Attempting to find and update booking for user ${userId} with status 'credit_used_pending_refill'.`);
        const pendingRefillBookingsQuery = db.collection('bookings')
          .where('userId', '==', userId)
          .where('status', '==', 'credit_used_pending_refill')
          .orderBy('createdAt', 'desc')
          .limit(1); // Get the most recent one

        const pendingRefillBookingsSnap = await pendingRefillBookingsQuery.get();

        if (!pendingRefillBookingsSnap.empty) {
            const latestBookingDoc = pendingRefillBookingsSnap.docs[0];
            const latestBookingRef = latestBookingDoc.ref;
            console.log(`[Backend /refill-credit] Found ${pendingRefillBookingsSnap.docs.length} booking(s). Updating booking ID: ${latestBookingDoc.id}`);
            
            await latestBookingRef.update({
                status: 'completed',
                // Optionally add a timestamp for when the refill completion updated the booking
                refillCompletedAt: new Date().toISOString(),
            });
            console.log(`[Backend /refill-credit] Updated booking ${latestBookingDoc.id} status to 'completed' after refill.`);
        } else {
            console.log(`[Backend /refill-credit] No booking with status 'credit_used_pending_refill' found for user ${userId} after refill.`);
        }

        res.json({ success: true, message: 'Credit refilled successfully.' });

    } catch (error) {
        console.error('[Backend /refill-credit] Error refilling credit:', error.message);
        res.status(500).json({ success: false, message: 'Failed to refill credit.', error: error.message });
  }
});

app.listen(3001, () => console.log('Server running on port 3001'));