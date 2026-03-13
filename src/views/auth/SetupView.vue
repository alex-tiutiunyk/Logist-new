<script setup>
import { ref } from 'vue'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import {
  doc, setDoc, getDoc, addDoc, collection, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { auth } from '@/firebase/auth.js'
import { db } from '@/firebase/firestore.js'

const log = ref([])
const dataLog = ref([])
const driversLog = ref([])
const isRunning = ref(false)
const isDataRunning = ref(false)
const isDriversRunning = ref(false)
const isDone = ref(false)
const isDataDone = ref(false)
const isDriversDone = ref(false)

const DEMO_DRIVERS = [
  { email: 'driver2@test.com', password: 'password123', name: 'Олексій Шевченко', phone: '+380671234568', weightEmpty: 7200, maxLoadWeight: 22000, lengthCm: 1360, widthCm: 245, heightCm: 280, driveType: '6x4', clearanceMm: 220, containerTypes: ['20ft', '40ft'] },
  { email: 'driver3@test.com', password: 'password123', name: 'Василь Кравченко', phone: '+380671234569', weightEmpty: 8100, maxLoadWeight: 24000, lengthCm: 1380, widthCm: 248, heightCm: 290, driveType: '6x2', clearanceMm: 200, containerTypes: ['40ft', '40ft_hc'] },
  { email: 'driver4@test.com', password: 'password123', name: 'Сергій Мельник',   phone: '+380671234570', weightEmpty: 6800, maxLoadWeight: 20000, lengthCm: 1200, widthCm: 240, heightCm: 270, driveType: '4x2', clearanceMm: 180, containerTypes: ['20ft'] },
  { email: 'driver5@test.com', password: 'password123', name: 'Андрій Ткаченко',  phone: '+380671234571', weightEmpty: 9000, maxLoadWeight: 26000, lengthCm: 1400, widthCm: 250, heightCm: 295, driveType: '8x4', clearanceMm: 240, containerTypes: ['40ft', '40ft_hc', '45ft'] },
  { email: 'driver6@test.com', password: 'password123', name: 'Дмитро Іваненко',  phone: '+380671234572', weightEmpty: 7500, maxLoadWeight: 21000, lengthCm: 1340, widthCm: 243, heightCm: 278, driveType: '6x4', clearanceMm: 210, containerTypes: ['20ft', '40ft'] },
  { email: 'driver7@test.com', password: 'password123', name: 'Микола Лисенко',   phone: '+380671234573', weightEmpty: 7800, maxLoadWeight: 23000, lengthCm: 1360, widthCm: 245, heightCm: 282, driveType: '6x2', clearanceMm: 195, containerTypes: ['40ft_hc', '45ft'] },
  { email: 'driver8@test.com', password: 'password123', name: 'Роман Гончаренко', phone: '+380671234574', weightEmpty: 8500, maxLoadWeight: 25000, lengthCm: 1390, widthCm: 249, heightCm: 292, driveType: '6x4', clearanceMm: 230, containerTypes: ['20ft', '40ft', '40ft_hc'] },
  { email: 'driver9@test.com', password: 'password123', name: 'Павло Семенченко', phone: '+380671234575', weightEmpty: 7100, maxLoadWeight: 19000, lengthCm: 1180, widthCm: 238, heightCm: 265, driveType: '4x4', clearanceMm: 260, containerTypes: ['20ft'] },
  { email: 'driver10@test.com', password: 'password123', name: 'Ігор Марченко',   phone: '+380671234576', weightEmpty: 7600, maxLoadWeight: 22500, lengthCm: 1350, widthCm: 244, heightCm: 280, driveType: '6x2', clearanceMm: 205, containerTypes: ['40ft', '45ft'] },
  { email: 'driver11@test.com', password: 'password123', name: 'Артем Власенко',  phone: '+380671234577', weightEmpty: 8200, maxLoadWeight: 24500, lengthCm: 1375, widthCm: 247, heightCm: 288, driveType: '6x4', clearanceMm: 215, containerTypes: ['20ft', '40ft', '40ft_hc', '45ft'] },
]

async function runDemoDrivers() {
  isDriversRunning.value = true
  driversLog.value = []
  for (const d of DEMO_DRIVERS) {
    try {
      let uid
      try {
        const cred = await createUserWithEmailAndPassword(auth, d.email, d.password)
        uid = cred.user.uid
        driversLog.value.push({ ok: true, msg: `✓ Auth: ${d.email}` })
      } catch (e) {
        if (e.code === 'auth/email-already-in-use') {
          const cred = await signInWithEmailAndPassword(auth, d.email, d.password)
          uid = cred.user.uid
          driversLog.value.push({ ok: true, msg: `⚠ Вже існує: ${d.email}` })
        } else { throw e }
      }
      const userRef = doc(db, 'users', uid)
      const existing = await getDoc(userRef)
      if (!existing.exists()) {
        await setDoc(userRef, {
          name: d.name, displayName: d.name, role: 'driver', phone: d.phone,
          email: d.email, isActive: true,
          weightEmpty: d.weightEmpty, maxLoadWeight: d.maxLoadWeight,
          lengthCm: d.lengthCm, widthCm: d.widthCm, heightCm: d.heightCm,
          driveType: d.driveType, clearanceMm: d.clearanceMm, containerTypes: d.containerTypes,
          createdAt: serverTimestamp(),
        })
        driversLog.value.push({ ok: true, msg: `✓ Firestore: ${d.name}` })
      } else {
        driversLog.value.push({ ok: true, msg: `⚠ Вже є: ${d.name}` })
      }
    } catch (e) {
      driversLog.value.push({ ok: false, msg: `✗ ${d.email}: ${e.message}` })
    }
  }
  isDriversDone.value = true
  isDriversRunning.value = false
}

const TEST_USERS = [
  { email: 'driver@test.com',     password: 'password123', name: 'Іван Петренко',     role: 'driver',     phone: '+380671234567' },
  { email: 'dispatcher@test.com', password: 'password123', name: 'Олена Коваль',      role: 'dispatcher', phone: '+380672345678' },
  { email: 'logist@test.com',     password: 'password123', name: 'Микола Бондаренко', role: 'logist',     phone: '+380673456789' },
]

async function runSetup() {
  isRunning.value = true
  log.value = []

  for (const u of TEST_USERS) {
    try {
      let uid
      try {
        const cred = await createUserWithEmailAndPassword(auth, u.email, u.password)
        uid = cred.user.uid
        log.value.push({ ok: true, msg: `✓ Auth створено: ${u.email}` })
      } catch (e) {
        if (e.code === 'auth/email-already-in-use') {
          const cred = await signInWithEmailAndPassword(auth, u.email, u.password)
          uid = cred.user.uid
          log.value.push({ ok: true, msg: `⚠ Auth вже існує: ${u.email}` })
        } else {
          throw e
        }
      }

      const userRef = doc(db, 'users', uid)
      const existing = await getDoc(userRef)
      if (!existing.exists()) {
        await setDoc(userRef, {
          name: u.name, role: u.role, phone: u.phone,
          email: u.email, isActive: true, createdAt: serverTimestamp(),
        })
        log.value.push({ ok: true, msg: `✓ Firestore users/${u.role} створено` })
      } else {
        log.value.push({ ok: true, msg: `⚠ Firestore users/${u.role} вже є` })
      }
    } catch (e) {
      log.value.push({ ok: false, msg: `✗ ${u.email}: ${e.message}` })
    }
  }

  isDone.value = true
  isRunning.value = false
}

async function runSeedData() {
  isDataRunning.value = true
  dataLog.value = []

  try {
    // Get UIDs by signing in
    const uids = {}
    for (const u of TEST_USERS) {
      const cred = await signInWithEmailAndPassword(auth, u.email, u.password)
      uids[u.role] = cred.user.uid
    }
    dataLog.value.push({ ok: true, msg: `✓ UID отримано для всіх 3 ролей` })

    // Routes
    const route1Ref = await addDoc(collection(db, 'routes'), {
      name: 'Львів → Варшава',
      distanceKm: 370,
      createdBy: uids.logist,
      waypoints: [
        { name: 'Львів (термінал)', type: 'terminal', order: 1 },
        { name: 'КПП Краковець', type: 'customs', order: 2 },
        { name: 'Варшава (склад)', type: 'unloading', order: 3 },
      ],
    })
    const route2Ref = await addDoc(collection(db, 'routes'), {
      name: 'Київ → Одеса',
      distanceKm: 475,
      createdBy: uids.logist,
      waypoints: [
        { name: 'Київ (склад)', type: 'loading', order: 1 },
        { name: 'Одеса (порт)', type: 'terminal', order: 2 },
      ],
    })
    dataLog.value.push({ ok: true, msg: `✓ Маршрути створено (2)` })

    const now = Timestamp.now()
    const yesterday = Timestamp.fromDate(new Date(Date.now() - 86400000))
    const tomorrow  = Timestamp.fromDate(new Date(Date.now() + 86400000))
    const twoDaysLater = Timestamp.fromDate(new Date(Date.now() + 172800000))

    const trips = [
      {
        number: 'CT-2001',
        status: 'in_transit',
        isInternational: false,
        origin: 'Київ',
        destination: 'Одеса',
        driverUid: uids.driver,
        dispatcherUid: uids.dispatcher,
        logistUid: uids.logist,
        departedAt: yesterday,
        eta: tomorrow,
        availableStatuses: ['arrived_at_unloading', 'delayed', 'breakdown', 'accident', 'rest_stop'],
        containers: [
          { number: 'MSCU4421873', type: '40HC', sealNumber: 'UA-2024-001', weight: 18500, cargoDesc: 'Побутова техніка' },
          { number: 'MSCU4421874', type: '40HC', sealNumber: 'UA-2024-002', weight: 17200, cargoDesc: 'Електроніка' },
        ],
        waypoints: [
          { name: 'Київ (склад)', type: 'loading', order: 1, plannedAt: yesterday, arrivedAt: yesterday },
          { name: 'Одеса (порт)', type: 'terminal', order: 2, plannedAt: tomorrow, arrivedAt: null },
        ],
        statusLog: [
          { status: 'departed', by: uids.driver, location: { lat: 50.45, lng: 30.52 }, comment: 'Виїхав зі складу', at: yesterday },
          { status: 'in_transit', by: uids.driver, location: { lat: 49.23, lng: 31.15 }, comment: '', at: now },
        ],
      },
      {
        number: 'CT-2002',
        status: 'loading_started',
        isInternational: false,
        origin: 'Харків',
        destination: 'Дніпро',
        driverUid: uids.driver,
        dispatcherUid: uids.dispatcher,
        logistUid: uids.logist,
        departedAt: null,
        eta: tomorrow,
        availableStatuses: ['loading_completed', 'delayed', 'cargo_damaged'],
        containers: [
          { number: 'TCKU3456789', type: '20ST', sealNumber: null, weight: 12000, cargoDesc: 'Металопрокат' },
          { number: 'TCKU3456790', type: '20ST', sealNumber: null, weight: 11500, cargoDesc: 'Металопрокат (листовий)' },
        ],
        waypoints: [
          { name: 'Харків (завод)', type: 'loading', order: 1, plannedAt: now, arrivedAt: now },
          { name: 'Дніпро (склад)', type: 'unloading', order: 2, plannedAt: tomorrow, arrivedAt: null },
        ],
        statusLog: [
          { status: 'arrived_at_loading', by: uids.driver, location: { lat: 49.99, lng: 36.23 }, comment: '', at: now },
          { status: 'loading_started', by: uids.driver, location: { lat: 49.99, lng: 36.23 }, comment: '', at: now },
        ],
      },
      {
        number: 'CT-2003',
        status: 'customs_in_progress',
        isInternational: true,
        origin: 'Львів',
        destination: 'Варшава',
        driverUid: uids.driver,
        dispatcherUid: uids.dispatcher,
        logistUid: uids.logist,
        departedAt: yesterday,
        eta: twoDaysLater,
        availableStatuses: ['customs_completed', 'border_crossed', 'waiting_at_border', 'delayed'],
        containers: [
          { number: 'HLXU2987654', type: '40ST', sealNumber: 'EU-2024-047', weight: 22000, cargoDesc: 'Меблі' },
          { number: 'HLXU2987655', type: '40ST', sealNumber: 'EU-2024-048', weight: 20500, cargoDesc: 'Меблі (м\'які)' },
        ],
        waypoints: [
          { name: 'Львів (термінал)', type: 'terminal', order: 1, plannedAt: yesterday, arrivedAt: yesterday },
          { name: 'КПП Краковець', type: 'customs', order: 2, plannedAt: now, arrivedAt: now },
          { name: 'Варшава (склад)', type: 'unloading', order: 3, plannedAt: twoDaysLater, arrivedAt: null },
        ],
        statusLog: [
          { status: 'departed', by: uids.driver, location: { lat: 49.84, lng: 24.03 }, comment: '', at: yesterday },
          { status: 'arrived_at_border', by: uids.driver, location: { lat: 49.93, lng: 23.07 }, comment: '', at: now },
          { status: 'customs_in_progress', by: uids.driver, location: { lat: 49.93, lng: 23.07 }, comment: 'Черга ~3 год', at: now },
        ],
      },
      {
        number: 'CT-2004',
        status: 'trip_completed',
        isInternational: false,
        origin: 'Запоріжжя',
        destination: 'Миколаїв',
        driverUid: uids.driver,
        dispatcherUid: uids.dispatcher,
        logistUid: uids.logist,
        departedAt: yesterday,
        eta: yesterday,
        availableStatuses: [],
        containers: [
          { number: 'CMAU1234567', type: '40HC', sealNumber: 'UA-2024-022', weight: 19800, cargoDesc: 'Зернові культури' },
          { number: 'CMAU1234568', type: '40HC', sealNumber: 'UA-2024-023', weight: 21000, cargoDesc: 'Соняшникова олія (бочки)' },
        ],
        waypoints: [
          { name: 'Запоріжжя (елеватор)', type: 'loading', order: 1, plannedAt: yesterday, arrivedAt: yesterday },
          { name: 'Миколаїв (порт)', type: 'unloading', order: 2, plannedAt: yesterday, arrivedAt: yesterday },
        ],
        statusLog: [
          { status: 'departed', by: uids.driver, location: { lat: 47.84, lng: 35.14 }, comment: '', at: yesterday },
          { status: 'arrived_at_unloading', by: uids.driver, location: { lat: 46.97, lng: 32.0 }, comment: '', at: yesterday },
          { status: 'unloading_completed', by: uids.driver, location: { lat: 46.97, lng: 32.0 }, comment: '', at: yesterday },
          { status: 'trip_completed', by: uids.driver, location: { lat: 46.97, lng: 32.0 }, comment: '', at: yesterday },
        ],
      },
      {
        number: 'CT-2005',
        status: 'breakdown',
        isInternational: false,
        origin: 'Вінниця',
        destination: 'Львів',
        driverUid: uids.driver,
        dispatcherUid: uids.dispatcher,
        logistUid: uids.logist,
        departedAt: now,
        eta: tomorrow,
        availableStatuses: ['in_transit', 'delayed', 'accident'],
        containers: [
          { number: 'OOLU7654321', type: '20ST', sealNumber: 'UA-2024-088', weight: 9500, cargoDesc: 'Хімічна продукція' },
          { number: 'OOLU7654322', type: '20ST', sealNumber: 'UA-2024-089', weight: 8800, cargoDesc: 'Лакофарбові матеріали' },
        ],
        waypoints: [
          { name: 'Вінниця (склад)', type: 'loading', order: 1, plannedAt: now, arrivedAt: now },
          { name: 'Львів (термінал)', type: 'terminal', order: 2, plannedAt: tomorrow, arrivedAt: null },
        ],
        statusLog: [
          { status: 'departed', by: uids.driver, location: { lat: 49.23, lng: 28.47 }, comment: '', at: now },
          { status: 'breakdown', by: uids.driver, location: { lat: 49.55, lng: 26.90 }, comment: 'Пробите колесо, чекаю шиномонтаж', at: now },
        ],
      },
    ]

    for (const tripData of trips) {
      const { containers, waypoints, statusLog, ...tripFields } = tripData
      const tripRef = await addDoc(collection(db, 'trips'), {
        ...tripFields,
        createdAt: serverTimestamp(),
      })

      // Containers
      for (const c of containers) {
        await addDoc(collection(db, 'trips', tripRef.id, 'containers'), c)
      }

      // Waypoints
      for (const w of waypoints) {
        await addDoc(collection(db, 'trips', tripRef.id, 'waypoints'), w)
      }

      // Status log
      for (const s of statusLog) {
        await addDoc(collection(db, 'trips', tripRef.id, 'statusLog'), s)
      }

      // Documents (sample)
      const docs = tripData.isInternational
        ? ['cmr', 'customs_declaration', 'ekmt']
        : ['cmr', 'unloading_act']
      for (const type of docs) {
        await addDoc(collection(db, 'trips', tripRef.id, 'documents'), {
          type,
          status: type === 'cmr' ? 'uploaded' : 'pending',
          storageUrl: null,
          uploadedBy: uids.driver,
          uploadedAt: null,
        })
      }

      dataLog.value.push({ ok: true, msg: `✓ Рейс ${tripData.number} (${tripData.status})` })
    }

  } catch (e) {
    dataLog.value.push({ ok: false, msg: `✗ Помилка: ${e.message}` })
  }

  isDataDone.value = true
  isDataRunning.value = false
}
</script>

<template>
  <div class="min-h-screen bg-bg flex items-center justify-center p-4">
    <div class="bg-surface border border-border rounded-2xl p-8 w-full max-w-md shadow-sm space-y-8">

      <!-- Section 1: Users -->
      <div>
        <h1 class="text-lg font-bold text-gray-900 mb-1">1. Тестові користувачі</h1>
        <p class="text-xs text-muted mb-4">driver / dispatcher / logist · пароль: <code class="bg-bg px-1 rounded text-primary">password123</code></p>

        <button
          class="w-full py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          :disabled="isRunning || isDone"
          @click="runSetup"
        >
          {{ isRunning ? 'Створюємо...' : isDone ? '✓ Готово' : 'Створити користувачів' }}
        </button>

        <div v-if="log.length" class="mt-3 space-y-1">
          <div
            v-for="(entry, i) in log" :key="i"
            :class="['text-xs px-3 py-1.5 rounded', entry.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700']"
          >{{ entry.msg }}</div>
        </div>
      </div>

      <!-- Section 2: Test data -->
      <div>
        <h1 class="text-lg font-bold text-gray-900 mb-1">2. Тестові дані</h1>
        <p class="text-xs text-muted mb-4">5 рейсів, 10 контейнерів, 2 маршрути, статуси, документи</p>

        <button
          class="w-full py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
          :disabled="isDataRunning || isDataDone"
          @click="runSeedData"
        >
          {{ isDataRunning ? 'Заповнюємо...' : isDataDone ? '✓ Готово' : 'Створити тестові дані' }}
        </button>

        <div v-if="dataLog.length" class="mt-3 space-y-1">
          <div
            v-for="(entry, i) in dataLog" :key="i"
            :class="['text-xs px-3 py-1.5 rounded', entry.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700']"
          >{{ entry.msg }}</div>
        </div>
      </div>

      <!-- Section 3: Demo drivers -->
      <div>
        <h1 class="text-lg font-bold text-gray-900 mb-1">3. Демо водії</h1>
        <p class="text-xs text-muted mb-4">10 водіїв з характеристиками авто · пароль: <code class="bg-bg px-1 rounded text-primary">password123</code></p>

        <button
          class="w-full py-2.5 bg-gray-700 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          :disabled="isDriversRunning || isDriversDone"
          @click="runDemoDrivers"
        >
          {{ isDriversRunning ? 'Створюємо...' : isDriversDone ? '✓ Готово' : 'Створити демо водіїв' }}
        </button>

        <div v-if="driversLog.length" class="mt-3 space-y-1">
          <div
            v-for="(entry, i) in driversLog" :key="i"
            :class="['text-xs px-3 py-1.5 rounded', entry.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700']"
          >{{ entry.msg }}</div>
        </div>
      </div>

      <div v-if="isDone || isDataDone" class="text-center">
        <a href="/login" class="text-sm text-primary font-medium hover:underline">Перейти до входу →</a>
      </div>

    </div>
  </div>
</template>
