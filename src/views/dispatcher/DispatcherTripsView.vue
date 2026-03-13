<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTripsStore } from '@/stores/trips.js'
import { useNotificationsStore } from '@/stores/notifications.js'
import { useAuthStore } from '@/stores/auth.js'
import { useEventsStore } from '@/stores/events.js'
import { STATUS_LABELS, EMERGENCY_STATUSES } from '@/types/status.js'
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/firebase/firestore.js'

const router = useRouter()
const tripsStore = useTripsStore()
const notifStore = useNotificationsStore()
const authStore = useAuthStore()
const eventsStore = useEventsStore()

const search = ref('')
const filterStatus = ref('')
const showCreateModal = ref(false)
const showDeleteConfirm = ref(false)
const isCreating = ref(false)
const isDeleting = ref(false)
const deletingTrip = ref(null)
const drivers = ref([])

const newTrip = ref({
  number: '',
  driverUid: '',
  origin: '',
  destination: '',
  isInternational: false,
  eta: '',
})

const filteredTrips = computed(() => {
  return tripsStore.trips.filter(t => {
    const matchSearch = !search.value ||
      t.number?.toLowerCase().includes(search.value.toLowerCase()) ||
      t.driverName?.toLowerCase().includes(search.value.toLowerCase())
    const matchStatus = !filterStatus.value || t.currentStatus === filterStatus.value
    return matchSearch && matchStatus
  })
})

const selectedDriver = computed(() => drivers.value.find(d => d.id === newTrip.value.driverUid))

onMounted(async () => {
  await Promise.all([
    tripsStore.fetchTrips(),
    loadDrivers(),
  ])
})

async function loadDrivers() {
  try {
    const snap = await getDocs(collection(db, 'users'))
    drivers.value = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(u => u.role === 'driver')
  } catch (e) {
    console.error(e)
  }
}

async function createTrip() {
  if (!newTrip.value.number) {
    notifStore.error('Введіть номер рейсу')
    return
  }
  isCreating.value = true
  const driver = selectedDriver.value
  const tripData = {
    number: newTrip.value.number,
    driverName: driver?.name || driver?.displayName || '',
    driverUid: newTrip.value.driverUid || '',
    isInternational: newTrip.value.isInternational,
    eta: newTrip.value.eta ? new Date(newTrip.value.eta) : null,
    dispatcherUid: authStore.user?.uid || '',
    waypoints: [
      { id: '1', name: newTrip.value.origin, type: 'loading', completed: false, arrivedAt: null, departedAt: null },
      { id: '2', name: newTrip.value.destination, type: 'unloading', completed: false, arrivedAt: null, departedAt: null },
    ],
    containers: [],
    availableStatuses: ['en_route_to_loading', 'arrived_at_loading', 'loading_started', 'loading_completed', 'departed', 'in_transit'],
  }
  const result = await tripsStore.createTrip(tripData)
  if (result.success) {
    await eventsStore.addEvent({
      type: 'trip_created',
      title: `Рейс ${newTrip.value.number} створено`,
      description: `${newTrip.value.origin || '?'} → ${newTrip.value.destination || '?'}`,
      tripId: result.id,
      tripNumber: newTrip.value.number,
      by: { uid: authStore.user?.uid, name: authStore.user?.displayName || 'Диспетчер' },
    })
    notifStore.success('Рейс створено')
    showCreateModal.value = false
    newTrip.value = { number: '', driverUid: '', origin: '', destination: '', isInternational: false, eta: '' }
    await tripsStore.fetchTrips()
  } else {
    notifStore.error('Помилка створення рейсу')
  }
  isCreating.value = false
}

function confirmDelete(trip, e) {
  e.stopPropagation()
  deletingTrip.value = trip
  showDeleteConfirm.value = true
}

async function doDelete() {
  if (!deletingTrip.value) return
  isDeleting.value = true
  const result = await tripsStore.deleteTrip(deletingTrip.value.id)
  if (result.success) {
    await eventsStore.addEvent({
      type: 'trip_deleted',
      title: `Рейс ${deletingTrip.value.number} видалено`,
      by: { uid: authStore.user?.uid, name: authStore.user?.displayName || 'Диспетчер' },
    })
    notifStore.success('Рейс видалено')
  } else {
    notifStore.error('Помилка видалення')
  }
  showDeleteConfirm.value = false
  deletingTrip.value = null
  isDeleting.value = false
}

function isSosTrip(trip) {
  return EMERGENCY_STATUSES.includes(trip.currentStatus)
}

