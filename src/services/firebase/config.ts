import { Platform } from "react-native";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyAlpKG7P2aQF9b4Y8GVj0qUmWQ42qqZ8oI",
  authDomain: "ready9jamark.firebaseapp.com",
  projectId: "ready9jamark",
  storageBucket: "ready9jamark.firebasestorage.app",
  messagingSenderId: "1071140466108",
  appId: "1:1071140466108:web:07b903c705f0d3ceda8fb9",
  measurementId: "G-PFJ1Q4NZCB"
};

const app = initializeApp(firebaseConfig);

if (Platform.OS === 'web') {
  const { getAnalytics } = require("firebase/analytics");
  const analytics = getAnalytics(app);
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
