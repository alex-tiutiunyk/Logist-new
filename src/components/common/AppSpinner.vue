<script setup>
defineProps({
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  color: {
    type: String,
    default: 'primary',
  },
})

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-4',
}
</script>

<template>
  <div
    :class="[
      'rounded-full animate-spin border-solid border-t-transparent',
      sizeClasses[size],
      color === 'primary' ? 'border-primary' : 'border-accent',
    ]"
    role="status"
    aria-label="Завантаження..."
  />
</template>
