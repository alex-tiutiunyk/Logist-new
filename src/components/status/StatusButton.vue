<script setup>
import { ref, computed } from 'vue'
import { STATUS_LABELS, EMERGENCY_STATUSES, getStatusColor } from '@/types/status.js'
import AppModal from '@/components/common/AppModal.vue'

const props = defineProps({
  currentStatus: {
    type: String,
    required: true,
  },
  availableStatuses: {
    type: Array,
    default: () => [],
  },
  tripId: {
    type: String,
    required: true,
  },
  isUpdating: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['statusChange', 'sosTriggered'])

const showStatusModal = ref(false)
const showSosModal = ref(false)

const normalStatuses = computed(() =>
  props.availableStatuses.filter(s => !EMERGENCY_STATUSES.includes(s))
)

const statusColors = computed(() => getStatusColor(props.currentStatus))

function selectStatus(status) {
  showStatusModal.value = false
  emit('statusChange', status)
}

function triggerSOS(type) {
  showSosModal.value = false
  emit('sosTriggered', type)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Current status display + update button -->
    <button
      class="w-full min-h-[56px] rounded-2xl font-semibold text-base flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
      :class="[statusColors.bg, statusColors.text]"
      :disabled="isUpdating"
      @click="showStatusModal = true"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {{ STATUS_LABELS[currentStatus] || currentStatus }}
    </button>

    <!-- SOS button -->
    <button
      class="w-full min-h-[48px] bg-red-600 text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
      @click="showSosModal = true"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      SOS
    </button>

    <!-- Status modal -->
    <AppModal v-model="showStatusModal" title="Оновити статус">
      <div class="flex flex-col gap-2">
        <button
          v-for="status in normalStatuses"
          :key="status"
          class="w-full text-left px-4 py-3 rounded-xl border border-border hover:bg-bg hover:border-primary/30 transition-all text-sm font-medium text-gray-800"
          @click="selectStatus(status)"
        >
          {{ STATUS_LABELS[status] || status }}
        </button>
        <p v-if="normalStatuses.length === 0" class="text-sm text-muted text-center py-4">
          Немає доступних статусів
        </p>
      </div>
    </AppModal>

    <!-- SOS modal -->
    <AppModal v-model="showSosModal" title="Надзвичайна ситуація">
      <div class="flex flex-col gap-2">
        <button
          v-for="status in EMERGENCY_STATUSES"
          :key="status"
          class="w-full text-left px-4 py-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 transition-colors text-sm font-medium text-red-800"
          @click="triggerSOS(status)"
        >
          {{ STATUS_LABELS[status] || status }}
        </button>
      </div>
    </AppModal>
  </div>
</template>
