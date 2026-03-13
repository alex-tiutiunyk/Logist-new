<script setup>
import { ref, computed, onMounted } from 'vue'
import { useLocationStore } from '@/stores/location.js'
import { useNotificationsStore } from '@/stores/notifications.js'
import { useAuthStore } from '@/stores/auth.js'
import { useEventsStore } from '@/stores/events.js'
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'
import { collection, getDocs, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/firestore.js'
import { EMERGENCY_STATUSES } from '@/types/status.js'

const locationStore = useLocationStore()
const notifStore = useNotificationsStore()
const authStore = useAuthStore()
const eventsStore = useEventsStore()

const drivers = ref([])
const trips = ref([])
const isLoading = ref(false)
const showCreateModal = ref(false)
const showEditModal = ref(false)
const isCreating = ref(false)
const isEditing = ref(false)
const editingDriver = ref(null)

const CONTAINER_TYPE_OPTIONS = [
  { value: '20ft', label: '20 футів (20ft)' },
  { value: '40ft', label: '40 футів (40ft)' },
  { value: '40ft_hc', label: '40 футів HC' },
  { value: '45ft', label: '45 футів (45ft)' },
]

const DRIVE_TYPE_OPTIONS = [
  { value: '4x2', label: '4×2' },
  { value: '4x4', label: '4×4 (повний привід)' },
  { value: '6x2', label: '6×2 (тандем)' },
  { value: '6x4', label: '6×4 (тандем повний)' },
  { value: '8x4', label: '8×4' },
]

function emptyDriver() {
  return {
    email: '',
    password: '',
    name: '',
    phone: '',
    weightEmpty: '',
    maxLoadWeight: '',
    lengthCm: '',
    widthCm: '',
    heightCm: '',
    driveType: '',
    clearanceMm: '',
    containerTypes: [],
  }
}

const newDriver = ref(emptyDriver())
const editForm = ref(emptyDriver())

onMounted(async () => {
  isLoading.value = true
  locationStore.subscribeToAllLocations()
  try {
    const [driverSnap, tripsSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'trips')),
    ])
    drivers.value = driverSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(u => u.role === 'driver')
    trips.value = tripsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (e) {
    console.error(e)
  }
  isLoading.value = false
})

function getDriverTrip(uid) {
  return trips.value.find(t => t.driverUid === uid && t.currentStatus !== 'trip_completed')
}

function getDriverStatus(uid) {
  const trip = getDriverTrip(uid)
  if (trip && EMERGENCY_STATUSES.includes(trip.currentStatus)) return 'sos'
  if (locationStore.driverLocations[uid]) return 'online'
  return 'offline'
}

function toggleContainerType(form, type) {
  const idx = form.containerTypes.indexOf(type)
  if (idx === -1) form.containerTypes.push(type)
  else form.containerTypes.splice(idx, 1)
}

function buildDriverPayload() {
  return {
    email: newDriver.value.email,
    password: newDriver.value.password,
    name: newDriver.value.name,
    phone: newDriver.value.phone || null,
    weightEmpty: newDriver.value.weightEmpty ? Number(newDriver.value.weightEmpty) : null,
    maxLoadWeight: newDriver.value.maxLoadWeight ? Number(newDriver.value.maxLoadWeight) : null,
    lengthCm: newDriver.value.lengthCm ? Number(newDriver.value.lengthCm) : null,
    widthCm: newDriver.value.widthCm ? Number(newDriver.value.widthCm) : null,
    heightCm: newDriver.value.heightCm ? Number(newDriver.value.heightCm) : null,
    driveType: newDriver.value.driveType || null,
    clearanceMm: newDriver.value.clearanceMm ? Number(newDriver.value.clearanceMm) : null,
    containerTypes: newDriver.value.containerTypes,
  }
}

const AUTH_ERROR_MESSAGES = {
  'EMAIL_EXISTS': 'Водій з таким email вже існує',
  'INVALID_EMAIL': 'Невірний формат email',
  'WEAK_PASSWORD': 'Пароль має бути не менше 6 символів',
  'TOO_MANY_ATTEMPTS_TRY_LATER': 'Забагато спроб. Спробуйте пізніше',
  'OPERATION_NOT_ALLOWED': 'Реєстрація заблокована. Зверніться до адміністратора',
}

function mapAuthError(rawCode = '') {
  for (const [key, msg] of Object.entries(AUTH_ERROR_MESSAGES)) {
    if (rawCode.startsWith(key)) return msg
  }
  return `Помилка: ${rawCode}`
}

