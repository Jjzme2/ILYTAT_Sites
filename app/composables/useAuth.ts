import {
  useFirebaseAuth,
  useFirestore,
  Collections,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  type User,
} from '~/utils/firebase'
import { setDoc } from 'firebase/firestore'
import type { User as AppUser } from '~/types'

export const useAuth = () => {
  const auth = useFirebaseAuth()
  const db = useFirestore()

  const user = useState<User | null>('auth-user', () => null)
  const appUser = useState<AppUser | null>('app-user', () => null)
  const loading = useState<boolean>('auth-loading', () => true)

  const fetchAppUser = async (uid: string) => {
    const userDoc = await getDoc(doc(collection(db, Collections.USERS), uid))
    if (userDoc.exists()) {
      appUser.value = { uid, ...userDoc.data() } as AppUser
    }
  }

  // Initialize auth listener once
  if (import.meta.client) {
    onAuthStateChanged(auth, async (firebaseUser) => {
      user.value = firebaseUser
      if (firebaseUser) {
        await fetchAppUser(firebaseUser.uid)
      } else {
        appUser.value = null
      }
      loading.value = false
    })
  }

  const signIn = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    return cred.user
  }

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    const cred = await signInWithPopup(auth, provider)
    await ensureUserDoc(cred.user)
    return cred.user
  }

  const register = async (email: string, password: string, displayName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName })
    await ensureUserDoc(cred.user)
    return cred.user
  }

  const ensureUserDoc = async (firebaseUser: User) => {
    const userRef = doc(db, Collections.USERS, firebaseUser.uid)
    const existing = await getDoc(userRef)
    if (!existing.exists()) {
      await setDoc(userRef, {
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        createdAt: serverTimestamp(),
      })
    }
  }

  const logout = async () => {
    await signOut(auth)
    user.value = null
    appUser.value = null
    navigateTo('/')
  }

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email)
  }

  const isAdmin = computed(() => {
    const adminEmails = ['admin@ilytat.com']
    return user.value ? adminEmails.includes(user.value.email || '') : false
  })

  return {
    user: readonly(user),
    appUser: readonly(appUser),
    loading: readonly(loading),
    isAdmin,
    signIn,
    signInWithGoogle,
    register,
    logout,
    resetPassword,
  }
}
