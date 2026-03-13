<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTripsStore } from '@/stores/trips.js'
import { useLocationStore } from '@/stores/location.js'
import { STATUS_LABELS, CUSTOMS_STATUSES, EMERGENCY_STATUSES } from '@/types/status.js'
import AppBadge from '@/components/common/AppBadge.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'
import { useRouter } from 'vue-router'

const tripsStore = useTripsStore()
const locationStore = useLocationStore()
const router = useRouter()

const filterStatus = ref('')
const filterDriverUid = ref('')
const filterInternational = ref(null)
const isLoading = ref(false)

const trips = computed(() => {
  let list = tripsStore.trips
  if (filterStatus.value) {
    list = list.filter(t => t.currentStatus === filterStatus.value)
  }
  if (filterInternational.value !== null) {
    list = list.filter(t => t.isInternational === filterInternational.value)
  }
  return list
})

const kpiActive = computed(() => tripsStore.trips.filter(t => t.currentStatus !== 'trip_completed').length)
const kpiOnline = computed(() => Object.keys(locationStore.driverLocations).length)
const kpiCustoms = computed(() => tripsStore.trips.filter(t => CUSTOMS_STATUSES.includes(t.currentStatus)).length)
const kpiCompleted = computed(() => {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  return tripsStore.trips.filter(t => {
    if (t.currentStatus !== 'trip_completed') return false
    const completedAt = t.completedAt?.toDate?.() || new Date(t.completedAt)
    return completedAt >= monthStart
  }).length
})

onMounted(async () => {
  isLoading.value = true
  await tripsStore.fetchTrips()
  locationStore.subscribeToAllLocations()
  isLoading.value = false
})

function formatDate(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function openTrip(id) {
  router.push({ name: 'dispatcher-trip-detail', params: { id } })
}

function isSosTrip(trip) {
  return EMERGENCY_STATUSES.includes(trip.currentStatus)
}

const allStatuses = [
  'in_transit', 'loading_started', 'loading_completed', 'departed',
  'customs_in_progress', 'trip_completed', 'delayed', 'breakdown',
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-xl font-bold text-gray-900">Дашборд</h1>
      <p class="text-sm text-muted mt-0.5">Огляд поточної ситуації</p>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-surface border border-border rounded-xl p-4">
        <p class="text-xs text-muted font-medium uppercase tracking-wide">Активні рейси</p>
        <p class="text-3xl font-bold text-primary mt-1">{{ kpiActive }}</p>
      </div>
      <div class="bg-surface border border-border rounded-xl p-4">
        <p class="text-xs text-muted font-medium uppercase tracking-wide">Водіїв онлайн</p>
        <p class="text-3xl font-bold text-accent mt-1">{{ kpiOnline }}</p>
      </div>
      <div class="bg-surface border border-border rounded-xl p-4">
        <p class="text-xs text-muted font-medium uppercase tracking-wide">На митниці</p>
        <p class="text-3xl font-bold text-purple-600 mt-1">{{ kpiCustoms }}</p>
      </div>
      <div class="bg-surface border border-border rounded-xl p-4">
        <p class="text-xs text-muted font-medium uppercase tracking-wide">Завершено (місяць)</p>
        <p class="text-3xl font-bold text-green-600 mt-1">{{ kpiCompleted }}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-surface border border-border rounded-xl p-4 flex flex-wrap gap-3 items-center">
      <select
        v-model="filterStatus"
        class="px-3 py-2 rounded-lg border border-border text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <option value="">Усі статуси</option>
        <option v-for="s in allStatuses" :key="s" :value="s">{{ STATUS_LABELS[s] }}</option>
      </select>
      <select
        v-model="filterInternational"
        class="px-3 py-2 rounded-lg border border-border text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <option :value="null">Всі типи</option>
        <option :value="false">Внутрішні</option>
        <option :value="true">Міжнародні</option>
      </select>
      <button
        class="text-sm text-muted hover:text-primary transition-colors"
        @click="filterStatus = ''; filterInternational = null"
      >
        Скинути фільтри
      </button>
    </div>

    <!-- Trips table -->
    <div class="bg-surface border border-border rounded-xl overflow-hidden">
      <div class="px-6 py-4 border-b border-border">
        <h2 class="text-sm font-semibold text-gray-900">Активні рейси</h2>
      </div>

      <div v-if="isLoading" class="flex justify-center py-8">
        <AppSpinner />
      </div>

      <div v-else-if="trips.length === 0" class="text-center text-muted text-sm py-8">
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
              v-for="trip in trips"
              :key="trip.id"
              class="hover:bg-bg transition-colors cursor-pointer"
              :class="isSosTrip(trip) ? 'animate-pulse bg-red-50 hover:bg-red-50' : ''"
              @click="openTrip(trip.id)"
            >
              <td class="px-6 py-4 font-mono font-semibold" :class="isSosTrip(trip) ? 'text-red-700' : 'text-gray-900'">
                {{ trip.number }}
                <span v-if="isSosTrip(trip)" class="ml-1 text-xs font-bold text-red-600">⚠ SOS</span>
              </td>
              <td class="px-6 py-4 text-gray-700">
                <span>{{ trip.waypoints?.[0]?.name || '—' }}</span>
                <span class="text-muted mx-1">→</span>
                <span>{{ trip.waypoints?.[trip.waypoints.length - 1]?.name || '—' }}</span>
                <span v-if="trip.isInternational" class="ml-2 text-xs text-purple-600 font-medium">МЖ</span>
              </td>
              <td class="px-6 py-4 text-gray-700">{{ trip.driverName || '—' }}</td>
              <td class="px-6 py-4">
                <AppBadge :status="trip.currentStatus" />
              </td>
              <td class="px-6 py-4 text-muted">{{ formatDate(trip.updatedAt) }}</td>
              <td class="px-6 py-4">
                <button
                  class="text-primary hover:underline text-xs"
                  @click.stop="openTrip(trip.id)"
                >
                  Відкрити
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
