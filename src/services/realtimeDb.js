import { ref as dbRef, set, remove, onValue, off, push } from 'firebase/database'
import { rtdb } from '@/firebase/realtimeDb.js'

/**
 * Set or update a driver's location
 * @param {string} uid
 * @param {{ lat: number, lng: number, speed?: number, accuracy?: number, tripId?: string }} locationData
 */
export async function setDriverLocation(uid, locationData) {
  const ref = dbRef(rtdb, `driverLocations/${uid}`)
  await set(ref, {
    ...locationData,
    updatedAt: Date.now(),
  })
}

/**
 * Remove a driver's location from RTDB
 * @param {string} uid
 */
export async function removeDriverLocation(uid) {
  const ref = dbRef(rtdb, `driverLocations/${uid}`)
  await remove(ref)
}

/**
 * Subscribe to all driver locations
 * @param {function} callback - called with object { uid: locationData }
 * @returns {function} unsubscribe
 */
export function subscribeToDriverLocations(callback) {
  const ref = dbRef(rtdb, 'driverLocations')
  onValue(ref, (snapshot) => {
    callback(snapshot.val() || {})
  })
  return () => off(ref)
}

/**
 * Subscribe to a single driver's location
 * @param {string} uid
 * @param {function} callback
 * @returns {function} unsubscribe
 */
export function subscribeToDriverLocation(uid, callback) {
  const ref = dbRef(rtdb, `driverLocations/${uid}`)
  onValue(ref, (snapshot) => {
    callback(snapshot.val())
  })
  return () => off(ref)
}

/**
 * Send a chat message to a trip chat room
 * @param {string} tripId
 * @param {{ text: string, fromUid: string, fromName: string, role: string }} message
 */
export async function sendChatMessage(tripId, message) {
  const ref = dbRef(rtdb, `chat/${tripId}`)
  await push(ref, {
    ...message,
    at: Date.now(),
  })
}

/**
 * Subscribe to a chat room
 * @param {string} tripId
 * @param {function} callback - called with array of messages
 * @returns {function} unsubscribe
 */
export function subscribeToChatRoom(tripId, callback) {
  const ref = dbRef(rtdb, `chat/${tripId}`)
  onValue(ref, (snapshot) => {
    const data = snapshot.val()
    if (data) {
      const msgs = Object.entries(data)
        .map(([id, msg]) => ({ id, ...msg }))
        .sort((a, b) => a.at - b.at)
      callback(msgs)
    } else {
      callback([])
    }
  })
  return () => off(ref)
}
