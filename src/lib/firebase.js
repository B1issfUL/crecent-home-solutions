import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let firebaseServices;

export function isFirebaseConfigured() {
  return Object.values(firebaseConfig).every((value) => Boolean(value));
}

export function getFirebaseServices() {
  if (!isFirebaseConfigured()) {
    return null;
  }

  if (!firebaseServices) {
    const app = initializeApp(firebaseConfig);
    firebaseServices = {
      app,
      auth: getAuth(app),
      db: getFirestore(app),
    };
  }

  return firebaseServices;
}