async function createDriver() {
  if (!newDriver.value.email || !newDriver.value.password || !newDriver.value.name) {
    notifStore.error('Заповніть усі обов\'язкові поля')
    return
  }
  isCreating.value = true
  const payload = buildDriverPayload()
  try {
    // Create Auth user via REST API (doesn't sign out current user)
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: payload.email, password: payload.password, returnSecureToken: false }),
      }
    )
    const json = await resp.json()
    if (!resp.ok) {
      const rawCode = json.error?.message || 'UNKNOWN'
      throw new Error(mapAuthError(rawCode))
    }

    const uid = json.localId
    const { password, email, ...rest } = payload
    await setDoc(doc(db, 'users', uid), {
      uid,
      email,
      name: payload.name,
      displayName: payload.name,
      role: 'driver',
      ...rest,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    await eventsStore.addEvent({
      type: 'driver_created',
      title: `Водій ${payload.name} доданий`,
      description: `Email: ${payload.email}`,
      driverName: payload.name,
      by: { uid: authStore.user?.uid, name: authStore.user?.displayName || 'Диспетчер' },
    }).catch(() => {})

    notifStore.success('Водія створено')
    showCreateModal.value = false
    newDriver.value = emptyDriver()
    await refreshDrivers()
  } catch (e) {
    console.error('createDriver error:', e)
    notifStore.error(e.message || 'Помилка створення водія')
  }
  isCreating.value = false
}

function openEdit(driver) {
  editingDriver.value = driver
  editForm.value = {
    name: driver.name || '',
    phone: driver.phone || '',
    weightEmpty: driver.weightEmpty || '',
    maxLoadWeight: driver.maxLoadWeight || '',
    lengthCm: driver.lengthCm || '',
    widthCm: driver.widthCm || '',
    heightCm: driver.heightCm || '',
    driveType: driver.driveType || '',
    clearanceMm: driver.clearanceMm || '',
    containerTypes: [...(driver.containerTypes || [])],
  }
  showEditModal.value = true
}

async function saveEdit() {
  if (!editingDriver.value) return
  isEditing.value = true
  try {
    const driverRef = doc(db, 'users', editingDriver.value.id)
    await updateDoc(driverRef, {
      name: editForm.value.name,
      displayName: editForm.value.name,
      phone: editForm.value.phone || null,
      weightEmpty: editForm.value.weightEmpty ? Number(editForm.value.weightEmpty) : null,
      maxLoadWeight: editForm.value.maxLoadWeight ? Number(editForm.value.maxLoadWeight) : null,
      lengthCm: editForm.value.lengthCm ? Number(editForm.value.lengthCm) : null,
      widthCm: editForm.value.widthCm ? Number(editForm.value.widthCm) : null,
      heightCm: editForm.value.heightCm ? Number(editForm.value.heightCm) : null,
      driveType: editForm.value.driveType || null,
      clearanceMm: editForm.value.clearanceMm ? Number(editForm.value.clearanceMm) : null,
      containerTypes: editForm.value.containerTypes,
      updatedAt: serverTimestamp(),
    })
    await eventsStore.addEvent({
      type: 'driver_edited',
      title: `Водій ${editForm.value.name} відредагований`,
      driverName: editForm.value.name,
      driverUid: editingDriver.value.id,
      by: { uid: authStore.user?.uid, name: authStore.user?.displayName || 'Диспетчер' },
    })
    notifStore.success('Дані водія оновлено')
    showEditModal.value = false
    await refreshDrivers()
  } catch (e) {
    notifStore.error('Помилка: ' + e.message)
  }
  isEditing.value = false
}

