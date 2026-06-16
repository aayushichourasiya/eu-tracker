import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAK65JZnAQ_AvCWtZ8pvMNQJhiIPYr9TYk",
  authDomain: "eu-switch-tracker.firebaseapp.com",
  projectId: "eu-switch-tracker",
  storageBucket: "eu-switch-tracker.firebasestorage.app",
  messagingSenderId: "234026751845",
  appId: "1:234026751845:web:62b4741073d423d1a4f38c",
  measurementId: "G-D8CGB3ME2G"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
