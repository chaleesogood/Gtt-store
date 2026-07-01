import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfigJson from '../firebase-applet-config.json';

// Initialize Firebase using values from config JSON
const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore targeting the specific databaseId if provided
export const db = initializeFirestore(app, {}, firebaseConfigJson.firestoreDatabaseId || '(default)');
