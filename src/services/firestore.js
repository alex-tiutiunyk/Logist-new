import {
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore'
import { db } from '@/firebase/firestore.js'

// ---- Trip helpers ----

export async function getTrip(id) {
  try {
    const snap = await getDoc(doc(db, 'trips', id))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
  } catch (e) {
    console.error('getTrip error:', e)
    return null
  }
}

export async function getTrips(filters = {}) {
  try {
    const constraints = []
    if (filters.status) constraints.push(where('currentStatus', '==', filters.status))
    if (filters.driverUid) constraints.push(where('driverUid', '==', filters.driverUid))
    if (filters.isInternational !== undefined) {
      constraints.push(where('isInternational', '==', filters.isInternational))
    }
    constraints.push(orderBy('createdAt', 'desc'))
    const q = query(collection(db, 'trips'), ...constraints)
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (e) {
    console.error('getTrips error:', e)
    return []
  }
}

export async function createTrip(data) {
  try {
    const ref = await addDoc(collection(db, 'trips'), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return { id: ref.id, success: true }
  } catch (e) {
    console.error('createTrip error:', e)
    return { success: false, error: e.message }
  }
}

export async function updateTrip(id, data) {
  try {
    await updateDoc(doc(db, 'trips', id), {
      ...data,
      updatedAt: serverTimestamp(),
    })
    return { success: true }
  } catch (e) {
    console.error('updateTrip error:', e)
    return { success: false, error: e.message }
  }
}

export async function addStatusLog(tripId, statusData) {
  try {
    await updateDoc(doc(db, 'trips', tripId), {
      statusLog: arrayUnion({ ...statusData, at: new Date() }),
      currentStatus: statusData.status,
      updatedAt: serverTimestamp(),
    })
    return { success: true }
  } catch (e) {
    console.error('addStatusLog error:', e)
    return { success: false, error: e.message }
  }
}

// ---- User helpers ----

export async function getUser(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
  } catch (e) {
    console.error('getUser error:', e)
    return null
  }
}

export async function updateUser(uid, data) {
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...data,
      updatedAt: serverTimestamp(),
    })
    return { success: true }
  } catch (e) {
    console.error('updateUser error:', e)
    return { success: false, error: e.message }
  }
}

// ---- Documents helpers ----

export async function addDocument(tripId, docData) {
  try {
    const ref = await addDoc(collection(db, 'trips', tripId, 'documents'), {
      ...docData,
      createdAt: serverTimestamp(),
    })
    return { id: ref.id, success: true }
  } catch (e) {
    console.error('addDocument error:', e)
    return { success: false, error: e.message }
  }
}

export async function getDocuments(tripId) {
  try {
    const snap = await getDocs(collection(db, 'trips', tripId, 'documents'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (e) {
    console.error('getDocuments error:', e)
    return []
  }
}
