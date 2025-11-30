import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
    apiKey: "AIzaSyD7-OBAW1wlKSj44zi7NLXnbdlIETQ7m5Y",
    authDomain: "multiaichat-d4dbe.firebaseapp.com",
    projectId: "multiaichat-d4dbe",
    storageBucket: "multiaichat-d4dbe.firebasestorage.app",
    messagingSenderId: "693357199798",
    appId: "1:693357199798:web:6e91ba12ac938825450117",
    measurementId: "G-576MRDCM01"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);