import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, set, update, remove } from 'firebase/database';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

export const saveChatResponse = (response: string, title: string) => {
    const db = getDatabase();
    const responsesRef = ref(db, 'responses');
    const newResponseRef = push(responsesRef);
    set(newResponseRef, {
        response: response,
        title: title,
        timestamp: new Date().toISOString()
    });
};

export const updateChatResponse = (id: string, newResponse: string, title: string) => {
    const db = getDatabase();
    const responseRef = ref(db, 'responses/' + id);
    set(responseRef, {
        response: newResponse,
        title: title,
        timestamp: new Date().toISOString()
    });
};

export const deleteChatResponse = (id: string) => {
    const db = getDatabase();
    const responseRef = ref(db, 'responses/' + id);
    remove(responseRef);
};