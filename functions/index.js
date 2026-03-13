const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https')
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore')
const { initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { getDatabase } = require('firebase-admin/database')

initializeApp()

const db = getFirestore()
const auth = getAuth()
const rtdb = getDatabase()

// --- Allowed status transitions ---
const STATUS_TRANSITIONS = {
  driver_accepted: ['en_route_to_loading'],
  en_route_to_loading: ['arrived_at_loading', 'delayed', 'breakdown'],
  arrived_at_loading: ['loading_started', 'delayed'],
  loading_started: ['loading_completed', 'delayed'],
  loading_completed: ['departed'],
  departed: ['in_transit', 'delayed', 'breakdown', 'accident'],
  in_transit: [
    'arrived_at_waypoint', 'arrived_at_unloading',
    'customs_arrived_at_border', 'delayed', 'breakdown', 'accident', 'rest_stop',
  ],
  arrived_at_waypoint: ['departed_waypoint', 'delayed'],
  departed_waypoint: ['in_transit', 'arrived_at_unloading'],
  customs_arrived_at_border: ['customs_in_progress', 'customs_waiting_at_border', 'delayed'],
  customs_waiting_at_border: ['customs_in_progress', 'delayed'],
  customs_in_progress: ['customs_completed', 'delayed'],
  customs_completed: ['customs_border_crossed'],
  customs_border_crossed: ['in_transit', 'arrived_at_unloading'],
  arrived_at_unloading: ['unloading_started', 'delayed'],
  unloading_started: ['unloading_completed', 'cargo_damaged'],
  unloading_completed: ['documents_signed'],
  documents_signed: ['en_route_to_terminal', 'trip_completed'],
  en_route_to_terminal: ['arrived_at_terminal', 'delayed', 'breakdown'],
  arrived_at_terminal: ['waiting_at_terminal', 'container_drop_off_started'],
  waiting_at_terminal: ['container_drop_off_started', 'terminal_rejected_return'],
  container_drop_off_started: ['container_returned'],
  container_returned: ['terminal_receipt_confirmed'],
  terminal_receipt_confirmed: ['trip_completed'],
  terminal_rejected_return: ['container_drop_off_started', 'waiting_at_terminal'],
  delayed: ['in_transit', 'en_route_to_loading', 'en_route_to_terminal'],
  breakdown: ['in_transit', 'delayed'],
  accident: ['in_transit', 'delayed'],
  rest_stop: ['in_transit'],
  cargo_damaged: ['unloading_completed'],
}

/**
 * 1. createDriver - onCall
 * Creates a Firebase Auth user with role=driver and a Firestore user doc.
 * Called via httpsCallable from the client.
 */
exports.createDriver = onCall({ cors: true }, async (request) => {
  const {
    email, password, name, phone,
    weightEmpty, maxLoadWeight,
    lengthCm, widthCm, heightCm,
    driveType, clearanceMm, containerTypes,
  } = request.data

  if (!email || !password || !name) {
    throw new HttpsError('invalid-argument', 'Email, password та name обов\'язкові')
  }

  try {
    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    })

    // Set custom claims
    await auth.setCustomUserClaims(userRecord.uid, { role: 'driver' })

    // Create Firestore document
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      name,
      displayName: name,
      phone: phone || null,
      role: 'driver',
      // Vehicle specs
      weightEmpty: weightEmpty || null,
      maxLoadWeight: maxLoadWeight || null,
      lengthCm: lengthCm || null,
      widthCm: widthCm || null,
      heightCm: heightCm || null,
      driveType: driveType || null,
      clearanceMm: clearanceMm || null,
      containerTypes: containerTypes || [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    console.log(`Driver ${name} (${email}) created with uid ${userRecord.uid}`)
    return { success: true, uid: userRecord.uid, message: `Водія ${name} успішно створено` }
  } catch (error) {
    console.error('createDriver error:', error)
    throw new HttpsError('internal', error.message)
  }
})

/**
 * 2. onTripCreated - Firestore onCreate trigger
 * Sets availableStatuses based on isInternational flag.
 */
