import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ref as dbRef, set, remove, onValue, off } from 'firebase/database'
import { rtdb } from '@/firebase/realtimeDb.js'

export const useLocationStore = defineStore('location', () => {
  const driverLocations = ref({})
  const myLocation = ref(null)
  let watchId = null
  let locationsListener = null
  let locationsDbRef = null

  function startTrackingMyLocation(driverUid, tripId) {
    if (!navigator.geolocation) return

    watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const locationData = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          speed: position.coords.speed,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          tripId,
          updatedAt: Date.now(),
        }
        myLocation.value = locationData
        const locRef = dbRef(rtdb, `driverLocations/${driverUid}`)
        await set(locRef, locationData)
      },
      (error) => {
        console.error('Geolocation error:', error)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 10000,
      }
    )
  }

  async function stopTracking(driverUid) {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      watchId = null
    }
    if (driverUid) {
      const locRef = dbRef(rtdb, `driverLocations/${driverUid}`)
      await remove(locRef)
    }
    myLocation.value = null
  }

  function subscribeToAllLocations() {
    locationsDbRef = dbRef(rtdb, 'driverLocations')
    locationsListener = onValue(locationsDbRef, (snapshot) => {
      const data = snapshot.val()
      driverLocations.value = data || {}
    })
  }

  function unsubscribeFromLocations() {
    if (locationsDbRef && locationsListener) {
      off(locationsDbRef)
      locationsListener = null
      locationsDbRef = null
    }
  }

  return {
    driverLocations,
    myLocation,
    startTrackingMyLocation,
    stopTracking,
    subscribeToAllLocations,
    unsubscribeFromLocations,
  }
})
