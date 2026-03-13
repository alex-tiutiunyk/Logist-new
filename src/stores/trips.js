import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/firestore.js'

export const useTripsStore = defineStore('trips', () => {
  const trips = ref([])
  const currentTrip = ref(null)
  const isLoading = ref(false)

  async function fetchTrips(filters = {}) {
    isLoading.value = true
    try {
      let q = collection(db, 'trips')
      const constraints = []

      if (filters.status) {
        constraints.push(where('currentStatus', '==', filters.status))
      }
      if (filters.driverUid) {
        constraints.push(where('driverUid', '==', filters.driverUid))
      }
      if (filters.isInternational !== undefined) {
        constraints.push(where('isInternational', '==', filters.isInternational))
      }

      constraints.push(orderBy('createdAt', 'desc'))

      if (constraints.length > 0) {
        q = query(q, ...constraints)
      }

      const snapshot = await getDocs(q)
      trips.value = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      return trips.value
    } catch (e) {
      console.error('Error fetching trips:', e)
      return []
    } finally {
      isLoading.value = false
    }
  }

  async function fetchTrip(id) {
    isLoading.value = true
    try {
      const docRef = doc(db, 'trips', id)
      const snapshot = await getDoc(docRef)
      if (snapshot.exists()) {
        currentTrip.value = { id: snapshot.id, ...snapshot.data() }
        return currentTrip.value
      }
      return null
    } catch (e) {
      console.error('Error fetching trip:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function createTrip(data) {
    isLoading.value = true
    try {
      const tripData = {
        ...data,
        currentStatus: 'driver_accepted',
        statusLog: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      const docRef = await addDoc(collection(db, 'trips'), tripData)
      return { id: docRef.id, success: true }
    } catch (e) {
      console.error('Error creating trip:', e)
      return { success: false, error: e.message }
    } finally {
      isLoading.value = false
    }
  }

  async function updateTripStatus(id, status, location = null, comment = '') {
    try {
      const tripRef = doc(db, 'trips', id)
      const logEntry = {
        status,
        at: Timestamp.now(),
        location,
        comment,
      }
      await updateDoc(tripRef, {
        currentStatus: status,
        updatedAt: serverTimestamp(),
        statusLog: arrayUnion(logEntry),
      })
      if (currentTrip.value?.id === id) {
        currentTrip.value.currentStatus = status
      }
      return { success: true }
    } catch (e) {
      console.error('Error updating trip status:', e)
      return { success: false, error: e.message }
    }
  }

  async function updateTrip(id, data) {
    try {
      const tripRef = doc(db, 'trips', id)
      await updateDoc(tripRef, {
        ...data,
        updatedAt: serverTimestamp(),
      })
      return { success: true }
    } catch (e) {
      console.error('Error updating trip:', e)
      return { success: false, error: e.message }
    }
  }

  async function deleteTrip(id) {
    try {
      await deleteDoc(doc(db, 'trips', id))
      trips.value = trips.value.filter(t => t.id !== id)
      if (currentTrip.value?.id === id) currentTrip.value = null
      return { success: true }
    } catch (e) {
      console.error('Error deleting trip:', e)
      return { success: false, error: e.message }
    }
  }

  function subscribeToTrip(id) {
    const tripRef = doc(db, 'trips', id)
    const unsubscribe = onSnapshot(tripRef, (snapshot) => {
      if (snapshot.exists()) {
        currentTrip.value = { id: snapshot.id, ...snapshot.data() }
        const idx = trips.value.findIndex(t => t.id === id)
        if (idx !== -1) {
          trips.value[idx] = currentTrip.value
        }
      }
    })
    return unsubscribe
  }

  return {
    trips,
    currentTrip,
    isLoading,
    fetchTrips,
    fetchTrip,
    createTrip,
    updateTrip,
    deleteTrip,
    updateTripStatus,
    subscribeToTrip,
  }
})
