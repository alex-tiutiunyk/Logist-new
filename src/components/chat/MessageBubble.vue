<script setup>
import { computed } from 'vue'

const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
  isOwn: {
    type: Boolean,
    default: false,
  },
})

const roleLabels = {
  driver: 'Водій',
  dispatcher: 'Диспетчер',
  logist: 'Логіст',
}

const formattedTime = computed(() => {
  if (!props.message.at) return ''
  const d = new Date(props.message.at)
  return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
})

const senderName = computed(() =>
  props.message.fromName || roleLabels[props.message.role] || 'Невідомий'
)
</script>

<template>
  <div
    class="flex flex-col"
    :class="isOwn ? 'items-end' : 'items-start'"
  >
    <!-- Sender name -->
    <span class="text-xs text-muted mb-0.5 px-1">{{ senderName }}</span>

    <!-- Bubble -->
    <div
      class="max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
      :class="isOwn
        ? 'bg-primary text-white rounded-tr-sm'
        : 'bg-bg border border-border text-gray-900 rounded-tl-sm'"
    >
      {{ message.text }}
    </div>

    <!-- Time -->
    <span
      class="text-[10px] mt-0.5 px-1"
      :class="isOwn ? 'text-muted' : 'text-muted'"
    >
      {{ formattedTime }}
    </span>
  </div>
</template>
