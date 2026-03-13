<script setup>
import { computed } from 'vue'
import { STATUS_LABELS, getStatusColor } from '@/types/status.js'

const props = defineProps({
  status: {
    type: String,
    required: true,
  },
})

const label = computed(() => STATUS_LABELS[props.status] || props.status)
const colors = computed(() => getStatusColor(props.status))
</script>

<template>
  <span
    :class="[
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      colors.bg,
      colors.text,
    ]"
  >
    {{ label }}
  </span>
</template>
