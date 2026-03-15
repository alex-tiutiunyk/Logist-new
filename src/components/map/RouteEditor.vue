<script setup>
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import AddressInput from '@/components/map/AddressInput.vue'
import { calculateTruckRoute } from '@/services/here.js'

// Fix Leaflet default icon path issue with Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

const props = defineProps({
  trip: {
    type: Object,
    default: null,
  },
  driver: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['save'])

// ─── Form state ───────────────────────────────────────────────────────────────

const origin = ref(null)
const destination = ref(null)

const vehicleParams = ref({
  heightCm: '',
  widthCm: '',
  lengthCm: '',
  grossWeightKg: '',
})

// ─── Route result ─────────────────────────────────────────────────────────────

const routeResult = ref(null) // { polyline, distanceM, durationS }
const isCalculating = ref(false)
const errorMsg = ref('')

// ─── Map refs ─────────────────────────────────────────────────────────────────

const mapEl = ref(null)
let map = null
let routeLayer = null
let originMarker = null
let destinationMarker = null

// ─── Computed ─────────────────────────────────────────────────────────────────

const canCalculate = computed(() =>
  origin.value?.lat && origin.value?.lng &&
  destination.value?.lat && destination.value?.lng
)

const formattedDistance = computed(() => {
  if (!routeResult.value) return null
  return (routeResult.value.distanceM / 1000).toFixed(1)
})

const formattedDuration = computed(() => {
  if (!routeResult.value) return null
  const totalMin = Math.round(routeResult.value.durationS / 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h}:${String(m).padStart(2, '0')}`
})

// ─── Init from trip prop ──────────────────────────────────────────────────────

function initFromTrip() {
  if (!props.trip) return

  const t = props.trip
  // Origin
  if (t.routeData?.origin) {
    origin.value = t.routeData.origin
  } else if (t.waypoints?.[0]) {
    origin.value = {
      name: t.waypoints[0].name,
      lat: t.waypoints[0].lat || null,
      lng: t.waypoints[0].lng || null,
    }
  }

  // Destination
  const lastWp = t.waypoints?.[t.waypoints.length - 1]
  if (t.routeData?.destination) {
    destination.value = t.routeData.destination
  } else if (lastWp) {
    destination.value = {
      name: lastWp.name,
      lat: lastWp.lat || null,
      lng: lastWp.lng || null,
    }
  }

  // Vehicle params
  if (t.routeData?.vehicleParams) {
    vehicleParams.value = { ...t.routeData.vehicleParams }
  }

  // Existing route data
  if (t.routeData?.polylinePoints) {
    routeResult.value = {
      polyline: t.routeData.polylinePoints,
      distanceM: t.routeData.distanceM || 0,
      durationS: t.routeData.durationS || 0,
    }
  }
}

// ─── Fill vehicle params from driver ─────────────────────────────────────────

function fillFromDriver(driver) {
  if (!driver) return
  vehicleParams.value = {
    heightCm: driver.heightCm ?? '',
    widthCm: driver.widthCm ?? '',
    lengthCm: driver.lengthCm ?? '',
    grossWeightKg: driver.weightEmpty != null && driver.maxLoadWeight != null
      ? driver.weightEmpty + driver.maxLoadWeight
      : '',
  }
}

watch(() => props.driver, (d) => {
  fillFromDriver(d)
}, { immediate: true })

// ─── Map init ─────────────────────────────────────────────────────────────────

function initMap() {
  if (map || !mapEl.value) return

  map = L.map(mapEl.value, { zoomControl: true })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  map.setView([50.45, 30.52], 6)

  // Draw existing route if available
  if (routeResult.value?.polyline?.length) {
    drawRoute(routeResult.value.polyline)
  }
}

function drawRoute(polylinePoints) {
  // Clear previous layers
  if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null }
  if (originMarker) { map.removeLayer(originMarker); originMarker = null }
  if (destinationMarker) { map.removeLayer(destinationMarker); destinationMarker = null }

  if (!polylinePoints || !polylinePoints.length) return

  // Draw polyline
  routeLayer = L.polyline(polylinePoints, {
    color: '#0f4c35',
    weight: 4,
    opacity: 0.85,
  }).addTo(map)

  // Origin marker (green)
  const greenIcon = L.divIcon({
    html: '<div style="width:14px;height:14px;border-radius:50%;background:#1D9E75;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>',
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
  const first = polylinePoints[0]
  originMarker = L.marker([first[0], first[1]], { icon: greenIcon })
    .addTo(map)
    .bindPopup(origin.value?.name || 'Звідки')

  // Destination marker (red)
  const redIcon = L.divIcon({
    html: '<div style="width:14px;height:14px;border-radius:50%;background:#dc2626;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>',
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
  const last = polylinePoints[polylinePoints.length - 1]
  destinationMarker = L.marker([last[0], last[1]], { icon: redIcon })
    .addTo(map)
    .bindPopup(destination.value?.name || 'Куди')

  map.fitBounds(routeLayer.getBounds(), { padding: [30, 30] })
}

onMounted(async () => {
  initFromTrip()
  fillFromDriver(props.driver)

  // Delay map init to allow modal animation to complete
  await nextTick()
  setTimeout(() => {
    initMap()
    if (map) {
      map.invalidateSize()
    }
  }, 100)
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})

// ─── Calculate route ──────────────────────────────────────────────────────────

async function calculate() {
  if (!canCalculate.value) return
  isCalculating.value = true
  errorMsg.value = ''

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
  } catch (e) {
    errorMsg.value = 'Помилка при розрахунку маршруту: ' + e.message
  } finally {
    isCalculating.value = false
  }
}

// ─── Save ─────────────────────────────────────────────────────────────────────

function save() {
  if (!origin.value || !destination.value) return

  const payload = {
    origin: origin.value,
    destination: destination.value,
    routeData: routeResult.value
      ? {
          polylinePoints: routeResult.value.polyline,
          distanceM: routeResult.value.distanceM,
          durationS: routeResult.value.durationS,
          vehicleParams: {
            heightCm: vehicleParams.value.heightCm ? Number(vehicleParams.value.heightCm) : null,
            widthCm: vehicleParams.value.widthCm ? Number(vehicleParams.value.widthCm) : null,
            lengthCm: vehicleParams.value.lengthCm ? Number(vehicleParams.value.lengthCm) : null,
            grossWeightKg: vehicleParams.value.grossWeightKg ? Number(vehicleParams.value.grossWeightKg) : null,
          },
          origin: origin.value,
          destination: destination.value,
        }
      : null,
  }

  emit('save', payload)
}
</script>

<template>
  <div class="flex flex-col gap-4">

    <!-- Address inputs -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <AddressInput v-model="origin" label="Звідки" placeholder="Введіть місто або адресу відправлення..." />
      <AddressInput v-model="destination" label="Куди" placeholder="Введіть місто або адресу призначення..." />
    </div>

    <!-- Vehicle dimensions -->
    <div class="bg-bg border border-border rounded-xl p-4">
      <h4 class="text-sm font-semibold text-gray-700 mb-3">Параметри транспортного засобу</h4>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label class="block text-xs font-medium text-muted mb-1">Висота (см)</label>
          <input
            v-model="vehicleParams.heightCm"
            type="number"
            placeholder="395"
            min="0"
            class="w-full px-3 py-2 rounded-lg border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-muted mb-1">Ширина (см)</label>
          <input
            v-model="vehicleParams.widthCm"
            type="number"
            placeholder="255"
            min="0"
            class="w-full px-3 py-2 rounded-lg border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-muted mb-1">Довжина (см)</label>
          <input
            v-model="vehicleParams.lengthCm"
            type="number"
            placeholder="1360"
            min="0"
            class="w-full px-3 py-2 rounded-lg border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-muted mb-1">Повна маса (кг)</label>
          <input
            v-model="vehicleParams.grossWeightKg"
            type="number"
            placeholder="40000"
            min="0"
            class="w-full px-3 py-2 rounded-lg border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>
    </div>

    <!-- Calculate button -->
    <div class="flex items-center gap-3">
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
        {{ isCalculating ? 'Розрахунок...' : 'Розрахувати маршрут' }}
      </button>

      <!-- Route info after calculation -->
      <div v-if="routeResult" class="flex items-center gap-4 text-sm">
        <span class="text-gray-700">
          <span class="font-semibold text-primary">{{ formattedDistance }} км</span>
        </span>
        <span class="text-gray-500">|</span>
        <span class="text-gray-700">
          <span class="font-semibold text-primary">{{ formattedDuration }} год</span>
        </span>
      </div>
    </div>

    <!-- Error message -->
    <p v-if="errorMsg" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
      {{ errorMsg }}
    </p>

    <!-- Map -->
    <div
      ref="mapEl"
      class="w-full rounded-xl border border-border overflow-hidden h-[280px] md:h-[380px]"
    />

    <!-- Save button -->
    <div class="flex justify-end pt-1">
      <button
        :disabled="!origin || !destination"
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent/90 transition-all focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="save"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        Зберегти маршрут
      </button>
    </div>
  </div>
</template>
