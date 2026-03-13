<script setup>
import { ref, computed, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { useLocationStore } from '@/stores/location.js'
import { useTripsStore } from '@/stores/trips.js'
import { getStatusColor } from '@/types/status.js'
import AppSpinner from '@/components/common/AppSpinner.vue'

const LeafletMap = defineAsyncComponent({
  loader: () => import('@/components/map/LeafletMap.vue'),
  loadingComponent: AppSpinner,
})

const locationStore = useLocationStore()
const tripsStore = useTripsStore()

const refreshInterval = ref(null)

const markers = computed(() => {
  return Object.entries(locationStore.driverLocations).map(([uid, loc]) => {
    const trip = tripsStore.trips.find(t => t.driverUid === uid)
    const color = trip ? getStatusColor(trip.currentStatus) : null
    return {
      lat: loc.lat,
      lng: loc.lng,
      label: trip?.driverName || uid,
      popup: `
        <div class="text-sm">
          <p class="font-semibold">${trip?.driverName || uid}</p>
          <p>Рейс: ${trip?.number || '—'}</p>
          <p>Швидкість: ${loc.speed ? Math.round(loc.speed * 3.6) + ' км/г' : '—'}</p>
        </div>
      `,
      color: color?.text?.replace('text-', '') || 'blue-600',
    }
  })
})

onMounted(async () => {
  await tripsStore.fetchTrips()
  locationStore.subscribeToAllLocations()
  refreshInterval.value = setInterval(() => {
    tripsStore.fetchTrips()
  }, 30000)
})

onUnmounted(() => {
  if (refreshInterval.value) clearInterval(refreshInterval.value)
  locationStore.unsubscribeFromLocations()
})
</script>

<template>
  <div class="flex flex-col gap-4 h-full">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Карта водіїв</h1>
        <p class="text-sm text-muted mt-0.5">{{ markers.length }} водій(ів) онлайн</p>
      </div>
    </div>

    <div class="flex-1 rounded-xl overflow-hidden border border-border" style="min-height: 500px;">
      <Suspense>
        <LeafletMap
          :center="[50.45, 30.52]"
          :zoom="6"
          :markers="markers"
          class="w-full h-full"
        />
        <template #fallback>
          <div class="flex items-center justify-center h-full">
            <AppSpinner size="lg" />
          </div>
        </template>
      </Suspense>
    </div>
  </div>
</template>
