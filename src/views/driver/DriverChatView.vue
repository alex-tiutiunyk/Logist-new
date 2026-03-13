<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useTripsStore } from '@/stores/trips.js'
import ChatWindow from '@/components/chat/ChatWindow.vue'

const authStore = useAuthStore()
const tripsStore = useTripsStore()

const trip = computed(() => tripsStore.currentTrip)
</script>

<template>
  <div class="h-full flex flex-col" style="height: calc(100vh - 56px - 72px);">
    <div v-if="!trip" class="flex-1 flex items-center justify-center text-muted text-sm">
      Активний рейс не знайдено
    </div>
    <ChatWindow
      v-else
      :trip-id="trip.id"
      :current-user-uid="authStore.user?.uid"
      current-user-role="driver"
      class="flex-1"
    />
  </div>
</template>
