<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTripsStore } from '@/stores/trips.js'
import { STATUS_LABELS, CUSTOMS_STATUSES, EMERGENCY_STATUSES } from '@/types/status.js'
import AppSpinner from '@/components/common/AppSpinner.vue'

const tripsStore = useTripsStore()
const isLoading = ref(false)

onMounted(async () => {
  isLoading.value = true
  await tripsStore.fetchTrips()
  isLoading.value = false
})

const trips = computed(() => tripsStore.trips)

const statusGroups = computed(() => {
  const groups = {
    'В дорозі': 0,
    'Завантаження': 0,
    'Митниця': 0,
    'Завершено': 0,
    'Аварія': 0,
  }
  trips.value.forEach(t => {
    if (EMERGENCY_STATUSES.includes(t.currentStatus)) groups['Аварія']++
    else if (CUSTOMS_STATUSES.includes(t.currentStatus)) groups['Митниця']++
    else if (t.currentStatus === 'trip_completed') groups['Завершено']++
    else if (['loading_started', 'loading_completed', 'unloading_started', 'unloading_completed'].includes(t.currentStatus)) groups['Завантаження']++
    else groups['В дорозі']++
  })
  return groups
})

const totalTrips = computed(() => trips.value.length || 1)

const donutSegments = computed(() => {
  const colors = {
    'В дорозі': '#2563eb',
    'Завантаження': '#d97706',
    'Митниця': '#7c3aed',
    'Завершено': '#059669',
    'Аварія': '#dc2626',
  }
  let offset = 0
  return Object.entries(statusGroups.value).map(([label, count]) => {
    const pct = (count / totalTrips.value) * 100
    const seg = { label, count, pct, color: colors[label], offset }
    offset += pct
    return seg
  })
})

const internationalCount = computed(() => trips.value.filter(t => t.isInternational).length)
const internationalPct = computed(() => trips.value.length
  ? Math.round((internationalCount.value / trips.value.length) * 100)
  : 0
)

const completedThisMonth = computed(() => {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  return trips.value.filter(t => {
    if (t.currentStatus !== 'trip_completed') return false
    const completedAt = t.completedAt?.toDate?.() || new Date(t.completedAt)
    return completedAt >= monthStart
  }).length
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-xl font-bold text-gray-900">Аналітика</h1>
      <p class="text-sm text-muted mt-0.5">Загальний огляд операцій</p>
    </div>

    <div v-if="isLoading" class="flex justify-center py-12">
      <AppSpinner size="lg" />
    </div>

    <template v-else>
      <!-- Stats row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-surface border border-border rounded-xl p-4">
          <p class="text-xs text-muted font-medium uppercase tracking-wide">Всього рейсів</p>
          <p class="text-3xl font-bold text-primary mt-1">{{ trips.length }}</p>
        </div>
        <div class="bg-surface border border-border rounded-xl p-4">
          <p class="text-xs text-muted font-medium uppercase tracking-wide">Міжнародні</p>
          <p class="text-3xl font-bold text-purple-600 mt-1">{{ internationalPct }}%</p>
          <p class="text-xs text-muted">{{ internationalCount }} з {{ trips.length }}</p>
        </div>
        <div class="bg-surface border border-border rounded-xl p-4">
          <p class="text-xs text-muted font-medium uppercase tracking-wide">Завершено (місяць)</p>
          <p class="text-3xl font-bold text-accent mt-1">{{ completedThisMonth }}</p>
        </div>
        <div class="bg-surface border border-border rounded-xl p-4">
          <p class="text-xs text-muted font-medium uppercase tracking-wide">Надзвичайні</p>
          <p class="text-3xl font-bold text-red-600 mt-1">{{ statusGroups['Аварія'] }}</p>
        </div>
      </div>

      <!-- Donut chart + legend -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- CSS Donut chart -->
        <div class="bg-surface border border-border rounded-xl p-6 flex flex-col gap-4">
          <h3 class="text-sm font-semibold text-gray-900">Розподіл за статусами</h3>
          <div class="flex items-center gap-6">
            <!-- SVG Donut -->
            <svg viewBox="0 0 36 36" class="w-32 h-32 -rotate-90">
              <circle cx="18" cy="18" r="15.9155" fill="transparent" stroke="#e8f0ec" stroke-width="3.5" />
              <circle
                v-for="(seg, idx) in donutSegments"
                :key="idx"
                cx="18" cy="18" r="15.9155"
                fill="transparent"
                :stroke="seg.color"
                stroke-width="3.5"
                :stroke-dasharray="`${seg.pct} ${100 - seg.pct}`"
                :stroke-dashoffset="`${100 - seg.offset}`"
              />
            </svg>
            <!-- Legend -->
            <div class="flex flex-col gap-2">
              <div
                v-for="seg in donutSegments"
                :key="seg.label"
                class="flex items-center gap-2 text-sm"
              >
                <span class="w-3 h-3 rounded-full shrink-0" :style="{ backgroundColor: seg.color }" />
                <span class="text-muted">{{ seg.label }}</span>
                <span class="font-semibold text-gray-900 ml-auto pl-2">{{ seg.count }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Driver workload -->
        <div class="bg-surface border border-border rounded-xl p-6">
          <h3 class="text-sm font-semibold text-gray-900 mb-4">Навантаження водіїв</h3>
          <div class="space-y-3">
            <div
              v-for="seg in donutSegments.filter(s => s.count > 0)"
              :key="seg.label"
            >
              <div class="flex items-center justify-between text-sm mb-1">
                <span class="text-muted">{{ seg.label }}</span>
                <span class="font-semibold text-gray-900">{{ Math.round(seg.pct) }}%</span>
              </div>
              <div class="w-full bg-border rounded-full h-2">
                <div
                  class="h-2 rounded-full transition-all duration-500"
                  :style="{ width: seg.pct + '%', backgroundColor: seg.color }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
