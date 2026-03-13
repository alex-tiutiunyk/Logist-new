<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix default icon paths for Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
})

const props = defineProps({
  center: {
    type: Array,
    default: () => [50.45, 30.52],
  },
  zoom: {
    type: Number,
    default: 10,
  },
  markers: {
    type: Array,
    default: () => [],
  },
  polyline: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['markerClick'])

const mapContainer = ref(null)
let map = null
let markersLayer = null
let polylineLayer = null

onMounted(() => {
  if (!mapContainer.value) return

  map = L.map(mapContainer.value).setView(props.center, props.zoom)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  markersLayer = L.layerGroup().addTo(map)
  renderMarkers()
  renderPolyline()
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})

function renderMarkers() {
  if (!markersLayer) return
  markersLayer.clearLayers()
  props.markers.forEach((m) => {
    if (!m.lat || !m.lng) return
    const marker = L.marker([m.lat, m.lng])
    if (m.popup) {
      marker.bindPopup(m.popup)
    } else if (m.label) {
      marker.bindPopup(`<span class="text-sm font-medium">${m.label}</span>`)
    }
    marker.on('click', () => emit('markerClick', m))
    markersLayer.addLayer(marker)
  })
}

function renderPolyline() {
  if (!map) return
  if (polylineLayer) {
    polylineLayer.remove()
    polylineLayer = null
  }
  if (props.polyline.length >= 2) {
    polylineLayer = L.polyline(props.polyline, {
      color: '#0f4c35',
      weight: 4,
      opacity: 0.7,
    }).addTo(map)
  }
}

watch(() => props.markers, renderMarkers, { deep: true })
watch(() => props.polyline, renderPolyline, { deep: true })
watch(() => props.center, (newCenter) => {
  if (map && newCenter) {
    map.setView(newCenter, props.zoom)
  }
})
</script>

<template>
  <div ref="mapContainer" class="w-full h-full" style="min-height: 300px;" />
</template>
