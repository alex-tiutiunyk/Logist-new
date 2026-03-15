<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useRoutesStore } from '@/stores/routesStore.js'
import { calculateTruckRoute } from '@/services/here.js'
import AddressInput from '@/components/map/AddressInput.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Fix Leaflet default icon path issue with Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

const route = useRoute()
const routesStore = useRoutesStore()

// ─── Link loading ─────────────────────────────────────────────────────────────

const isLoading = ref(true)
const linkData = ref(null)
const isExpired = ref(false)
const notFound = ref(false)

onMounted(async () => {
  try {
    const linkId = route.params.linkId
    const data = await routesStore.fetchRouteLinkById(linkId)
    if (!data) {
      notFound.value = true
    } else {
      const exp = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt)
      if (exp <= new Date()) {
        isExpired.value = true
      }
      linkData.value = data
    }
  } catch (e) {
    notFound.value = true
  } finally {
    isLoading.value = false
  }
})

// ─── Form state ───────────────────────────────────────────────────────────────

const origin = ref(null)
const destination = ref(null)

const vehicleParams = ref({
  heightCm: '',
  widthCm: '',
  lengthCm: '',
  grossWeightKg: '',
})

const routeResult = ref(null)
const isCalculating = ref(false)
const errorMsg = ref('')
const autoSaved = ref(false)

const canCalculate = computed(() =>
  origin.value?.lat && origin.value?.lng &&
  destination.value?.lat && destination.value?.lng
)

const formattedDistance = computed(() => {
  if (!routeResult.value) return null
  return (routeResult.value.distanceM / 1000).toFixed(1) + ' км'
})

