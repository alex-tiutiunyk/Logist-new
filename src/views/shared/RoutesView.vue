<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoutesStore } from '@/stores/routesStore.js'
import { useNotificationsStore } from '@/stores/notifications.js'
import RouteEditor from '@/components/map/RouteEditor.vue'
import LeafletMap from '@/components/map/LeafletMap.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'

const routesStore = useRoutesStore()
const notifStore = useNotificationsStore()

// ─── Loading ─────────────────────────────────────────────────────────────────

const isLoadingRoutes = ref(false)
const isLoadingLinks = ref(false)

onMounted(async () => {
  isLoadingRoutes.value = true
  isLoadingLinks.value = true
  await Promise.all([
    routesStore.fetchSavedRoutes().finally(() => { isLoadingRoutes.value = false }),
    routesStore.fetchRouteLinks().finally(() => { isLoadingLinks.value = false }),
  ])
})

// ─── Route Editor / Save Modal ────────────────────────────────────────────────

const pendingRouteData = ref(null) // holds { origin, destination, routeData } from RouteEditor emit
const showSaveModal = ref(false)
const saveTitle = ref('')
const isSaving = ref(false)

function onEditorSave(payload) {
  pendingRouteData.value = payload
  saveTitle.value = ''
  showSaveModal.value = true
}

async function confirmSaveRoute() {
  if (!pendingRouteData.value) return
  isSaving.value = true
  try {
    await routesStore.saveRoute({
      title: saveTitle.value.trim() || null,
      origin: pendingRouteData.value.origin,
      destination: pendingRouteData.value.destination,
      routeData: pendingRouteData.value.routeData,
    })
    notifStore.success('Маршрут збережено')
    showSaveModal.value = false
    pendingRouteData.value = null
  } catch (e) {
    notifStore.error('Помилка збереження маршруту')
  } finally {
    isSaving.value = false
  }
}

// ─── Route cards helpers ──────────────────────────────────────────────────────

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

