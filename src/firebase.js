import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAJM9gAIIKxQwIABQGKgdXo1xAZ-JzfOPY",
  authDomain: "washitek-49eef.firebaseapp.com",
  projectId: "washitek-49eef",
  storageBucket: "washitek-49eef.appspot.com",
  messagingSenderId: "1082005005215",
  appId: "1:1082005005215:web:5be33a9e3d698524a9d3aa",
  measurementId: "G-1CRPY6Y3ED"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firestore and Auth
export const db = getFirestore(app);
export const auth = getAuth(app); 