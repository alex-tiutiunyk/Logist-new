<script setup>
import { ref, computed, defineAsyncComponent } from 'vue'
import { useTripsStore } from '@/stores/trips.js'
import { useLocationStore } from '@/stores/location.js'
import { useAuthStore } from '@/stores/auth.js'
import AppSpinner from '@/components/common/AppSpinner.vue'

const LeafletMap = defineAsyncComponent({
  loader: () => import('@/components/map/LeafletMap.vue'),
  loadingComponent: AppSpinner,
})

const tripsStore = useTripsStore()
const locationStore = useLocationStore()
const authStore = useAuthStore()

const trip = computed(() => tripsStore.currentTrip)

const mapCenter = computed(() => {
  if (locationStore.myLocation) {
    return [locationStore.myLocation.lat, locationStore.myLocation.lng]
  }
  return [50.45, 30.52] // Kyiv default
})

const polylinePoints = computed(() => {
  if (!trip.value?.waypoints) return []
  return trip.value.waypoints.map(wp => [wp.lat, wp.lng]).filter(p => p[0] && p[1])
})

const myMarker = computed(() => {
  if (!locationStore.myLocation) return []
  return [{
    lat: locationStore.myLocation.lat,
    lng: locationStore.myLocation.lng,
    label: 'Моя позиція',
    color: 'blue',
  }]
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Map -->
    <div class="flex-1 relative" style="min-height: calc(100vh - 56px - 72px);">
      <Suspense>
        <LeafletMap
          :center="mapCenter"
          :zoom="12"
          :markers="myMarker"
          :polyline="polylinePoints"
          class="w-full h-full"
        />
        <template #fallback>
          <div class="flex items-center justify-center h-full">
            <AppSpinner size="lg" />
          </div>
        </template>
      </Suspense>
    </div>

    <!-- Bottom info bar -->
    <div class="bg-surface border-t border-border px-4 py-3 flex items-center gap-4 text-sm">
      <div class="flex-1">
        <p class="text-xs text-muted">Швидкість</p>
        <p class="font-semibold text-gray-900">
          {{ locationStore.myLocation?.speed ? Math.round(locationStore.myLocation.speed * 3.6) + ' км/г' : '—' }}
        </p>
      </div>
      <div class="flex-1">
        <p class="text-xs text-muted">Точність</p>
        <p class="font-semibold text-gray-900">
          {{ locationStore.myLocation?.accuracy ? '±' + Math.round(locationStore.myLocation.accuracy) + ' м' : '—' }}
        </p>
      </div>
      <div class="flex-1 text-right">
        <p class="text-xs text-muted">Рейс</p>
        <p class="font-semibold text-gray-900">{{ trip?.number || '—' }}</p>
      </div>
    </div>
  </div>
</template>
