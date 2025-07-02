// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Your web app's Firebase configuration
// Using environment variables for security
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
let app;
let database;

try {
  app = initializeApp(firebaseConfig);
  database = getDatabase(app);
  
  console.log('🔥 Firebase initialized successfully!');
  console.log('📊 Database URL:', firebaseConfig.databaseURL);
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  console.error('� Please check your Firebase configuration');
}

export { database };

// Export test function for debugging
export const testConnection = async () => {
  try {
    const { ref, set } = await import('firebase/database');
    const testRef = ref(database, 'test');
    await set(testRef, { timestamp: Date.now(), test: true });
    console.log('✅ Firebase connection test successful!');
    return true;
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    return false;
  }
};

// Firebase Security Rules (add these to your Firebase Console):
/*
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true,
        "messages": {
          "$messageId": {
            ".validate": "newData.hasChildren(['text', 'username', 'timestamp']) && newData.child('text').isString() && newData.child('username').isString() && newData.child('timestamp').isNumber()"
          }
        }
      }
    }
  }
}
*/