exports.onTripCreated = onDocumentCreated('trips/{tripId}', async (event) => {
  const tripId = event.params.tripId
  const data = event.data.data()

  if (!data) return

  let availableStatuses = [
    'en_route_to_loading',
    'arrived_at_loading',
    'loading_started',
    'loading_completed',
    'departed',
    'in_transit',
  ]

  if (data.isInternational) {
    availableStatuses = [
      ...availableStatuses,
      'customs_arrived_at_border',
      'customs_waiting_at_border',
      'customs_in_progress',
      'customs_completed',
      'customs_border_crossed',
    ]
  }

  availableStatuses = [
    ...availableStatuses,
    'arrived_at_unloading',
    'unloading_started',
    'unloading_completed',
    'documents_signed',
    'en_route_to_terminal',
    'arrived_at_terminal',
    'waiting_at_terminal',
    'container_drop_off_started',
    'container_returned',
    'terminal_receipt_confirmed',
    'trip_completed',
    // Emergency
    'delayed',
    'breakdown',
    'cargo_damaged',
    'accident',
    'rest_stop',
    'terminal_rejected_return',
  ]

  await db.collection('trips').doc(tripId).update({
    availableStatuses,
    updatedAt: FieldValue.serverTimestamp(),
  })

  console.log(`Trip ${tripId} created, availableStatuses set (international: ${data.isInternational})`)
})

/**
 * 3. onStatusChanged - Firestore onUpdate trigger
 * Validates status transition and writes to statusLog subcollection.
 */
exports.onStatusChanged = onDocumentUpdated('trips/{tripId}', async (event) => {
  const tripId = event.params.tripId
  const before = event.data.before.data()
  const after = event.data.after.data()

  if (!before || !after) return

  const oldStatus = before.currentStatus
  const newStatus = after.currentStatus

  // No status change
  if (oldStatus === newStatus) return

  // Validate transition
  const allowed = STATUS_TRANSITIONS[oldStatus] || []
  if (!allowed.includes(newStatus)) {
    console.warn(`Invalid status transition ${oldStatus} → ${newStatus} for trip ${tripId}`)
    // Revert to previous status (optional strict enforcement)
    // await db.collection('trips').doc(tripId).update({ currentStatus: oldStatus })
    return
  }

  // Write to statusLog subcollection for archiving
  const lastLogEntry = after.statusLog?.[after.statusLog.length - 1]
  if (lastLogEntry) {
    await db.collection('trips').doc(tripId).collection('statusLog').add({
      ...lastLogEntry,
      recordedAt: FieldValue.serverTimestamp(),
    })
  }

  console.log(`Trip ${tripId}: status changed ${oldStatus} → ${newStatus}`)
})

/**
 * 4. onTripCompleted - Firestore onUpdate trigger
 * Archives chat messages when trip status = trip_completed.
 */
exports.onTripCompleted = onDocumentUpdated('trips/{tripId}', async (event) => {
  const tripId = event.params.tripId
  const before = event.data.before.data()
  const after = event.data.after.data()

  if (!before || !after) return

  const wasCompleted = before.currentStatus === 'trip_completed'
  const isNowCompleted = after.currentStatus === 'trip_completed'

  if (wasCompleted || !isNowCompleted) return

  console.log(`Trip ${tripId} completed. Archiving chat...`)

  try {
    // Read all chat messages from RTDB
    const chatRef = rtdb.ref(`chat/${tripId}`)
    const snapshot = await chatRef.get()

    if (snapshot.exists()) {
      const messages = []
      snapshot.forEach((child) => {
        messages.push({ id: child.key, ...child.val() })
      })

      // Archive to Firestore
      const archiveRef = db.collection('archivedChats').doc(tripId)
      await archiveRef.set({
        tripId,
        tripNumber: after.number,
        archivedAt: FieldValue.serverTimestamp(),
        messages,
        messageCount: messages.length,
      })

      // Optionally clear RTDB chat after archiving
      // await chatRef.remove()

      console.log(`Chat archived for trip ${tripId}: ${messages.length} messages`)
    }

    // Update trip completedAt
    await db.collection('trips').doc(tripId).update({
      completedAt: FieldValue.serverTimestamp(),
    })
  } catch (error) {
    console.error(`Error archiving chat for trip ${tripId}:`, error)
  }
})
