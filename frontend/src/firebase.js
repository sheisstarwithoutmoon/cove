import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAvx3_Il6XEnCeMZUFHqvp3Evzi4CZGXM8",
  authDomain: "cove-d4758.firebaseapp.com",
  projectId: "cove-d4758",
  storageBucket: "cove-d4758.firebasestorage.app",
  messagingSenderId: "461904008792",
  appId: "1:461904008792:web:7d19b4b7e3be5133725c2d",
  measurementId: "G-4KPH0EFQKY",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();