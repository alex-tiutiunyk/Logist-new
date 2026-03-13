<script setup>
import { computed } from 'vue'
import { RouterView, useLink, useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { useTripsStore } from '@/stores/trips.js'

const authStore = useAuthStore()
const tripsStore = useTripsStore()
const route = useRoute()
const router = useRouter()

async function logout() {
  await authStore.logout()
  router.push('/login')
}

const tabs = [
  { name: 'driver-home',  label: 'Головна',    icon: 'home' },
  { name: 'driver-trip',  label: 'Рейс',       icon: 'truck' },
  { name: 'driver-route', label: 'Маршрут',    icon: 'map' },
  { name: 'driver-chat',  label: 'Диспетчер',  icon: 'chat' },
  { name: 'driver-docs',  label: 'Документи',  icon: 'doc' },
]

const tripNumber = computed(() => tripsStore.currentTrip?.number || '—')
</script>

<template>
  <div class="min-h-screen bg-bg flex flex-col max-w-screen-xs mx-auto">
    <!-- Top header -->
    <header class="fixed top-0 left-0 right-0 z-30 bg-primary text-white max-w-screen-xs mx-auto">
      <div class="flex items-center justify-between px-4 py-3">
        <div>
          <p class="text-xs opacity-70">Рейс</p>
          <p class="font-bold text-sm leading-tight">{{ tripNumber }}</p>
        </div>
        <span class="text-lg font-bold tracking-wide">ЛОГІСТ</span>
        <button
          class="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
          title="Вийти"
          @click="logout"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>

    <!-- Main content -->
    <main class="flex-1 mt-[56px] mb-[72px] overflow-y-auto">
      <RouterView />
    </main>

    <!-- Bottom tab bar -->
    <nav class="fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-border max-w-screen-xs mx-auto">
      <div class="flex">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.name"
          :to="{ name: tab.name }"
          custom
          v-slot="{ isActive, navigate }"
        >
          <button
            class="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors"
            :class="isActive ? 'text-primary' : 'text-muted'"
            @click="navigate"
          >
            <!-- Home icon -->
            <svg v-if="tab.icon === 'home'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <!-- Truck icon -->
            <svg v-if="tab.icon === 'truck'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM1 1h11l1 6H2L1 1zM12 7h5l3 6v4h-8V7z" />
            </svg>
            <!-- Map icon -->
            <svg v-if="tab.icon === 'map'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <!-- Chat icon -->
            <svg v-if="tab.icon === 'chat'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <!-- Doc icon -->
            <svg v-if="tab.icon === 'doc'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span class="text-[10px] font-medium">{{ tab.label }}</span>
          </button>
        </RouterLink>
      </div>
    </nav>
  </div>
</template>