const formattedDuration = computed(() => {
  if (!routeResult.value) return null
  const totalMin = Math.round(routeResult.value.durationS / 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h}:${String(m).padStart(2, '0')} год`
})

// ─── Map ─────────────────────────────────────────────────────────────────────

const mapEl = ref(null)
let map = null
let routeLayer = null
let originMarker = null
let destinationMarker = null

function initMap() {
  if (map || !mapEl.value) return
  map = L.map(mapEl.value, { zoomControl: true })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)
  map.setView([50.45, 30.52], 6)
}

function drawRoute(polylinePoints) {
  if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null }
  if (originMarker) { map.removeLayer(originMarker); originMarker = null }
  if (destinationMarker) { map.removeLayer(destinationMarker); destinationMarker = null }

  if (!polylinePoints || !polylinePoints.length) return

  const latLngs = polylinePoints.map(p => Array.isArray(p) ? p : [p.lat, p.lng])

  routeLayer = L.polyline(latLngs, {
    color: '#0f4c35',
    weight: 4,
    opacity: 0.85,
  }).addTo(map)

  const greenIcon = L.divIcon({
    html: '<div style="width:14px;height:14px;border-radius:50%;background:#1D9E75;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>',
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
  originMarker = L.marker(latLngs[0], { icon: greenIcon })
    .addTo(map)
    .bindPopup(origin.value?.name || 'Звідки')

  const redIcon = L.divIcon({
    html: '<div style="width:14px;height:14px;border-radius:50%;background:#dc2626;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>',
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
  destinationMarker = L.marker(latLngs[latLngs.length - 1], { icon: redIcon })
    .addTo(map)
    .bindPopup(destination.value?.name || 'Куди')

  map.fitBounds(routeLayer.getBounds(), { padding: [30, 30] })
}

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})

// Initialize map when component mounts (after link loads)
// We watch isLoading to init map once data is ready
watch(isLoading, async (val) => {
  if (!val && !notFound.value && !isExpired.value) {
    await nextTick()
    setTimeout(() => {
      initMap()
      if (map) map.invalidateSize()
    }, 100)
  }
})

// ─── Calculate ────────────────────────────────────────────────────────────────

async function calculate() {
  if (!canCalculate.value) return
  isCalculating.value = true
  errorMsg.value = ''
  autoSaved.value = false

  try {
    const params = {
      heightCm: vehicleParams.value.heightCm ? Number(vehicleParams.value.heightCm) : undefined,
      widthCm: vehicleParams.value.widthCm ? Number(vehicleParams.value.widthCm) : undefined,
      lengthCm: vehicleParams.value.lengthCm ? Number(vehicleParams.value.lengthCm) : undefined,
      grossWeightKg: vehicleParams.value.grossWeightKg ? Number(vehicleParams.value.grossWeightKg) : undefined,
    }

    const result = await calculateTruckRoute(
      { lat: origin.value.lat, lng: origin.value.lng },
      { lat: destination.value.lat, lng: destination.value.lng },
      params
    )

    if (!result) {
      errorMsg.value = 'Не вдалося розрахувати маршрут. Перевірте адреси або ключ API.'
      return
    }

    routeResult.value = result

    // Draw on map
    await nextTick()
    if (map) {
      map.invalidateSize()
      drawRoute(result.polyline)
    }

    // Auto-save to subcollection
    const vehicleParamsSaved = {
      heightCm: vehicleParams.value.heightCm ? Number(vehicleParams.value.heightCm) : null,
      widthCm: vehicleParams.value.widthCm ? Number(vehicleParams.value.widthCm) : null,
      lengthCm: vehicleParams.value.lengthCm ? Number(vehicleParams.value.lengthCm) : null,
      grossWeightKg: vehicleParams.value.grossWeightKg ? Number(vehicleParams.value.grossWeightKg) : null,
    }

    await routesStore.saveClientCalculation(route.params.linkId, {
      origin: origin.value,
      destination: destination.value,
      routeData: {
        polylinePoints: result.polyline.map(([lat, lng]) => ({ lat, lng })),
        distanceM: result.distanceM,
        durationS: result.durationS,
        vehicleParams: vehicleParamsSaved,
      },
    })
    autoSaved.value = true
  } catch (e) {
    errorMsg.value = 'Помилка при розрахунку маршруту: ' + e.message
  } finally {
    isCalculating.value = false
  }
}
</script>

<template>
  <!-- Loading -->
  <div v-if="isLoading" class="min-h-screen flex items-center justify-center bg-bg">
    <AppSpinner size="lg" />
  </div>

  <!-- Not found -->
  <div v-else-if="notFound" class="min-h-screen flex items-center justify-center bg-bg px-4">
    <div class="text-center">
      <svg class="w-16 h-16 mx-auto text-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
      <p class="text-lg font-semibold text-gray-900">Посилання недійсне або прострочено</p>
      <p class="text-sm text-muted mt-1">Зверніться до відправника для отримання нового посилання</p>
    </div>
  </div>

  <!-- Expired -->
  <div v-else-if="isExpired" class="min-h-screen flex items-center justify-center bg-bg px-4">
    <div class="text-center">
      <svg class="w-16 h-16 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-lg font-semibold text-gray-900">Посилання недійсне або прострочено</p>
      <p class="text-sm text-muted mt-1">Термін дії посилання вичерпано. Зверніться до відправника</p>
    </div>
  </div>

  <!-- Valid link -->
  <div v-else class="min-h-screen bg-bg flex flex-col">
    <!-- Header -->
    <header class="bg-surface border-b border-border px-4 lg:px-6 py-4 shrink-0">
      <div class="max-w-4xl mx-auto">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <h1 class="text-base font-semibold text-gray-900">
            Розрахунок маршруту для <span class="text-primary">{{ linkData?.forWhom }}</span>
          </h1>
        </div>
      </div>
    </header>

    <!-- Content -->
    <div class="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 lg:px-6 py-6 gap-6">

      <!-- Address inputs -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AddressInput v-model="origin" label="Звідки" placeholder="Введіть місто або адресу відправлення..." />
        <AddressInput v-model="destination" label="Куди" placeholder="Введіть місто або адресу призначення..." />
      </div>

      <!-- Vehicle dimensions -->
      <div class="bg-surface border border-border rounded-xl p-4">
        <h4 class="text-sm font-semibold text-gray-700 mb-3">Параметри транспортного засобу</h4>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label class="block text-xs font-medium text-muted mb-1">Висота (см)</label>
            <input
              v-model="vehicleParams.heightCm"
              type="number"
              placeholder="395"
              min="0"
              class="w-full px-3 py-2 rounded-lg border border-border text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-muted mb-1">Ширина (см)</label>
            <input
              v-model="vehicleParams.widthCm"
              type="number"
              placeholder="255"
              min="0"
              class="w-full px-3 py-2 rounded-lg border border-border text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-muted mb-1">Довжина (см)</label>
            <input
              v-model="vehicleParams.lengthCm"
              type="number"
              placeholder="1360"
              min="0"
              class="w-full px-3 py-2 rounded-lg border border-border text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-muted mb-1">Повна маса (кг)</label>
            <input
              v-model="vehicleParams.grossWeightKg"
              type="number"
              placeholder="40000"
              min="0"
              class="w-full px-3 py-2 rounded-lg border border-border text-sm bg-bg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      </div>

      <!-- Calculate button + result -->
      <div class="flex items-center gap-3 flex-wrap">
        <button
          :disabled="!canCalculate || isCalculating"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="calculate"
        >
          <svg
            v-if="isCalculating"
            class="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          {{ isCalculating ? 'Розрахунок...' : 'Розрахувати' }}
        </button>

        <div v-if="routeResult" class="flex items-center gap-4 text-sm">
          <span class="font-semibold text-primary">{{ formattedDistance }}</span>
          <span class="text-gray-500">|</span>
          <span class="font-semibold text-gray-700">{{ formattedDuration }}</span>
        </div>

        <span v-if="autoSaved" class="flex items-center gap-1.5 text-xs text-green-600 font-medium">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Збережено
        </span>
      </div>

      <!-- Error -->
      <p v-if="errorMsg" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
        {{ errorMsg }}
      </p>

      <!-- Map -->
      <div
        ref="mapEl"
        class="w-full rounded-xl border border-border overflow-hidden flex-1"
        style="min-height: 350px; height: calc(100vh - 520px); max-height: 600px;"
      />
    </div>
  </div>
</template>
