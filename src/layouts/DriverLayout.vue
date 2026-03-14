<script setup>
import { computed, watch } from 'vue'
import { RouterView, RouterLink, useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { useTripsStore } from '@/stores/trips.js'
import { useChatStore } from '@/stores/chat.js'

const authStore = useAuthStore()
const tripsStore = useTripsStore()
const chatStore = useChatStore()
const route = useRoute()
const router = useRouter()

const tabs = [
  { name: 'driver-home',  label: 'Головна',   icon: 'home' },
  { name: 'driver-trip',  label: 'Рейс',      icon: 'truck' },
  { name: 'driver-route', label: 'Маршрут',   icon: 'map' },
  { name: 'driver-chat',  label: 'Диспетчер', icon: 'chat' },
  { name: 'driver-docs',  label: 'Документи', icon: 'doc' },
]

const tripNumber = computed(() => tripsStore.currentTrip?.number || '—')

watch(() => tripsStore.currentTrip, (trip) => {
  if (trip?.id) chatStore.subscribeToChat(trip.id, trip.number)
}, { immediate: true })

async function logout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-bg flex">

    <!-- Sidebar: tablet + desktop -->
    <aside class="hidden md:flex flex-col w-56 bg-primary text-white shrink-0 fixed top-0 left-0 bottom-0 z-20">
      <div class="px-5 py-4 border-b border-white/10">
        <p class="text-xs text-white/60">Рейс</p>
        <p class="font-bold text-base leading-tight">{{ tripNumber }}</p>
      </div>

      <nav class="flex-1 px-2 py-3 flex flex-col gap-1 overflow-y-auto">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.name"
          :to="{ name: tab.name }"
          custom
          v-slot="{ isActive, navigate }"
        >
          <button
            class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
            :class="isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'"
            @click="navigate"
          >
            <!-- Home -->
            <svg v-if="tab.icon === 'home'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <!-- Truck -->
            <svg v-if="tab.icon === 'truck'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM1 1h11l1 6H2L1 1zM12 7h5l3 6v4h-8V7z" />
            </svg>
            <!-- Map -->
            <svg v-if="tab.icon === 'map'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <!-- Chat -->
            <span v-if="tab.icon === 'chat'" class="relative shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span v-if="chatStore.totalUnread > 0" class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500" />
            </span>
            <!-- Doc -->
            <svg v-if="tab.icon === 'doc'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {{ tab.label }}
          </button>
        </RouterLink>
      </nav>

      <div class="px-4 py-4 border-t border-white/10">
        <p class="text-xs text-white/50 truncate mb-2">{{ authStore.user?.email }}</p>
        <button
          class="w-full text-xs text-white/60 hover:text-white transition-colors py-1.5 rounded-lg hover:bg-white/10 text-center"
          @click="logout"
        >
          Вийти
        </button>
      </div>
    </aside>

    <!-- Main area -->
    <div class="flex-1 md:ml-56 flex flex-col min-h-screen">

      <!-- Top header -->
      <header class="sticky top-0 z-10 bg-primary text-white flex items-center justify-between px-4 py-3">
        <div>
          <p class="text-xs opacity-70">Рейс</p>
          <p class="font-bold text-sm leading-tight">{{ tripNumber }}</p>
        </div>
        <span class="text-base font-bold tracking-wide">ЛОГІСТ</span>
        <button class="p-2 rounded-lg hover:bg-white/10 transition-colors" @click="logout">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </header>

      <!-- Content -->
      <main
        class="flex-1 overflow-y-auto pb-[72px] md:pb-0"
        :style="{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }"
      >
        <RouterView />
      </main>

      <!-- Bottom nav: mobile only -->
      <nav
        class="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-surface border-t border-border"
        :style="{ paddingBottom: 'env(safe-area-inset-bottom)' }"
      >
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
              <svg v-if="tab.icon === 'home'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <svg v-if="tab.icon === 'truck'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM1 1h11l1 6H2L1 1zM12 7h5l3 6v4h-8V7z" />
              </svg>
              <svg v-if="tab.icon === 'map'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span v-if="tab.icon === 'chat'" class="relative">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span v-if="chatStore.totalUnread > 0" class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500" />
              </span>
              <svg v-if="tab.icon === 'doc'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span class="text-[10px] font-medium">{{ tab.label }}</span>
            </button>
          </RouterLink>
        </div>
      </nav>

    </div>
  </div>
</template>
