// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCntoE-oKL0O-sAiD3lna8dE8bVlYUWgUU",
  authDomain: "game-13602.firebaseapp.com",
  projectId: "game-13602",
  storageBucket: "game-13602.firebasestorage.app",
  messagingSenderId: "381905446437",
  appId: "1:381905446437:web:8bef3fcd1f44055b7501cc",
  measurementId: "G-WMYGCM8E8B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;