<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEventsStore } from '@/stores/events.js'

const eventsStore = useEventsStore()
const router = useRouter()

const EVENT_ICONS = {
  trip_created: '🚛',
  trip_edited: '✏️',
  trip_deleted: '🗑️',
  status_changed: '🔄',
  sos_alert: '🆘',
  driver_created: '👤',
  driver_edited: '📝',
  chat_message: '💬',
}

const EVENT_COLORS = {
  sos_alert: 'border-red-300 bg-red-50',
  trip_deleted: 'border-orange-300 bg-orange-50',
  trip_created: 'border-green-200 bg-green-50',
  driver_created: 'border-blue-200 bg-blue-50',
  chat_message: 'border-blue-200 bg-blue-50',
}

onMounted(() => {
  eventsStore.subscribe()
  eventsStore.markAllRead()
})

function formatTime(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function goToTrip(tripId) {
  if (tripId) router.push({ name: 'logist-trip-detail', params: { id: tripId } })
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-xl font-bold text-gray-900">Журнал подій</h1>
      <p class="text-sm text-muted mt-0.5">{{ eventsStore.events.length }} подій зафіксовано</p>
    </div>

    <div v-if="eventsStore.events.length === 0" class="bg-surface border border-border rounded-xl p-8 text-center text-muted text-sm">
      Подій поки що немає
    </div>

    <div v-else class="flex flex-col gap-3">
      <div
        v-for="event in eventsStore.events"
        :key="event.id"
        class="bg-surface border rounded-xl p-4 flex items-start gap-4 transition-all"
        :class="[EVENT_COLORS[event.type] || 'border-border', event.tripId ? 'cursor-pointer hover:shadow-sm' : '']"
        @click="goToTrip(event.tripId)"
      >
        <div class="text-2xl shrink-0">{{ EVENT_ICONS[event.type] || '📋' }}</div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-gray-900">{{ event.title }}</p>
          <p v-if="event.description" class="text-xs text-muted mt-0.5">{{ event.description }}</p>
          <div class="flex items-center gap-3 mt-1.5">
            <span v-if="event.by?.name" class="text-xs text-gray-500">{{ event.by.name }}</span>
            <span class="text-xs text-gray-400">{{ formatTime(event.at) }}</span>
            <span v-if="event.tripId" class="text-xs text-primary">→ відкрити рейс</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