function formatDate(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function routeTitle(route, idx) {
  return route.title || `Маршрут ${idx + 1}`
}

// ─── View route on map modal ──────────────────────────────────────────────────

const showViewModal = ref(false)
const viewingRoute = ref(null)

const viewPolyline = computed(() => {
  if (!viewingRoute.value?.routeData?.polylinePoints) return []
  return viewingRoute.value.routeData.polylinePoints
})

function openViewRoute(route) {
  viewingRoute.value = route
  showViewModal.value = true
}

// ─── Delete route ─────────────────────────────────────────────────────────────

const isDeletingRoute = ref(null) // id of route being deleted

async function deleteRoute(id) {
  isDeletingRoute.value = id
  try {
    await routesStore.deleteRoute(id)
    notifStore.success('Маршрут видалено')
  } catch (e) {
    notifStore.error('Помилка видалення')
  } finally {
    isDeletingRoute.value = null
  }
}

// ─── Copy route share link ─────────────────────────────────────────────────────

async function copyRouteLink(id) {
  const url = `${window.location.origin}/r/${id}`
  try {
    await navigator.clipboard.writeText(url)
    notifStore.success('Посилання скопійовано')
  } catch {
    // Fallback
    const ta = document.createElement('textarea')
    ta.value = url
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    notifStore.success('Посилання скопійовано')
  }
}

// ─── Route Links ─────────────────────────────────────────────────────────────

const newLinkForWhom = ref('')
const newLinkPeriod = ref('1 день')
const periodOptions = ['1 година', '1 день', '1 тиждень', '1 місяць']
const isCreatingLink = ref(false)

async function createLink() {
  if (!newLinkForWhom.value.trim()) {
    notifStore.error('Введіть для кого посилання')
    return
  }
  isCreatingLink.value = true
  try {
    await routesStore.createRouteLink({
      forWhom: newLinkForWhom.value.trim(),
      periodHours: newLinkPeriod.value,
    })
    notifStore.success('Посилання створено')
    newLinkForWhom.value = ''
    newLinkPeriod.value = '1 день'
  } catch (e) {
    notifStore.error('Помилка створення посилання')
  } finally {
    isCreatingLink.value = false
  }
}

function isLinkActive(link) {
  if (!link.expiresAt) return false
  const exp = link.expiresAt.toDate ? link.expiresAt.toDate() : new Date(link.expiresAt)
  return exp > new Date()
}

async function copyCalcLink(id) {
  const url = `${window.location.origin}/calc/${id}`
  try {
    await navigator.clipboard.writeText(url)
    notifStore.success('Посилання скопійовано')
  } catch {
    const ta = document.createElement('textarea')
    ta.value = url
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    notifStore.success('Посилання скопійовано')
  }
}

const isDeletingLink = ref(null)

async function deleteLink(id) {
  isDeletingLink.value = id
  try {
    await routesStore.deleteRouteLink(id)
    notifStore.success('Посилання видалено')
  } catch (e) {
    notifStore.error('Помилка видалення')
  } finally {
    isDeletingLink.value = null
  }
}

// ─── Link calculations (collapsible) ─────────────────────────────────────────

const expandedLinks = ref({}) // linkId → true/false
const linkCalculations = ref({}) // linkId → array
const loadingCalcs = ref({}) // linkId → true/false

async function toggleCalculations(linkId) {
  if (expandedLinks.value[linkId]) {
    expandedLinks.value[linkId] = false
    return
  }
  expandedLinks.value[linkId] = true
  if (!linkCalculations.value[linkId]) {
    loadingCalcs.value[linkId] = true
    try {
      linkCalculations.value[linkId] = await routesStore.fetchLinkCalculations(linkId)
    } finally {
      loadingCalcs.value[linkId] = false
    }
  }
}

function formatCalcDate(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function vehicleParamsText(vehicleParams) {
  if (!vehicleParams) return null
  const parts = []
  if (vehicleParams.heightCm) parts.push(`В: ${vehicleParams.heightCm} см`)
  if (vehicleParams.widthCm) parts.push(`Ш: ${vehicleParams.widthCm} см`)
  if (vehicleParams.lengthCm) parts.push(`Д: ${vehicleParams.lengthCm} см`)
  if (vehicleParams.grossWeightKg) parts.push(`Маса: ${vehicleParams.grossWeightKg} кг`)
  return parts.length ? parts.join(' · ') : null
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-xl font-bold text-gray-900">Маршрути</h1>
      <p class="text-sm text-muted mt-0.5">Розрахунок та збереження маршрутів</p>
    </div>

    <div class="flex flex-col lg:flex-row gap-6">

      <!-- ─── Left panel: Calculator + Saved routes ──────────────────────── -->
      <div class="flex-1 min-w-0 flex flex-col gap-6">

        <!-- Route Editor -->
        <div class="bg-surface border border-border rounded-xl p-4 lg:p-6">
          <h2 class="text-base font-semibold text-gray-900 mb-4">Калькулятор маршруту</h2>
          <RouteEditor :trip="null" :driver="null" @save="onEditorSave" />
        </div>

        <!-- Saved routes list -->
        <div class="bg-surface border border-border rounded-xl p-4 lg:p-6">
          <h2 class="text-base font-semibold text-gray-900 mb-4">Збережені маршрути</h2>

          <div v-if="isLoadingRoutes" class="flex justify-center py-8">
            <AppSpinner />
          </div>
          <div v-else-if="routesStore.savedRoutes.length === 0" class="text-center text-muted text-sm py-8">
            Збережених маршрутів немає
          </div>
          <div v-else class="flex flex-col gap-3">
            <div
              v-for="(route, idx) in routesStore.savedRoutes"
              :key="route.id"
              class="border border-border rounded-xl p-4 bg-bg"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-gray-900 truncate">{{ routeTitle(route, idx) }}</p>
                  <p class="text-xs text-muted mt-0.5 truncate">
                    {{ route.origin?.name || '—' }} → {{ route.destination?.name || '—' }}
                  </p>
                  <div class="flex items-center gap-3 mt-1.5 text-xs text-gray-600">
                    <span v-if="route.routeData?.distanceM" class="font-medium text-primary">
                      {{ formatDistance(route.routeData.distanceM) }}
                    </span>
                    <span v-if="route.routeData?.durationS" class="text-muted">
                      {{ formatDuration(route.routeData.durationS) }}
                    </span>
                    <span class="text-muted">{{ formatDate(route.createdAt) }}</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2 mt-3 flex-wrap">
                <button
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  @click="openViewRoute(route)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Переглянути
                </button>
                <button
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                  @click="copyRouteLink(route.id)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Посилання
                </button>
                <button
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                  :disabled="isDeletingRoute === route.id"
                  @click="deleteRoute(route.id)"
                >
                  <svg v-if="isDeletingRoute === route.id" class="animate-spin w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Видалити
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── Right panel: Client calculator links ───────────────────────── -->
      <div class="lg:w-[420px] xl:w-[480px] shrink-0 flex flex-col gap-4">
        <div class="bg-surface border border-border rounded-xl p-4 lg:p-6">
          <h2 class="text-base font-semibold text-gray-900 mb-4">Посилання для клієнтів</h2>

          <!-- Create link form -->
          <div class="flex flex-col gap-3 mb-6 pb-6 border-b border-border">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Для кого:</label>
              <input
                v-model="newLinkForWhom"
                type="text"
                placeholder="Назва клієнта або компанії"
                class="w-full px-3 py-2 rounded-lg border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Термін дії:</label>
              <select
                v-model="newLinkPeriod"
                class="w-full px-3 py-2 rounded-lg border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option v-for="opt in periodOptions" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </div>
            <AppButton variant="primary" :loading="isCreatingLink" @click="createLink">
              Створити посилання
            </AppButton>
          </div>

          <!-- Links list -->
          <div v-if="isLoadingLinks" class="flex justify-center py-6">
            <AppSpinner />
          </div>
          <div v-else-if="routesStore.routeLinks.length === 0" class="text-center text-muted text-sm py-6">
            Посилань ще немає
          </div>
          <div v-else class="flex flex-col gap-3">
            <div
              v-for="link in routesStore.routeLinks"
              :key="link.id"
              class="border border-border rounded-xl p-4 bg-bg"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-gray-900 truncate">{{ link.forWhom }}</p>
                  <p class="text-xs text-muted mt-0.5">
                    До: {{ formatDate(link.expiresAt) }}
                  </p>
                </div>
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0"
                  :class="isLinkActive(link)
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-600'"
                >
                  {{ isLinkActive(link) ? 'Активне' : 'Прострочено' }}
                </span>
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-2 mt-3 flex-wrap">
                <button
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                  @click="copyCalcLink(link.id)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Копіювати
                </button>
                <button
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  @click="toggleCalculations(link.id)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Розрахунки
                </button>
                <button
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                  :disabled="isDeletingLink === link.id"
                  @click="deleteLink(link.id)"
                >
                  <svg v-if="isDeletingLink === link.id" class="animate-spin w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Видалити
                </button>
              </div>

              <!-- Calculations subcollection -->
              <div v-if="expandedLinks[link.id]" class="mt-3 pt-3 border-t border-border">
                <p class="text-xs font-medium text-gray-700 mb-2">Розрахунки клієнта</p>
                <div v-if="loadingCalcs[link.id]" class="flex justify-center py-3">
                  <AppSpinner size="sm" />
                </div>
                <div v-else-if="!linkCalculations[link.id]?.length" class="text-xs text-muted py-2">
                  Розрахунків ще немає
                </div>
                <div v-else class="flex flex-col gap-2">
                  <div
                    v-for="calc in linkCalculations[link.id]"
                    :key="calc.id"
                    class="bg-surface border border-border rounded-lg p-3 text-xs"
                  >
                    <p class="font-medium text-gray-900 truncate">
                      {{ calc.origin?.name || '—' }} → {{ calc.destination?.name || '—' }}
                    </p>
                    <div class="flex flex-wrap gap-2 mt-1 text-muted">
                      <span v-if="calc.routeData?.distanceM" class="text-primary font-medium">
                        {{ formatDistance(calc.routeData.distanceM) }}
                      </span>
                      <span v-if="calc.routeData?.durationS">
                        {{ formatDuration(calc.routeData.durationS) }}
                      </span>
                    </div>
                    <p v-if="vehicleParamsText(calc.routeData?.vehicleParams)" class="text-muted mt-1 truncate">
                      {{ vehicleParamsText(calc.routeData.vehicleParams) }}
                    </p>
                    <p class="text-muted mt-1">{{ formatCalcDate(calc.calculatedAt) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Save Route Modal ─────────────────────────────────────────────────── -->
    <AppModal v-model="showSaveModal" title="Зберегти маршрут">
      <div class="flex flex-col gap-4">
        <p class="text-sm text-muted">
          {{ pendingRouteData?.origin?.name || '—' }} → {{ pendingRouteData?.destination?.name || '—' }}
        </p>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Назва маршруту (необов'язково)</label>
          <input
            v-model="saveTitle"
            type="text"
            placeholder="Наприклад: Київ — Одеса"
            class="w-full px-3 py-2 rounded-lg border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            @keydown.enter="confirmSaveRoute"
          />
        </div>
      </div>
      <template #footer>
        <div class="flex gap-2 justify-end">
          <AppButton variant="ghost" @click="showSaveModal = false">Скасувати</AppButton>
          <AppButton variant="primary" :loading="isSaving" @click="confirmSaveRoute">Зберегти</AppButton>
        </div>
      </template>
    </AppModal>

    <!-- ─── View Route on Map Modal ──────────────────────────────────────────── -->
    <AppModal v-model="showViewModal" :title="viewingRoute ? (viewingRoute.title || 'Перегляд маршруту') : 'Перегляд маршруту'">
      <div v-if="viewingRoute" class="flex flex-col gap-3">
        <div class="text-sm text-gray-700">
          <span class="font-medium">{{ viewingRoute.origin?.name || '—' }}</span>
          <span class="text-muted mx-1">→</span>
          <span class="font-medium">{{ viewingRoute.destination?.name || '—' }}</span>
        </div>
        <div class="flex items-center gap-4 text-sm">
          <span v-if="viewingRoute.routeData?.distanceM" class="font-semibold text-primary">
            {{ formatDistance(viewingRoute.routeData.distanceM) }}
          </span>
          <span v-if="viewingRoute.routeData?.durationS" class="text-muted">
            {{ formatDuration(viewingRoute.routeData.durationS) }}
          </span>
        </div>
        <div class="h-[380px] rounded-xl overflow-hidden border border-border">
          <LeafletMap :polyline="viewPolyline" />
        </div>
      </div>
    </AppModal>
  </div>
</template>
