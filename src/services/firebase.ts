import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your Firebase project configuration
// You can get this from the Firebase Console -> Project Settings -> General -> Your apps
const firebaseConfig = {
  apiKey: "AIzaSyCS-GN0mRc_AGKTFJ02pt47yzwVA0pUHzY",
  authDomain: "conteggi-34365.firebaseapp.com",
  projectId: "conteggi-34365",
  storageBucket: "conteggi-34365.firebasestorage.app",
  messagingSenderId: "296625747566",
  appId: "1:296625747566:web:010c1c646992547487587f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
