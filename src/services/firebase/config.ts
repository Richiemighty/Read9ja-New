import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getAnalytics } from "firebase/analytics";
import AsyncStorage from '@react-native-async-storage/async-storage';


const firebaseConfig = {
  apiKey: "AIzaSyAlpKG7P2aQF9b4Y8GVj0qUmWQ42qqZ8oI",
  authDomain: "ready9jamark.firebaseapp.com",
  projectId: "ready9jamark",
  storageBucket: "ready9jamark.firebasestorage.app",
  messagingSenderId: "1071140466108",
  appId: "1:1071140466108:web:07b903c705f0d3ceda8fb9",
  measurementId: "G-PFJ1Q4NZCB"
};
    
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
