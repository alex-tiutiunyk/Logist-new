<script setup>
import { ref, onMounted, computed } from 'vue'
import { useTripsStore } from '@/stores/trips.js'
import { STATUS_LABELS } from '@/types/status.js'
import AppBadge from '@/components/common/AppBadge.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'

const tripsStore = useTripsStore()
const isLoading = ref(false)
const search = ref('')

onMounted(async () => {
  isLoading.value = true
  await tripsStore.fetchTrips()
  isLoading.value = false
})

const allContainers = computed(() => {
  const result = []
  for (const trip of tripsStore.trips) {
    for (const container of (trip.containers || [])) {
      result.push({
        ...container,
        tripNumber: trip.number,
        tripId: trip.id,
        tripStatus: trip.currentStatus,
        terminalReturnDate: container.terminalReturnDate,
      })
    }
  }
  return result
})

const filteredContainers = computed(() => {
  if (!search.value) return allContainers.value
  const q = search.value.toLowerCase()
  return allContainers.value.filter(c =>
    c.number?.toLowerCase().includes(q) ||
    c.tripNumber?.toLowerCase().includes(q) ||
    c.cargoDescription?.toLowerCase().includes(q)
  )
})

const containerTypeLabels = {
  '20ft': '20 фут', '40ft': '40 фут', '40ft_hc': '40 фут HC', '45ft': '45 фут',
}

function formatDate(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Контейнери</h1>
        <p class="text-sm text-muted mt-0.5">Всього контейнерів: {{ allContainers.length }}</p>
      </div>
    </div>

    <div>
      <input
        v-model="search"
        type="text"
        placeholder="Пошук за номером контейнера або рейсом..."
        class="px-3 py-2 rounded-lg border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 w-80"
      />
    </div>

    <div class="bg-surface border border-border rounded-xl overflow-hidden">
      <div v-if="isLoading" class="flex justify-center py-8"><AppSpinner /></div>
      <div v-else-if="filteredContainers.length === 0" class="text-center text-muted text-sm py-8">
        Контейнери не знайдено
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-bg border-b border-border">
            <tr>
              <th class="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-wide">Номер</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-wide">Тип</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-wide">Рейс</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-wide">Статус рейсу</th>
              <th class="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-wide">Повернення на термінал</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="container in filteredContainers" :key="container.id" class="hover:bg-bg transition-colors">
              <td class="px-6 py-4 font-mono font-semibold text-gray-900">{{ container.number }}</td>
              <td class="px-6 py-4 text-muted">{{ containerTypeLabels[container.type] || container.type }}</td>
              <td class="px-6 py-4 font-mono text-gray-700">{{ container.tripNumber }}</td>
              <td class="px-6 py-4">
                <AppBadge v-if="container.tripStatus" :status="container.tripStatus" />
                <span v-else class="text-muted">—</span>
              </td>
              <td class="px-6 py-4 text-muted">{{ formatDate(container.terminalReturnDate) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
