const admin = require('firebase-admin');

// Path to your Firebase service account key
const serviceAccount = require('./washitek-49eef-firebase-adminsdk-fbsvc-4b31cb322c.json');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const updateUsersWithCreditField = async () => {
  console.log('Starting user update script...');

  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();

    if (snapshot.empty) {
      console.log('No users found.');
      return;
    }

    const batch = db.batch();
    let updateCount = 0;

    snapshot.docs.forEach(doc => {
      const userData = doc.data();
      // Check if \'creditUsed\' field is missing or is not a number
      if (typeof userData.creditUsed !== 'number') {
        const userRef = usersRef.doc(doc.id);
        batch.update(userRef, { creditUsed: 0 });
        updateCount++;
        console.log(`Adding/Updating creditUsed field for user: ${doc.id}`);
      }
    });

    if (updateCount === 0) {
      console.log('All users already have the creditUsed field.');
      return;
    }

    // Commit the batch
    await batch.commit();
    console.log(`Successfully updated ${updateCount} user documents.`);

  } catch (error) {
    console.error('Error updating users:', error);
  }
};

// Run the update function
updateUsersWithCreditField();
