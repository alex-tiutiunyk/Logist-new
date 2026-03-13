// Run with: node scripts/seed.js
// Populates Firestore emulator with sample data

import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  collection,
  addDoc,
  Timestamp,
} from 'firebase/firestore'
import {
  getAuth,
  connectAuthEmulator,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'demo-project.firebaseapp.com',
  projectId: 'demo-project',
  storageBucket: 'demo-project.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef',
  databaseURL: 'http://localhost:9000?ns=demo-project',
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

connectFirestoreEmulator(db, 'localhost', 8080)
connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })

const users = [
  {
    uid: 'driver1',
    role: 'driver',
    name: 'Іван Петренко',
    email: 'driver1@demo.com',
    phone: '+380501234567',
    displayName: 'Іван Петренко',
  },
  {
    uid: 'dispatcher1',
    role: 'dispatcher',
    name: 'Олена Коваль',
    email: 'dispatcher1@demo.com',
    displayName: 'Олена Коваль',
  },
  {
    uid: 'logist1',
    role: 'logist',
    name: 'Михайло Бондаренко',
    email: 'logist1@demo.com',
    displayName: 'Михайло Бондаренко',
  },
]

const routes = [
  {
    name: 'Київ — Одеса',
    origin: 'Київ',
    destination: 'Одеса',
    distance: 480,
    waypoints: [
      { id: '1', name: 'Умань', type: 'waypoint' },
    ],
  },
  {
    name: 'Одеса — Варшава',
    origin: 'Одеса',
    destination: 'Варшава',
    distance: 1350,
    waypoints: [
      { id: '1', name: 'Рівне', type: 'waypoint' },
      { id: '2', name: 'Ягодин (кордон)', type: 'waypoint' },
    ],
  },
]

