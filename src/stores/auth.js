import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth } from '@/firebase/auth.js'
import { db } from '@/firebase/firestore.js'
import { ROLE_REDIRECTS } from '@/types/user.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const role = ref(null)
  const isLoading = ref(true)

  let resolveReady
  const isReady = new Promise((resolve) => {
    resolveReady = resolve
  })

  const isAuthenticated = computed(() => !!user.value)
  const isDriver = computed(() => role.value === 'driver')
  const isDispatcher = computed(() => role.value === 'dispatcher')
  const isLogist = computed(() => role.value === 'logist')
  const roleRedirect = computed(() => role.value ? ROLE_REDIRECTS[role.value] : '/login')

  async function fetchUserRole(uid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid))
      if (userDoc.exists()) {
        return userDoc.data().role || null
      }
    } catch (e) {
      console.error('Error fetching user role:', e)
    }
    return null
  }

  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      user.value = firebaseUser
      role.value = await fetchUserRole(firebaseUser.uid)
    } else {
      user.value = null
      role.value = null
    }
    isLoading.value = false
    resolveReady()
  })

  async function login(email, password) {
    isLoading.value = true
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      user.value = cred.user
      role.value = await fetchUserRole(cred.user.uid)
      return { success: true }
    } catch (e) {
      return { success: false, error: mapAuthError(e.code) }
    } finally {
      isLoading.value = false
    }
  }

  async function loginWithGoogle() {
    isLoading.value = true
    try {
      const provider = new GoogleAuthProvider()
      const cred = await signInWithPopup(auth, provider)
      user.value = cred.user
      role.value = await fetchUserRole(cred.user.uid)
      return { success: true }
    } catch (e) {
      return { success: false, error: mapAuthError(e.code) }
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    await signOut(auth)
    user.value = null
    role.value = null
  }

  function mapAuthError(code) {
    const errors = {
      'auth/user-not-found': 'Користувача не знайдено',
      'auth/wrong-password': 'Невірний пароль',
      'auth/invalid-email': 'Невірний формат email',
      'auth/too-many-requests': 'Забагато спроб. Спробуйте пізніше',
      'auth/network-request-failed': 'Помилка мережі',
      'auth/popup-closed-by-user': 'Вікно було закрито',
      'auth/invalid-credential': 'Невірні дані для входу',
    }
    return errors[code] || 'Помилка авторизації'
  }

  return {
    user,
    role,
    isLoading,
    isReady,
    isAuthenticated,
    isDriver,
    isDispatcher,
    isLogist,
    roleRedirect,
    login,
    loginWithGoogle,
    logout,
  }
})
