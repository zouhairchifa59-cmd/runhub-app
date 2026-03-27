import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// 🔐 config ديالك
const firebaseConfig = {
  apiKey: "AIzaSyBnRkYkLxgAdhXVabEjG_YTt72OLz-Ab04",
  authDomain: "runhub-55f04.firebaseapp.com",
  projectId: "runhub-55f04",
  storageBucket: "runhub-55f04.firebasestorage.app",
  messagingSenderId: "498771923445",
  appId: "1:498771923445:web:4f6b40c3151095543a90bc",
};

// 🚀 initialize مرة وحدة فقط
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// ✅ services
export const auth = firebase.auth();
export const db = firebase.firestore();