const trips = [
  {
    number: 'TP-2024-001',
    driverUid: 'driver1',
    driverName: 'Іван Петренко',
    dispatcherUid: 'dispatcher1',
    isInternational: false,
    currentStatus: 'in_transit',
    eta: Timestamp.fromDate(new Date(Date.now() + 4 * 3600 * 1000)),
    waypoints: [
      { id: '1', name: 'Київ (склад)', type: 'loading', completed: true, arrivedAt: Timestamp.now(), departedAt: Timestamp.now(), lat: 50.45, lng: 30.52 },
      { id: '2', name: 'Одеса (порт)', type: 'unloading', completed: false, arrivedAt: null, departedAt: null, lat: 46.48, lng: 30.72 },
    ],
    containers: [
      { id: 'c1', number: 'ABCD1234567', type: '20ft', sealNumber: 'SL-001', weight: 18000, cargoDescription: 'Промислове обладнання', currentStatus: 'in_transit', terminalReturnDate: null },
    ],
    statusLog: [
      { status: 'driver_accepted', at: Timestamp.fromDate(new Date(Date.now() - 8 * 3600 * 1000)), byName: 'Іван Петренко', comment: '' },
      { status: 'en_route_to_loading', at: Timestamp.fromDate(new Date(Date.now() - 7 * 3600 * 1000)), byName: 'Іван Петренко', comment: '' },
      { status: 'arrived_at_loading', at: Timestamp.fromDate(new Date(Date.now() - 6 * 3600 * 1000)), byName: 'Іван Петренко', comment: '' },
      { status: 'loading_started', at: Timestamp.fromDate(new Date(Date.now() - 5 * 3600 * 1000)), byName: 'Іван Петренко', comment: '' },
      { status: 'loading_completed', at: Timestamp.fromDate(new Date(Date.now() - 4 * 3600 * 1000)), byName: 'Іван Петренко', comment: '' },
      { status: 'departed', at: Timestamp.fromDate(new Date(Date.now() - 3 * 3600 * 1000)), byName: 'Іван Петренко', comment: '' },
      { status: 'in_transit', at: Timestamp.fromDate(new Date(Date.now() - 2 * 3600 * 1000)), byName: 'Іван Петренко', comment: '' },
    ],
    availableStatuses: ['arrived_at_unloading', 'delayed', 'breakdown', 'accident', 'rest_stop'],
    createdAt: Timestamp.fromDate(new Date(Date.now() - 8 * 3600 * 1000)),
    updatedAt: Timestamp.fromDate(new Date(Date.now() - 2 * 3600 * 1000)),
  },
  {
    number: 'TP-2024-002',
    driverUid: 'driver1',
    driverName: 'Іван Петренко',
    dispatcherUid: 'dispatcher1',
    isInternational: true,
    currentStatus: 'customs_in_progress',
    eta: Timestamp.fromDate(new Date(Date.now() + 24 * 3600 * 1000)),
    waypoints: [
      { id: '1', name: 'Одеса (порт)', type: 'loading', completed: true, arrivedAt: Timestamp.now(), departedAt: Timestamp.now(), lat: 46.48, lng: 30.72 },
      { id: '2', name: 'Ягодин (кордон)', type: 'waypoint', completed: false, arrivedAt: null, departedAt: null, lat: 51.54, lng: 24.24 },
      { id: '3', name: 'Варшава', type: 'unloading', completed: false, arrivedAt: null, departedAt: null, lat: 52.23, lng: 21.01 },
    ],
    containers: [
      { id: 'c2', number: 'WXYZ9876543', type: '40ft', sealNumber: 'SL-002', weight: 24000, cargoDescription: 'Сільськогосподарська продукція', currentStatus: 'customs_in_progress', terminalReturnDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 3600 * 1000)) },
    ],
    statusLog: [
      { status: 'driver_accepted', at: Timestamp.fromDate(new Date(Date.now() - 48 * 3600 * 1000)), byName: 'Іван Петренко', comment: '' },
      { status: 'in_transit', at: Timestamp.fromDate(new Date(Date.now() - 24 * 3600 * 1000)), byName: 'Іван Петренко', comment: '' },
      { status: 'customs_arrived_at_border', at: Timestamp.fromDate(new Date(Date.now() - 12 * 3600 * 1000)), byName: 'Іван Петренко', comment: '' },
      { status: 'customs_in_progress', at: Timestamp.fromDate(new Date(Date.now() - 6 * 3600 * 1000)), byName: 'Іван Петренко', comment: 'Перевірка документів' },
    ],
    availableStatuses: ['customs_completed', 'customs_border_crossed', 'customs_waiting_at_border', 'delayed'],
    createdAt: Timestamp.fromDate(new Date(Date.now() - 48 * 3600 * 1000)),
    updatedAt: Timestamp.fromDate(new Date(Date.now() - 6 * 3600 * 1000)),
  },
  {
    number: 'TP-2024-003',
    driverUid: 'driver1',
    driverName: 'Іван Петренко',
    dispatcherUid: 'dispatcher1',
    isInternational: false,
    currentStatus: 'loading_started',
    eta: Timestamp.fromDate(new Date(Date.now() + 8 * 3600 * 1000)),
    waypoints: [
      { id: '1', name: 'Харків (завод)', type: 'loading', completed: false, arrivedAt: null, departedAt: null, lat: 49.99, lng: 36.23 },
      { id: '2', name: 'Дніпро (склад)', type: 'unloading', completed: false, arrivedAt: null, departedAt: null, lat: 48.46, lng: 34.99 },
    ],
    containers: [],
    statusLog: [
      { status: 'driver_accepted', at: Timestamp.fromDate(new Date(Date.now() - 2 * 3600 * 1000)), byName: 'Іван Петренко', comment: '' },
      { status: 'arrived_at_loading', at: Timestamp.fromDate(new Date(Date.now() - 1 * 3600 * 1000)), byName: 'Іван Петренко', comment: '' },
      { status: 'loading_started', at: Timestamp.fromDate(new Date(Date.now() - 30 * 60 * 1000)), byName: 'Іван Петренко', comment: '' },
    ],
    availableStatuses: ['loading_completed', 'delayed', 'breakdown'],
    createdAt: Timestamp.fromDate(new Date(Date.now() - 3 * 3600 * 1000)),
    updatedAt: Timestamp.fromDate(new Date(Date.now() - 30 * 60 * 1000)),
  },
  {
    number: 'TP-2024-004',
    driverUid: 'driver1',
    driverName: 'Іван Петренко',
    dispatcherUid: 'dispatcher1',
    isInternational: false,
    currentStatus: 'trip_completed',
    completedAt: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 3600 * 1000)),
    eta: Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 3600 * 1000)),
    waypoints: [
      { id: '1', name: 'Львів', type: 'loading', completed: true, arrivedAt: Timestamp.now(), departedAt: Timestamp.now(), lat: 49.84, lng: 24.02 },
      { id: '2', name: 'Київ', type: 'unloading', completed: true, arrivedAt: Timestamp.now(), departedAt: Timestamp.now(), lat: 50.45, lng: 30.52 },
    ],
    containers: [],
    statusLog: [
      { status: 'driver_accepted', at: Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 3600 * 1000)), byName: 'Іван Петренко', comment: '' },
      { status: 'trip_completed', at: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 3600 * 1000)), byName: 'Іван Петренко', comment: '' },
    ],
    availableStatuses: [],
    createdAt: Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 3600 * 1000)),
    updatedAt: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 3600 * 1000)),
  },
  {
    number: 'TP-2024-005',
    driverUid: 'driver1',
    driverName: 'Іван Петренко',
    dispatcherUid: 'dispatcher1',
    isInternational: false,
    currentStatus: 'breakdown',
    eta: null,
    waypoints: [
      { id: '1', name: 'Запоріжжя', type: 'loading', completed: true, arrivedAt: Timestamp.now(), departedAt: Timestamp.now(), lat: 47.83, lng: 35.14 },
      { id: '2', name: 'Миколаїв', type: 'unloading', completed: false, arrivedAt: null, departedAt: null, lat: 46.97, lng: 31.99 },
    ],
    containers: [],
    statusLog: [
      { status: 'driver_accepted', at: Timestamp.fromDate(new Date(Date.now() - 5 * 3600 * 1000)), byName: 'Іван Петренко', comment: '' },
      { status: 'in_transit', at: Timestamp.fromDate(new Date(Date.now() - 3 * 3600 * 1000)), byName: 'Іван Петренко', comment: '' },
      { status: 'breakdown', at: Timestamp.fromDate(new Date(Date.now() - 1 * 3600 * 1000)), byName: 'Іван Петренко', comment: 'Спустило колесо' },
    ],
    availableStatuses: ['in_transit', 'delayed'],
    createdAt: Timestamp.fromDate(new Date(Date.now() - 5 * 3600 * 1000)),
    updatedAt: Timestamp.fromDate(new Date(Date.now() - 1 * 3600 * 1000)),
  },
]