async function refreshDrivers() {
  const [driverSnap, tripsSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'trips')),
  ])
  drivers.value = driverSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.role === 'driver')
  trips.value = tripsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Водії</h1>
        <p class="text-sm text-muted mt-0.5">{{ drivers.length }} водіїв зареєстровано</p>
      </div>
      <AppButton variant="primary" @click="showCreateModal = true">
        + Додати водія
      </AppButton>
    </div>

    <div class="bg-surface border border-border rounded-xl overflow-hidden">
      <div v-if="isLoading" class="flex justify-center py-8">
        <AppSpinner />
      </div>
      <div v-else-if="drivers.length === 0" class="text-center text-muted text-sm py-8">
        Водіїв не знайдено
      </div>
      <table v-else class="w-full text-sm">
        <thead class="bg-bg border-b border-border">
          <tr>
            <th class="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-wide">Ім'я</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-wide">Телефон</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-wide">Email</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-wide">Авто</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-wide">Статус</th>
            <th class="px-6 py-3" />
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="driver in drivers" :key="driver.id">
            <td class="px-6 py-4 font-medium text-gray-900">{{ driver.name || driver.displayName || '—' }}</td>
            <td class="px-6 py-4 text-muted">{{ driver.phone || '—' }}</td>
            <td class="px-6 py-4 text-muted">{{ driver.email || '—' }}</td>
            <td class="px-6 py-4 text-muted text-xs">
              <span v-if="driver.maxLoadWeight">до {{ driver.maxLoadWeight }} кг</span>
              <span v-if="driver.driveType" class="ml-1 text-gray-500">· {{ driver.driveType }}</span>
              <span v-if="driver.containerTypes?.length" class="ml-1">· {{ driver.containerTypes.join(', ') }}</span>
              <span v-if="!driver.maxLoadWeight && !driver.driveType" class="text-gray-300">—</span>
            </td>
            <td class="px-6 py-4">
              <span
                v-if="getDriverStatus(driver.id) === 'sos'"
                class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 animate-pulse"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-red-500" />
                SOS
              </span>
              <span
                v-else-if="getDriverStatus(driver.id) === 'online'"
                class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-green-500" />
                Онлайн
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-gray-400" />
                Офлайн
              </span>
            </td>
            <td class="px-6 py-4">
              <button class="text-primary hover:underline text-xs" @click="openEdit(driver)">Редагувати</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create driver modal -->
    <AppModal v-model="showCreateModal" title="Додати водія" persistent>
      <form class="flex flex-col gap-4" @submit.prevent="createDriver">
        <p class="text-xs font-semibold text-muted uppercase tracking-wide">Основні дані</p>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Ім'я *</label>
            <input v-model="newDriver.name" type="text" placeholder="Іван Петренко" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
            <input v-model="newDriver.phone" type="tel" placeholder="+380501234567" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input v-model="newDriver.email" type="email" placeholder="driver@example.com" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Пароль *</label>
            <input v-model="newDriver.password" type="password" placeholder="Мінімум 6 символів" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <p class="text-xs font-semibold text-muted uppercase tracking-wide mt-2">Маса і навантаження</p>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Вага без вантажу (кг)</label>
            <input v-model="newDriver.weightEmpty" type="number" placeholder="7500" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Макс. навантаження (кг)</label>
            <input v-model="newDriver.maxLoadWeight" type="number" placeholder="20000" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <p class="text-xs font-semibold text-muted uppercase tracking-wide mt-2">Габарити (см)</p>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Довжина</label>
            <input v-model="newDriver.lengthCm" type="number" placeholder="1200" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Ширина</label>
            <input v-model="newDriver.widthCm" type="number" placeholder="240" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Висота</label>
            <input v-model="newDriver.heightCm" type="number" placeholder="270" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <p class="text-xs font-semibold text-muted uppercase tracking-wide mt-2">Конфігурація</p>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Тип привода</label>
            <select v-model="newDriver.driveType" class="w-full px-3 py-2 rounded-lg border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Не вказано</option>
              <option v-for="opt in DRIVE_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Кліренс (мм)</label>
            <input v-model="newDriver.clearanceMm" type="number" placeholder="180" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Типи контейнерів</label>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="opt in CONTAINER_TYPE_OPTIONS"
              :key="opt.value"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors"
              :class="newDriver.containerTypes.includes(opt.value) ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border text-gray-600 hover:bg-bg'"
            >
              <input type="checkbox" class="hidden" :checked="newDriver.containerTypes.includes(opt.value)" @change="toggleContainerType(newDriver, opt.value)" />
              {{ opt.label }}
            </label>
          </div>
        </div>
      </form>
      <template #footer>
        <div class="flex gap-2 justify-end">
          <AppButton variant="ghost" @click="showCreateModal = false">Скасувати</AppButton>
          <AppButton variant="primary" :loading="isCreating" @click="createDriver">Створити</AppButton>
        </div>
      </template>
    </AppModal>

    <!-- Edit driver modal -->
    <AppModal v-model="showEditModal" :title="`Редагувати: ${editingDriver?.name}`" persistent>
      <form class="flex flex-col gap-4" @submit.prevent="saveEdit">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Ім'я *</label>
            <input v-model="editForm.name" type="text" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
            <input v-model="editForm.phone" type="tel" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <p class="text-xs font-semibold text-muted uppercase tracking-wide mt-1">Маса і навантаження</p>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Вага без вантажу (кг)</label>
            <input v-model="editForm.weightEmpty" type="number" placeholder="7500" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Макс. навантаження (кг)</label>
            <input v-model="editForm.maxLoadWeight" type="number" placeholder="20000" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <p class="text-xs font-semibold text-muted uppercase tracking-wide mt-1">Габарити (см)</p>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Довжина</label>
            <input v-model="editForm.lengthCm" type="number" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Ширина</label>
            <input v-model="editForm.widthCm" type="number" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Висота</label>
            <input v-model="editForm.heightCm" type="number" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <p class="text-xs font-semibold text-muted uppercase tracking-wide mt-1">Конфігурація</p>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Тип привода</label>
            <select v-model="editForm.driveType" class="w-full px-3 py-2 rounded-lg border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Не вказано</option>
              <option v-for="opt in DRIVE_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Кліренс (мм)</label>
            <input v-model="editForm.clearanceMm" type="number" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Типи контейнерів</label>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="opt in CONTAINER_TYPE_OPTIONS"
              :key="opt.value"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors"
              :class="editForm.containerTypes.includes(opt.value) ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border text-gray-600 hover:bg-bg'"
            >
              <input type="checkbox" class="hidden" :checked="editForm.containerTypes.includes(opt.value)" @change="toggleContainerType(editForm, opt.value)" />
              {{ opt.label }}
            </label>
          </div>
        </div>
      </form>
      <template #footer>
        <div class="flex gap-2 justify-end">
          <AppButton variant="ghost" @click="showEditModal = false">Скасувати</AppButton>
          <AppButton variant="primary" :loading="isEditing" @click="saveEdit">Зберегти</AppButton>
        </div>
      </template>
    </AppModal>
  </div>
</template>
