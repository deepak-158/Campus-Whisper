// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Your web app's Firebase configuration
// Updated with new project: vit-chitchat-36032-2bcd8
const firebaseConfig = {
  apiKey: "AIzaSyAw6GBZSl4lGBWwP8Vs6wpIjbWKcnNQg-s",
  authDomain: "vit-chitchat-36032-2bcd8.firebaseapp.com",
  databaseURL: "https://vit-chitchat-36032-2bcd8-default-rtdb.firebaseio.com/",
  projectId: "vit-chitchat-36032-2bcd8",
  storageBucket: "vit-chitchat-36032-2bcd8.firebasestorage.app",
  messagingSenderId: "537094480399",
  appId: "1:537094480399:web:59b35ca43a228330ca797a",
  measurementId: "G-D2Z8KW7RP6"
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
