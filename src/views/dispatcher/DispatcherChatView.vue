<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useTripsStore } from '@/stores/trips.js'
import { useChatStore } from '@/stores/chat.js'
import AppBadge from '@/components/common/AppBadge.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'
import ChatWindow from '@/components/chat/ChatWindow.vue'

const authStore = useAuthStore()
const tripsStore = useTripsStore()
const chatStore = useChatStore()

const selectedTripId = ref(null)
const isLoading = ref(false)

const activeTrips = computed(() =>
  tripsStore.trips.filter(t => t.currentStatus !== 'trip_completed')
)

const selectedTrip = computed(() =>
  activeTrips.value.find(t => t.id === selectedTripId.value)
)

onMounted(async () => {
  isLoading.value = true
  await tripsStore.fetchTrips()
  // Subscribe to all active chats
  activeTrips.value.forEach(t => chatStore.subscribeToChat(t.id))
  isLoading.value = false
})

onUnmounted(() => {
  activeTrips.value.forEach(t => chatStore.unsubscribeFromChat(t.id))
})

function getUnreadCount(tripId) {
  return chatStore.unreadCounts[tripId] || 0
}
</script>

<template>
  <div class="flex h-[calc(100vh-130px)] gap-4">
    <!-- Trip list sidebar -->
    <div class="w-72 bg-surface border border-border rounded-xl flex flex-col shrink-0">
      <div class="px-4 py-3 border-b border-border">
        <h2 class="text-sm font-semibold text-gray-900">Активні чати</h2>
      </div>
      <div v-if="isLoading" class="flex justify-center py-8">
        <AppSpinner />
      </div>
      <div v-else-if="activeTrips.length === 0" class="text-center text-muted text-sm py-8">
        Активних рейсів немає
      </div>
      <div v-else class="flex-1 overflow-y-auto">
        <button
          v-for="trip in activeTrips"
          :key="trip.id"
          class="w-full text-left px-4 py-3 border-b border-border last:border-0 transition-colors hover:bg-bg"
          :class="selectedTripId === trip.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''"
          @click="selectedTripId = trip.id; chatStore.setActiveChat(trip.id)"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm font-semibold text-gray-900 font-mono">{{ trip.number }}</span>
            <span
              v-if="getUnreadCount(trip.id) > 0"
              class="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold"
            >
              {{ getUnreadCount(trip.id) }}
            </span>
          </div>
          <p class="text-xs text-muted">{{ trip.driverName || '—' }}</p>
          <div class="mt-1">
            <AppBadge :status="trip.currentStatus" />
          </div>
        </button>
      </div>
    </div>

    <!-- Chat window -->
    <div class="flex-1 bg-surface border border-border rounded-xl overflow-hidden">
      <div v-if="!selectedTripId" class="flex items-center justify-center h-full text-muted text-sm">
        Оберіть рейс для перегляду чату
      </div>
      <ChatWindow
        v-else
        :trip-id="selectedTripId"
        :current-user-uid="authStore.user?.uid"
        current-user-role="dispatcher"
        class="h-full"
      />
    </div>
  </div>
</template>
