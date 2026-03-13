import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNotificationsStore = defineStore('notifications', () => {
  const toasts = ref([])
  let nextId = 1

  function addToast(type, message, duration = 4000) {
    const id = nextId++
    toasts.value.push({ id, type, message, duration })
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }

  function removeToast(id) {
    const idx = toasts.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      toasts.value.splice(idx, 1)
    }
  }

  function success(message) {
    addToast('success', message)
  }

  function error(message) {
    addToast('error', message)
  }

  function warning(message) {
    addToast('warning', message)
  }

  function info(message) {
    addToast('info', message)
  }

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  }
})
