import { initializeApp, getApps } from 'firebase/app'
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  type QueryConstraint,
} from 'firebase/firestore'
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
  type User,
} from 'firebase/auth'
import { getStorage } from 'firebase/storage'

let app: ReturnType<typeof initializeApp> | null = null

export function useFirebaseApp() {
  if (getApps().length > 0) {
    return getApps()[0]!
  }

  const config = useRuntimeConfig()

  app = initializeApp({
    apiKey: config.public.firebaseApiKey,
    authDomain: config.public.firebaseAuthDomain,
    projectId: config.public.firebaseProjectId,
    storageBucket: config.public.firebaseStorageBucket,
    messagingSenderId: config.public.firebaseMessagingSenderId,
    appId: config.public.firebaseAppId,
  })

  return app
}

export function useFirestore() {
  return getFirestore(useFirebaseApp())
}

export function useFirebaseAuth() {
  return getAuth(useFirebaseApp())
}

export function useFirebaseStorage() {
  return getStorage(useFirebaseApp())
}

// Collection helpers
export const Collections = {
  ORDERS: 'orders',
  USERS: 'users',
  INQUIRIES: 'inquiries',
  TESTIMONIALS: 'testimonials',
  // ── Content you manage directly in Firestore ──────────────────────────
  PROJECTS: 'projects',       // Portfolio items (see server/api/projects.get.ts for schema)
  PROMOTIONS: 'promotions',   // Banner/promo messages (see server/api/promotion.get.ts for schema)
  TESTIMONIALS: 'testimonials', // Client quotes (see server/api/testimonials.get.ts for schema)
} as const

export {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
  type User,
  type QueryConstraint,
}
