// src/lib/firebase.js
// Firebase Modular SDK v10
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuração com fallback seguro para não quebrar em caso de variáveis ausentes
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCQJVLJOowbRfHgyhZNSSI-MLxKBLuKTGs",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "sgm-dashboard.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "sgm-dashboard",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "sgm-dashboard.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "370238805573",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:370238805573:web:ec3eeb37094a51996df52c"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

