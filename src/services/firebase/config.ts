import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getAnalytics } from "firebase/analytics";


const firebaseConfig = {
  apiKey: "AIzaSyBVp7R6tlD7hiYK9N0xdWHa-6smusvWWvg",
  authDomain: "ready9ja.firebaseapp.com",
  projectId: "ready9ja",
  storageBucket: "ready9ja.firebasestorage.app",
  messagingSenderId: "813554804571",
  appId: "1:813554804571:web:ee7d9067fc53ddc0eedc7e",
  measurementId: "G-J4Z45H19JN"
};
    
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
