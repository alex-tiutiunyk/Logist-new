<script setup>
import { computed } from 'vue'
import { useTripsStore } from '@/stores/trips.js'
import AppBadge from '@/components/common/AppBadge.vue'

const tripsStore = useTripsStore()
const trip = computed(() => tripsStore.currentTrip)

const containerTypeLabels = {
  '20ft': '20 футів',
  '40ft': '40 футів',
  '40ft_hc': '40 футів HC',
  '45ft': '45 футів',
}

const waypointTypeLabels = {
  loading: 'Завантаження',
  unloading: 'Розвантаження',
  waypoint: 'Проміжна точка',
  terminal: 'Термінал',
}
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <!-- No trip -->
    <div v-if="!trip" class="text-center text-muted py-12 text-sm">
      Рейс не знайдено
    </div>

    <template v-else>
      <!-- Header -->
      <div class="bg-surface rounded-2xl border border-border p-5">
        <div class="flex items-start justify-between mb-2">
          <div>
            <p class="text-xs text-muted uppercase tracking-wide">Рейс</p>
            <p class="text-xl font-bold text-gray-900">{{ trip.number }}</p>
          </div>
          <div class="flex flex-col items-end gap-1">
            <AppBadge :status="trip.currentStatus" />
            <span v-if="trip.isInternational" class="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-full">
              Міжнародний
            </span>
          </div>
        </div>
        <p class="text-sm text-muted">Водій: <span class="text-gray-800 font-medium">{{ trip.driverName }}</span></p>
      </div>

      <!-- Containers -->
      <div class="bg-surface rounded-2xl border border-border p-5">
        <h3 class="text-sm font-semibold text-gray-900 mb-3">Контейнери</h3>
        <div v-if="trip.containers?.length" class="flex flex-col gap-3">
          <div
            v-for="container in trip.containers"
            :key="container.id"
            class="p-3 bg-bg rounded-xl border border-border"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="font-mono font-bold text-gray-900">{{ container.number }}</span>
              <span class="text-xs text-muted bg-border px-2 py-0.5 rounded-full">
                {{ containerTypeLabels[container.type] || container.type }}
              </span>
            </div>
            <div class="grid grid-cols-2 gap-1 text-xs text-muted">
              <span>Пломба: <span class="text-gray-800">{{ container.sealNumber || '—' }}</span></span>
              <span>Вага: <span class="text-gray-800">{{ container.weight ? container.weight + ' кг' : '—' }}</span></span>
            </div>
            <p v-if="container.cargoDescription" class="text-xs text-muted mt-1">
              {{ container.cargoDescription }}
            </p>
          </div>
        </div>
        <p v-else class="text-sm text-muted text-center py-4">Контейнери не додано</p>
      </div>

      <!-- Waypoints timeline -->
      <div class="bg-surface rounded-2xl border border-border p-5">
        <h3 class="text-sm font-semibold text-gray-900 mb-4">Маршрут</h3>
        <div v-if="trip.waypoints?.length" class="relative">
          <!-- Vertical line -->
          <div class="absolute left-[11px] top-3 bottom-3 w-0.5 bg-border" />
          <div class="flex flex-col gap-4">
            <div
              v-for="(wp, idx) in trip.waypoints"
              :key="wp.id || idx"
              class="flex items-start gap-3 relative"
            >
              <!-- Icon -->
              <div
                class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 relative z-10"
                :class="wp.completed
                  ? 'bg-accent text-white'
                  : idx === trip.waypoints.findIndex(w => !w.completed)
                    ? 'bg-primary text-white'
                    : 'bg-border text-muted'"
              >
                <svg v-if="wp.completed" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
                <svg v-else-if="idx === trip.waypoints.findIndex(w => !w.completed)" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                <div v-else class="w-2 h-2 rounded-full bg-muted" />
              </div>
              <!-- Content -->
              <div class="flex-1 pb-1">
                <p class="text-sm font-medium text-gray-900">{{ wp.name }}</p>
                <p class="text-xs text-muted">{{ waypointTypeLabels[wp.type] || wp.type }}</p>
                <p v-if="wp.address" class="text-xs text-muted mt-0.5">{{ wp.address }}</p>
              </div>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-muted text-center py-4">Точки маршруту не додано</p>
      </div>
    </template>
  </div>
</template>
