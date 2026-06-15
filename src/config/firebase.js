import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, signInWithCredential, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, query, orderBy, onSnapshot, addDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAo9lvjI-2bxRQsSEilU2y7tnogogvualc",
  authDomain: "detox-timer.firebaseapp.com",
  projectId: "detox-timer",
  storageBucket: "detox-timer.firebasestorage.app",
  messagingSenderId: "218711791084",
  appId: "1:218711791084:web:28931170be653685319cc9"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const fbAuth = { signInWithPopup, signInWithCredential, onAuthStateChanged, signOut };
export const fbDb = { doc, setDoc, getDoc, collection, getDocs, deleteDoc, query, orderBy, onSnapshot, addDoc };