async function seed() {
  console.log('Заповнення бази даних тестовими даними...')

  // Users
  for (const user of users) {
    await setDoc(doc(db, 'users', user.uid), user)
    console.log(`Користувач створений: ${user.name} (${user.role})`)
  }

  // Routes
  for (const route of routes) {
    const ref = await addDoc(collection(db, 'routes'), {
      ...route,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
    console.log(`Маршрут створений: ${route.name} (${ref.id})`)
  }

  // Trips
  for (const trip of trips) {
    const ref = await addDoc(collection(db, 'trips'), trip)
    console.log(`Рейс створений: ${trip.number} — ${trip.currentStatus} (${ref.id})`)

    // Sample documents for first trip
    if (trip.number === 'TP-2024-001') {
      const docs = [
        { type: 'waybill', status: 'pending', url: null },
        { type: 'arrival_note', status: 'pending', url: null },
      ]
      for (const d of docs) {
        await addDoc(collection(db, 'trips', ref.id, 'documents'), {
          ...d,
          createdAt: Timestamp.now(),
        })
      }
      console.log(`  Документи додано для рейсу ${trip.number}`)
    }
  }

  console.log('\nГотово! База даних заповнена тестовими даними.')
  console.log('\nОбліковий запис для входу:')
  console.log('  Водій:      driver1@demo.com')
  console.log('  Диспетчер:  dispatcher1@demo.com')
  console.log('  Логіст:     logist1@demo.com')
  console.log('  (паролі потрібно встановити вручну в Auth emulator або через Admin SDK)')
}

seed().catch(console.error)
