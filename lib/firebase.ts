import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { getDatabase } from "firebase/database"

const firebaseConfig = {
  apiKey: "AIzaSyDzebO0_UEGXgT7AdCPNDv1O48IwXkjB7w",
  authDomain: "tetrio-da951.firebaseapp.com",
  databaseURL: "https://tetrio-da951-default-rtdb.firebaseio.com",
  projectId: "tetrio-da951",
  storageBucket: "tetrio-da951.firebasestorage.app",
  messagingSenderId: "990534519325",
  appId: "1:990534519325:web:38f40b07abc90c09c714f4",
  measurementId: "G-GZKN0S2J09",
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)
const realtimeDb = getDatabase(app)

if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === "failed-precondition") {
      console.warn("[v0] Firestore persistence failed: Multiple tabs open")
    } else if (err.code === "unimplemented") {
      console.warn("[v0] Firestore persistence not available in this browser")
    }
  })
}

export { app, auth, db, storage, realtimeDb }
