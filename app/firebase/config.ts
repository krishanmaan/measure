import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCdrU2pRVYKZynugwM6XEmpSsOGoA9s4gU",
  authDomain: "realestate-6fc31.firebaseapp.com",
  databaseURL: "https://realestate-6fc31-default-rtdb.firebaseio.com",
  projectId: "realestate-6fc31",
  storageBucket: "realestate-6fc31.firebasestorage.app",
  messagingSenderId: "1028103624896",
  appId: "1:1028103624896:web:7c92fda4d2c33def51f525",
  measurementId: "G-RFTPNXMTNS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

export { auth, database }; 