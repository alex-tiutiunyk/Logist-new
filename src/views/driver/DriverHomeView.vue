<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useTripsStore } from '@/stores/trips.js'
import { useNotificationsStore } from '@/stores/notifications.js'
import { useEventsStore } from '@/stores/events.js'
import { STATUS_LABELS, EMERGENCY_STATUSES } from '@/types/status.js'
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'

const authStore = useAuthStore()
const tripsStore = useTripsStore()
const notifStore = useNotificationsStore()
const eventsStore = useEventsStore()

const showStatusModal = ref(false)
const showSosModal = ref(false)
const isUpdating = ref(false)
let unsubscribe = null

const trip = computed(() => tripsStore.currentTrip)

const availableStatuses = computed(() => {
  if (!trip.value?.availableStatuses) return []
  return trip.value.availableStatuses.filter(s => !EMERGENCY_STATUSES.includes(s))
})

onMounted(async () => {
  if (authStore.user) {
    const trips = await tripsStore.fetchTrips({ driverUid: authStore.user.uid })
    const active = trips.find(t => t.currentStatus !== 'trip_completed')
    if (active) {
      tripsStore.currentTrip = active
      unsubscribe = tripsStore.subscribeToTrip(active.id)
    }
  }
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})

async function selectStatus(status) {
  if (!trip.value) return
  isUpdating.value = true
  showStatusModal.value = false
  const result = await tripsStore.updateTripStatus(trip.value.id, status)
  isUpdating.value = false
  if (result.success) {
    notifStore.success(`Статус оновлено: ${STATUS_LABELS[status]}`)
    await eventsStore.addEvent({
      type: 'status_changed',
      title: `Статус рейсу ${trip.value.number} змінено`,
      description: `→ ${STATUS_LABELS[status] || status}`,
      tripId: trip.value.id,
      tripNumber: trip.value.number,
      by: { uid: authStore.user?.uid, name: authStore.user?.displayName || 'Водій' },
    })
  } else {
    notifStore.error('Помилка оновлення статусу')
  }
}

async function triggerSOS(type) {
  if (!trip.value) return
  showSosModal.value = false
  isUpdating.value = true
  const result = await tripsStore.updateTripStatus(trip.value.id, type, null, 'SOS')
  isUpdating.value = false
  if (result.success) {
    notifStore.error(`SOS: ${STATUS_LABELS[type]}`)
    await eventsStore.addEvent({
      type: 'sos_alert',
      title: `⚠ SOS: Рейс ${trip.value.number}`,
      description: STATUS_LABELS[type] || type,
      tripId: trip.value.id,
      tripNumber: trip.value.number,
      by: { uid: authStore.user?.uid, name: authStore.user?.displayName || 'Водій' },
      isEmergency: true,
    })
  }
}

function formatEta(eta) {
  if (!eta) return '—'
  const d = eta.toDate ? eta.toDate() : new Date(eta)
  return d.toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="p-4 flex flex-col gap-4 min-h-full">
    <!-- Active trip card -->
    <div v-if="trip" class="bg-surface rounded-2xl border border-border p-5 shadow-sm">
      <div class="flex items-start justify-between mb-3">
        <div>
          <p class="text-xs text-muted font-medium uppercase tracking-wide">Активний рейс</p>
          <p class="text-xl font-bold text-gray-900 mt-0.5">{{ trip.number }}</p>
        </div>
        <AppBadge :status="trip.currentStatus" />
      </div>

      <div class="flex items-center gap-2 text-sm text-gray-700 mb-3">
        <span class="font-medium">{{ trip.waypoints?.[0]?.name || '—' }}</span>
        <svg class="w-4 h-4 text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
        <span class="font-medium">{{ trip.waypoints?.[trip.waypoints.length - 1]?.name || '—' }}</span>
      </div>

      <div class="flex items-center gap-4 text-xs text-muted">
        <span>ETA: {{ formatEta(trip.eta) }}</span>
        <span v-if="trip.isInternational" class="flex items-center gap-1 text-purple-600 font-medium">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
          </svg>
          Міжнародний
        </span>
      </div>
    </div>

    <!-- No trip -->
    <div v-else class="bg-surface rounded-2xl border border-border p-8 text-center text-muted">
      <svg class="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM1 1h11l1 6H2L1 1zM12 7h5l3 6v4h-8V7z" />
      </svg>
      <p class="text-sm font-medium">Активних рейсів немає</p>
      <p class="text-xs mt-1">Зверніться до диспетчера</p>
    </div>

    <!-- Status update button -->
    <button
      v-if="trip"
      class="min-h-[56px] w-full bg-primary text-white font-semibold text-base rounded-2xl shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
      :disabled="isUpdating"
      @click="showStatusModal = true"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Оновити статус
    </button>

    <!-- SOS button -->
    <button
      v-if="trip"
      class="min-h-[48px] w-full bg-red-600 text-white font-bold text-base rounded-2xl shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
      @click="showSosModal = true"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      SOS — Надзвичайна ситуація
    </button>

    <!-- Status selection modal -->
    <AppModal v-model="showStatusModal" title="Оновити статус">
      <div class="flex flex-col gap-2">
        <button
          v-for="status in availableStatuses"
          :key="status"
          class="w-full text-left px-4 py-3 rounded-xl border transition-all text-sm font-medium flex items-center justify-between"
          :class="status === trip.currentStatus
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-border hover:bg-bg hover:border-primary/30 text-gray-800'"
          @click="selectStatus(status)"
        >
          {{ STATUS_LABELS[status] || status }}
          <span v-if="status === trip.currentStatus" class="text-xs font-semibold text-primary">● активний</span>
        </button>
        <p v-if="availableStatuses.length === 0" class="text-sm text-muted text-center py-4">
          Немає доступних статусів
        </p>
      </div>
    </AppModal>

    <!-- SOS modal -->
    <AppModal v-model="showSosModal" title="Надзвичайна ситуація">
      <div class="flex flex-col gap-2">
        <button
          v-for="status in ['delayed','breakdown','cargo_damaged','accident','rest_stop','terminal_rejected_return']"
          :key="status"
          class="w-full text-left px-4 py-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 transition-colors text-sm font-medium text-red-800"
          @click="triggerSOS(status)"
        >
          {{ STATUS_LABELS[status] || status }}
        </button>
      </div>
    </AppModal>
  </div>
</template>
