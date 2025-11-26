import { initializeApp } from "firebase/app";
import {
    getAuth
} from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyA_7k_VHIjJ5c3CyQpSLv2x38HWC3hQkuU",
  authDomain: "ndcw-12f99.firebaseapp.com",
  databaseURL: "https://ndcw-12f99-default-rtdb.firebaseio.com",
  projectId: "ndcw-12f99",
  storageBucket: "ndcw-12f99.firebasestorage.app",
  messagingSenderId: "673329660984",
  appId: "1:673329660984:web:1e370094d56a26bf4c12cd",
  measurementId: "G-39EDWVD4K8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
