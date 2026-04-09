import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCfKzorL4O3cpPcmzsFDIBeefy_Ak17F30",
  authDomain: "my-comms-coach.firebaseapp.com",
  projectId: "my-comms-coach",
  storageBucket: "my-comms-coach.firebasestorage.app",
  messagingSenderId: "166125865385",
  appId: "1:166125865385:web:7393835fcf9897f6401cb8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
