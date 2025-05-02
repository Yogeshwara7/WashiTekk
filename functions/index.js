/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

admin.initializeApp();

// Use environment variables for security!
const gmailEmail = functions.config().gmail.email; // set via `firebase functions:config:set gmail.email="your@gmail.com"`
const gmailPassword = functions.config().gmail.password; // set via `firebase functions:config:set gmail.password="yourapppassword"`

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
});

const ADMIN_EMAIL = 'youradmin@gmail.com';

exports.sendPaymentConfirmation = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only send if a new payment was added
    if (
      after.payments &&
      (!before.payments || after.payments.length > before.payments.length)
    ) {
      const payment = after.payments[after.payments.length - 1];
      const email = after.email; // Make sure you store user email in Firestore

      const msg = {
        to: email,
        from: 'your_verified_sender@yourdomain.com', // Use a verified sender
        subject: 'Payment Confirmation',
        text: `Thank you for your payment of ₹${payment.amount} for ${payment.plan}.`,
        html: `<strong>Thank you for your payment of ₹${payment.amount} for ${payment.plan}.</strong>`,
      };

      await transporter.sendMail(msg);
    }
    return null;
  });

exports.notifyAdminOnFeedback = functions.firestore
  .document('contact_messages/{msgId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const { name, email, subject, category, priority, message, attachment, createdAt } = data;

    const mailOptions = {
      from: `"Washitek Support" <${gmailEmail}>`,
      to: ADMIN_EMAIL,
      subject: `New Feedback/Support: ${subject || '(No Subject)'}`,
      html: `
        <h2>New Feedback/Support Message</h2>
        <p><b>Name:</b> ${name || 'N/A'}</p>
        <p><b>Email:</b> ${email || 'N/A'}</p>
        <p><b>Category:</b> ${category || 'N/A'}</p>
        <p><b>Priority:</b> ${priority || 'N/A'}</p>
        <p><b>Message:</b><br/>${message || 'N/A'}</p>
        ${attachment ? `<p><b>Attachment:</b> <a href="${attachment}">View File</a></p>` : ''}
        <p><b>Submitted At:</b> ${createdAt ? new Date(createdAt._seconds * 1000).toLocaleString() : 'N/A'}</p>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Admin notified of new feedback/support message.');
    } catch (error) {
      console.error('Error sending admin notification email:', error);
    }
  });
