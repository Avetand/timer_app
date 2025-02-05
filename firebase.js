import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCcwfyaEbkWZtCBNHWoIRWRMR2sO2LcPL0",
  authDomain: "cm-timer.firebaseapp.com",
  projectId: "cm-timer",
  storageBucket: "cm-timer.firebasestorage.app",
  messagingSenderId: "952200469936",
  appId: "1:952200469936:web:1432dd5f7643f3052a4a75",
  measurementId: "G-GJJZW4SS7C" // optional
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };