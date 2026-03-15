<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useRoutesStore } from '@/stores/routesStore.js'
import LeafletMap from '@/components/map/LeafletMap.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'

const route = useRoute()
const routesStore = useRoutesStore()

const isLoading = ref(true)
const routeData = ref(null)
const notFound = ref(false)

onMounted(async () => {
  try {
    const id = route.params.id
    const data = await routesStore.fetchRouteById(id)
    if (!data) {
      notFound.value = true
    } else {
      routeData.value = data
    }
  } catch (e) {
    notFound.value = true
  } finally {
    isLoading.value = false
  }
})

const polyline = computed(() => {
  if (!routeData.value?.routeData?.polylinePoints) return []
  return routeData.value.routeData.polylinePoints
})

function formatDistance(distanceM) {
  if (!distanceM) return '—'
  return (distanceM / 1000).toFixed(1) + ' км'
}

function formatDuration(durationS) {
  if (!durationS) return '—'
  const totalMin = Math.round(durationS / 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h}:${String(m).padStart(2, '0')} год`
}

const vehicleParams = computed(() => {
  const vp = routeData.value?.routeData?.vehicleParams
  if (!vp) return null
  const parts = []
  if (vp.heightCm) parts.push(`Висота: ${vp.heightCm} см`)
  if (vp.widthCm) parts.push(`Ширина: ${vp.widthCm} см`)
  if (vp.lengthCm) parts.push(`Довжина: ${vp.lengthCm} см`)
  if (vp.grossWeightKg) parts.push(`Повна маса: ${vp.grossWeightKg} кг`)
  return parts.length ? parts : null
})
</script>

<template>
  <div class="fixed inset-0 w-full h-full">

    <!-- Loading / Error states -->
    <div v-if="isLoading" class="w-full h-full flex items-center justify-center bg-bg">
      <AppSpinner size="lg" />
    </div>

    <div v-else-if="notFound" class="w-full h-full flex items-center justify-center bg-bg">
      <div class="text-center px-4">
        <svg class="w-16 h-16 mx-auto text-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <p class="text-lg font-semibold text-gray-900">Маршрут не знайдено</p>
        <p class="text-sm text-muted mt-1">Перевірте посилання або зверніться до відправника</p>
      </div>
    </div>

    <template v-else>
      <!-- Full-screen map -->
      <div class="w-full h-full">
        <LeafletMap :polyline="polyline" />
      </div>

      <!-- Overlay card top-left -->
      <div class="absolute top-4 left-4 z-[1000] bg-surface/95 backdrop-blur-sm border border-border rounded-2xl shadow-xl p-4 w-72 max-w-[calc(100vw-2rem)]">
        <div class="flex items-center gap-2 mb-3">
          <svg class="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <h1 class="text-sm font-bold text-gray-900 truncate">
            {{ routeData.title || 'Маршрут' }}
          </h1>
        </div>

        <!-- Origin → Destination -->
        <div class="flex flex-col gap-1.5 mb-3">
          <div class="flex items-start gap-2 text-sm">
            <span class="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0"></span>
            <span class="text-gray-900 font-medium leading-snug">{{ routeData.origin?.name || '—' }}</span>
          </div>
          <div class="flex items-start gap-2 text-sm">
            <span class="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0"></span>
            <span class="text-gray-900 font-medium leading-snug">{{ routeData.destination?.name || '—' }}</span>
          </div>
        </div>

        <!-- Stats -->
        <div class="flex items-center gap-4 text-xs py-3 border-t border-border">
          <div>
            <p class="text-muted">Відстань</p>
            <p class="font-semibold text-primary">{{ formatDistance(routeData.routeData?.distanceM) }}</p>
          </div>
          <div>
            <p class="text-muted">Час</p>
            <p class="font-semibold text-gray-900">{{ formatDuration(routeData.routeData?.durationS) }}</p>
          </div>
        </div>

        <!-- Vehicle params -->
        <div v-if="vehicleParams" class="mt-2 pt-2 border-t border-border">
          <p class="text-xs text-muted mb-1">Параметри ТЗ</p>
          <div class="flex flex-col gap-0.5">
            <span v-for="p in vehicleParams" :key="p" class="text-xs text-gray-700">{{ p }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