function formatDate(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Рейси</h1>
        <p class="text-sm text-muted mt-0.5">Усі рейси: {{ filteredTrips.length }}</p>
      </div>
      <AppButton variant="primary" @click="showCreateModal = true">
        + Новий рейс
      </AppButton>
    </div>

    <!-- Filters -->
    <div class="flex gap-3 flex-wrap">
      <input
        v-model="search"
        type="text"
        placeholder="Пошук за номером або водієм..."
        class="px-3 py-2 rounded-lg border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 w-64"
      />
      <select
        v-model="filterStatus"
        class="px-3 py-2 rounded-lg border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <option value="">Усі статуси</option>
        <option value="in_transit">В дорозі</option>
        <option value="loading_started">Завантаження</option>
        <option value="customs_in_progress">Митниця</option>
        <option value="trip_completed">Завершено</option>
        <option value="delayed">Затримка</option>
        <option value="breakdown">Поломка</option>
        <option value="accident">ДТП</option>
      </select>
    </div>

    <!-- Table -->
    <div class="bg-surface border border-border rounded-xl overflow-hidden">
      <div v-if="tripsStore.isLoading" class="flex justify-center py-8">
        <AppSpinner />
      </div>
      <div v-else-if="filteredTrips.length === 0" class="text-center text-muted text-sm py-8">
        Рейсів не знайдено
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-bg border-b border-border">
            <tr>
              <th class="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-wide">Номер</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-wide">Маршрут</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-wide">Водій</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-wide">Статус</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-wide">Оновлено</th>
              <th class="px-6 py-3" />
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="trip in filteredTrips"
              :key="trip.id"
              class="hover:bg-bg transition-colors cursor-pointer"
              :class="isSosTrip(trip) ? 'animate-pulse bg-red-50 hover:bg-red-50' : ''"
              @click="router.push({ name: 'dispatcher-trip-detail', params: { id: trip.id } })"
            >
              <td class="px-6 py-4 font-mono font-semibold" :class="isSosTrip(trip) ? 'text-red-700' : 'text-gray-900'">
                {{ trip.number }}
                <span v-if="isSosTrip(trip)" class="ml-1 text-xs font-bold text-red-600">⚠ SOS</span>
              </td>
              <td class="px-6 py-4 text-gray-700">
                {{ trip.waypoints?.[0]?.name || '—' }} → {{ trip.waypoints?.[trip.waypoints.length - 1]?.name || '—' }}
                <span v-if="trip.isInternational" class="ml-1 text-xs text-purple-600">МЖ</span>
              </td>
              <td class="px-6 py-4 text-gray-700">{{ trip.driverName || '—' }}</td>
              <td class="px-6 py-4"><AppBadge :status="trip.currentStatus" /></td>
              <td class="px-6 py-4 text-muted">{{ formatDate(trip.updatedAt) }}</td>
              <td class="px-6 py-4 flex items-center gap-3">
                <button class="text-primary hover:underline text-xs" @click.stop="router.push({ name: 'dispatcher-trip-detail', params: { id: trip.id } })">
                  Деталі
                </button>
                <button class="text-red-500 hover:underline text-xs" @click="confirmDelete(trip, $event)">
                  Видалити
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create modal -->
    <AppModal v-model="showCreateModal" title="Новий рейс" persistent>
      <form class="flex flex-col gap-4" @submit.prevent="createTrip">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Номер рейсу *</label>
            <input v-model="newTrip.number" type="text" placeholder="TP-001" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Водій</label>
            <select v-model="newTrip.driverUid" class="w-full px-3 py-2 rounded-lg border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Не призначено</option>
              <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.name || d.displayName || d.email }}</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Звідки</label>
            <input v-model="newTrip.origin" type="text" placeholder="Київ" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Куди</label>
            <input v-model="newTrip.destination" type="text" placeholder="Одеса" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">ETA</label>
          <input v-model="newTrip.eta" type="datetime-local" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div class="flex items-center gap-2">
          <input v-model="newTrip.isInternational" type="checkbox" id="isIntl" class="rounded" />
          <label for="isIntl" class="text-sm text-gray-700">Міжнародний рейс</label>
        </div>
      </form>
      <template #footer>
        <div class="flex gap-2 justify-end">
          <AppButton variant="ghost" @click="showCreateModal = false">Скасувати</AppButton>
          <AppButton variant="primary" :loading="isCreating" @click="createTrip">Створити</AppButton>
        </div>
      </template>
    </AppModal>

    <!-- Delete confirm modal -->
    <AppModal v-model="showDeleteConfirm" title="Видалити рейс?">
      <p class="text-sm text-gray-700">
        Ви впевнені, що хочете видалити рейс <strong>{{ deletingTrip?.number }}</strong>? Цю дію не можна скасувати.
      </p>
      <template #footer>
        <div class="flex gap-2 justify-end">
          <AppButton variant="ghost" @click="showDeleteConfirm = false">Скасувати</AppButton>
          <AppButton variant="danger" :loading="isDeleting" @click="doDelete">Видалити</AppButton>
        </div>
      </template>
    </AppModal>
  </div>
</template>
