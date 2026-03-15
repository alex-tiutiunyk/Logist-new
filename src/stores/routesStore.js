import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '@/firebase/firestore.js'
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth.js'

export const useRoutesStore = defineStore('routes', () => {
  const savedRoutes = ref([])
  const routeLinks = ref([])

  // ─── Saved Routes ───────────────────────────────────────────────────────────

  async function fetchSavedRoutes() {
    const q = query(collection(db, 'routes'), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    savedRoutes.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    return savedRoutes.value
  }

  async function saveRoute(data) {
    // data: { title?, origin, destination, routeData }
    const authStore = useAuthStore()
    const docRef = await addDoc(collection(db, 'routes'), {
      title: data.title || null,
      origin: JSON.parse(JSON.stringify(data.origin)),
      destination: JSON.parse(JSON.stringify(data.destination)),
      routeData: data.routeData ? JSON.parse(JSON.stringify(data.routeData)) : null,
      createdAt: serverTimestamp(),
      createdBy: {
        uid: authStore.user?.uid || null,
        name: authStore.user?.displayName || authStore.user?.email || null,
      },
    })
    // Refresh list — don't let fetch failure mask a successful write
    try {
      await fetchSavedRoutes()
    } catch (e) {
      console.error('fetchSavedRoutes after save failed:', e)
    }
    return docRef.id
  }

  async function deleteRoute(id) {
    await deleteDoc(doc(db, 'routes', id))
    savedRoutes.value = savedRoutes.value.filter(r => r.id !== id)
  }

  async function fetchRouteById(id) {
    const snap = await getDoc(doc(db, 'routes', id))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() }
  }

  // ─── Route Links ────────────────────────────────────────────────────────────

  async function fetchRouteLinks() {
    const q = query(collection(db, 'routeLinks'), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    routeLinks.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    return routeLinks.value
  }

  async function createRouteLink(data) {
    // data: { forWhom, periodHours }
    const authStore = useAuthStore()
    const periodMap = {
      '1 година': 1,
      '1 день': 24,
      '1 тиждень': 168,
      '1 місяць': 720,
    }
    const hours = periodMap[data.periodHours] ?? 24
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + hours * 3600 * 1000))

    const docRef = await addDoc(collection(db, 'routeLinks'), {
      forWhom: data.forWhom,
      expiresAt,
      createdAt: serverTimestamp(),
      createdBy: {
        uid: authStore.user?.uid || null,
        name: authStore.user?.displayName || authStore.user?.email || null,
      },
    })
    await fetchRouteLinks()
    return docRef.id
  }

  async function deleteRouteLink(id) {
    await deleteDoc(doc(db, 'routeLinks', id))
    routeLinks.value = routeLinks.value.filter(l => l.id !== id)
  }

  // ─── Link Calculations (public subcollection) ────────────────────────────────

  async function fetchLinkCalculations(linkId) {
    const q = query(
      collection(db, 'routeLinks', linkId, 'calculations'),
      orderBy('calculatedAt', 'desc')
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  }

  async function fetchRouteLinkById(linkId) {
    const snap = await getDoc(doc(db, 'routeLinks', linkId))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() }
  }

  async function saveClientCalculation(linkId, data) {
    // no auth required
    await addDoc(collection(db, 'routeLinks', linkId, 'calculations'), {
      origin: data.origin,
      destination: data.destination,
      routeData: data.routeData,
      calculatedAt: serverTimestamp(),
    })
  }

  return {
    savedRoutes,
    routeLinks,
    fetchSavedRoutes,
    saveRoute,
    deleteRoute,
    fetchRouteById,
    fetchRouteLinks,
    createRouteLink,
    deleteRouteLink,
    fetchLinkCalculations,
    fetchRouteLinkById,
    saveClientCalculation,
  }
})
