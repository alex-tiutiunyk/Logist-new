<script setup>
import { computed } from 'vue'
import { STATUS_LABELS, EMERGENCY_STATUSES, CUSTOMS_STATUSES } from '@/types/status.js'

const props = defineProps({
  statusLog: {
    type: Array,
    default: () => [],
  },
  waypoints: {
    type: Array,
    default: () => [],
  },
})

function formatDate(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleString('uk-UA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function getStatusIcon(status) {
  if (EMERGENCY_STATUSES.includes(status)) return 'emergency'
  if (CUSTOMS_STATUSES.includes(status)) return 'customs'
  if (status === 'trip_completed') return 'completed'
  if (['loading_started', 'loading_completed', 'unloading_started', 'unloading_completed'].includes(status)) return 'loading'
  return 'transit'
}

function getIconClasses(status) {
  const icon = getStatusIcon(status)
  const map = {
    emergency: 'bg-red-100 text-red-600 border-red-200',
    customs: 'bg-purple-100 text-purple-600 border-purple-200',
    completed: 'bg-green-100 text-green-600 border-green-200',
    loading: 'bg-amber-100 text-amber-600 border-amber-200',
    transit: 'bg-blue-100 text-blue-600 border-blue-200',
  }
  return map[icon] || map.transit
}
</script>

<template>
  <div class="bg-surface border border-border rounded-xl p-5">
    <h3 class="text-sm font-semibold text-gray-900 mb-4">Хронологія статусів</h3>

    <div v-if="statusLog.length === 0" class="text-sm text-muted text-center py-4">
      Змін статусів не зафіксовано
    </div>

    <div v-else class="relative">
      <!-- Vertical line -->
      <div class="absolute left-[15px] top-4 bottom-4 w-0.5 bg-border" />

      <div class="flex flex-col gap-4">
        <div
          v-for="(entry, idx) in [...statusLog].reverse()"
          :key="idx"
          class="flex items-start gap-4 relative"
        >
          <!-- Icon -->
          <div
            class="w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 relative z-10 bg-surface"
            :class="getIconClasses(entry.status)"
          >
            <!-- Emergency -->
            <svg v-if="getStatusIcon(entry.status) === 'emergency'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <!-- Customs -->
            <svg v-else-if="getStatusIcon(entry.status) === 'customs'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064" />
            </svg>
            <!-- Completed -->
            <svg v-else-if="getStatusIcon(entry.status) === 'completed'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
            <!-- Loading -->
            <svg v-else-if="getStatusIcon(entry.status) === 'loading'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
            </svg>
            <!-- Transit -->
            <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>

          <!-- Content -->
          <div class="flex-1 pb-1">
            <p class="text-sm font-medium text-gray-900">
              {{ STATUS_LABELS[entry.status] || entry.status }}
            </p>
            <p class="text-xs text-muted mt-0.5">{{ formatDate(entry.at) }}</p>
            <p v-if="entry.comment" class="text-xs text-gray-600 mt-1 italic">{{ entry.comment }}</p>
            <p v-if="entry.byName" class="text-xs text-muted mt-0.5">{{ entry.byName }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
