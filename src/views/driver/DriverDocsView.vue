<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTripsStore } from '@/stores/trips.js'
import AppSpinner from '@/components/common/AppSpinner.vue'

const tripsStore = useTripsStore()

const trip = computed(() => tripsStore.currentTrip)
const documents = ref([])
const isLoading = ref(false)

const docTypeLabels = {
  waybill: 'Товарно-транспортна накладна',
  cmr: 'CMR',
  customs_declaration: 'Митна декларація',
  invoice: 'Інвойс',
  packing_list: 'Пакувальний лист',
  arrival_note: 'Акт прийому',
  other: 'Інший документ',
}

const docStatusLabels = {
  pending: 'Очікує',
  uploaded: 'Завантажено',
  approved: 'Підтверджено',
  rejected: 'Відхилено',
}

const docStatusColors = {
  pending: 'text-amber-600 bg-amber-50',
  uploaded: 'text-blue-600 bg-blue-50',
  approved: 'text-green-600 bg-green-50',
  rejected: 'text-red-600 bg-red-50',
}

onMounted(async () => {
  if (trip.value) {
    isLoading.value = true
    const { getDocuments } = await import('@/services/firestore.js')
    documents.value = await getDocuments(trip.value.id)
    isLoading.value = false
  }
})
</script>

<template>
  <div class="p-4 flex flex-col gap-3">
    <h2 class="text-base font-semibold text-gray-900">Документи рейсу</h2>

    <div v-if="isLoading" class="flex justify-center py-8">
      <AppSpinner size="md" />
    </div>

    <div v-else-if="!trip" class="text-center text-muted text-sm py-8">
      Активний рейс не знайдено
    </div>

    <div v-else-if="documents.length === 0" class="text-center text-muted text-sm py-8">
      Документи відсутні
    </div>

    <div v-else class="flex flex-col gap-2">
      <div
        v-for="doc in documents"
        :key="doc.id"
        class="bg-surface border border-border rounded-xl p-4 flex items-center gap-3"
      >
        <div class="w-10 h-10 rounded-lg bg-bg flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">
            {{ docTypeLabels[doc.type] || doc.type }}
          </p>
          <span
            :class="['text-xs px-2 py-0.5 rounded-full font-medium', docStatusColors[doc.status] || 'text-gray-600 bg-gray-50']"
          >
            {{ docStatusLabels[doc.status] || doc.status }}
          </span>
        </div>

        <a
          v-if="doc.url"
          :href="doc.url"
          target="_blank"
          class="text-xs text-primary hover:underline shrink-0"
        >
          Переглянути
        </a>
      </div>
    </div>
  </div>
</template>
