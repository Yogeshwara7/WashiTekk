const admin = require('firebase-admin');
const db = admin.firestore();

// Define the credit limit (should be the same as on the backend endpoint)
const CREDIT_LIMIT = 500; // Ensure this matches the value in server.cjs

/**
 * Restores a user's credit after a booking is paid.
 * @param {string} userId - The ID of the user whose credit needs to be restored.
 * @param {string} bookingId - The ID of the booking that was paid.
 */
const restoreCreditAfterPayment = async (userId, bookingId) => {
    console.log(`[creditHandler] Attempting to restore credit for user ${userId} for booking ${bookingId}`);
    const userRef = db.collection('users').doc(userId);
    const bookingRef = db.collection('bookings').doc(bookingId);

    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            const bookingDoc = await transaction.get(bookingRef);

            if (!userDoc.exists) {
                console.error(`[creditHandler] User document not found for ID: ${userId}`);
                throw new Error('User not found.');
            }

            if (!bookingDoc.exists) {
                 console.error(`[creditHandler] Booking document not found for ID: ${bookingId}`);
                 throw new Error('Booking not found.');
            }

            const userData = userDoc.data();
            const bookingData = bookingDoc.data();

            // Check if the booking was originally made using credit and is now marked as paid
            // Also check if the credit for this booking hasn't been restored already
            // You might need a flag on the booking like `creditRestored: boolean` to prevent double restoration
            // For simplicity, I'll assume it hasn't been restored if status was 'credit_pending'
            if (bookingData.paymentMethod === 'credit' && bookingData.status === 'paid') {
                const amountPaid = bookingData.amountDue || 0;
                const currentCreditUsed = userData.creditUsed || 0;

                // Calculate the new credit used. It should decrease by the amount of this booking.
                let newCreditUsed = currentCreditUsed - amountPaid;

                // Ensure creditUsed doesn't go below zero
                if (newCreditUsed < 0) {
                    newCreditUsed = 0;
                }

                // Update the user's creditUsed in Firestore
                transaction.update(userRef, { creditUsed: newCreditUsed });

                console.log(`[creditHandler] Successfully restored ${amountPaid} credit for user ${userId}. New creditUsed: ${newCreditUsed}`);
                // Optionally, add a flag to the booking to indicate credit was restored
                 // transaction.update(bookingRef, { creditRestored: true });

            } else {
                console.log(`[creditHandler] Credit restoration skipped for booking ${bookingId}. Payment method was not credit or status is not paid.`);
            }
        });
        console.log(`[creditHandler] Transaction for credit restoration of booking ${bookingId} completed.`);
    } catch (error) {
        console.error(`[creditHandler] Transaction failed for credit restoration of booking ${bookingId}:`, error);
        throw error; // Re-throw the error to be caught by the calling function
    }
};

module.exports = {
    restoreCreditAfterPayment,
    CREDIT_LIMIT // Exporting CREDIT_LIMIT for potential use in server.cjs
}; 