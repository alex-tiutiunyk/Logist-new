<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterView, RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { useEventsStore } from '@/stores/events.js'

const authStore = useAuthStore()
const eventsStore = useEventsStore()
const router = useRouter()

const navItems = [
  { name: 'dispatcher-dashboard', label: 'Дашборд',   icon: 'grid' },
  { name: 'dispatcher-map',       label: 'Карта',      icon: 'map' },
  { name: 'dispatcher-trips',     label: 'Рейси',      icon: 'truck' },
  { name: 'dispatcher-drivers',   label: 'Водії',      icon: 'users' },
  { name: 'dispatcher-chat',      label: 'Чати',       icon: 'chat' },
]

onMounted(() => eventsStore.subscribe())
onUnmounted(() => eventsStore.unsubscribe())

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

function goToEvents() {
  eventsStore.markAllRead()
  router.push({ name: 'dispatcher-events' })
}
</script>

<template>
  <div class="min-h-screen bg-bg flex">
    <!-- Sidebar -->
    <aside class="hidden lg:flex flex-col w-60 bg-primary text-white shrink-0 fixed top-0 left-0 bottom-0 z-20">
      <!-- Logo -->
      <div class="px-6 py-5 border-b border-white/10">
        <span class="text-xl font-bold tracking-widest">ЛОГІСТ</span>
        <p class="text-xs text-white/60 mt-0.5">Диспетчер</p>
      </div>

      <!-- Nav -->
      <nav class="flex-1 px-3 py-4 flex flex-col gap-1">
        <RouterLink
          v-for="item in navItems"
          :key="item.name"
          :to="{ name: item.name }"
          custom
          v-slot="{ isActive, navigate }"
        >
          <button
            class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
            :class="isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'"
            @click="navigate"
          >
            <svg v-if="item.icon === 'grid'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <svg v-if="item.icon === 'map'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <svg v-if="item.icon === 'truck'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM1 1h11l1 6H2L1 1zM12 7h5l3 6v4h-8V7z" />
            </svg>
            <svg v-if="item.icon === 'users'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <svg v-if="item.icon === 'chat'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            {{ item.label }}
          </button>
        </RouterLink>
      </nav>

      <!-- User footer -->
      <div class="px-4 py-4 border-t border-white/10">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
            {{ authStore.user?.displayName?.[0] || 'Д' }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ authStore.user?.displayName || 'Диспетчер' }}</p>
            <p class="text-xs text-white/50 truncate">{{ authStore.user?.email }}</p>
          </div>
        </div>
        <button
          class="w-full text-xs text-white/60 hover:text-white transition-colors py-1.5 rounded-lg hover:bg-white/10 text-center"
          @click="handleLogout"
        >
          Вийти
        </button>
      </div>
    </aside>

    <!-- Main area -->
    <div class="flex-1 lg:ml-60 flex flex-col min-h-screen">
      <!-- Top header -->
      <header class="bg-surface border-b border-border px-6 py-4 sticky top-0 z-10">
        <div class="flex items-center justify-between">
          <h1 class="text-lg font-semibold text-gray-900">Диспетчер</h1>
          <div class="flex items-center gap-3">
            <!-- Bell icon -->
            <button
              class="relative p-2 rounded-lg hover:bg-bg transition-colors"
              :class="eventsStore.unreadCount > 0 ? 'text-primary' : 'text-muted'"
              @click="goToEvents"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span
                v-if="eventsStore.unreadCount > 0"
                class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center leading-none"
              >
                {{ eventsStore.unreadCount > 99 ? '99+' : eventsStore.unreadCount }}
              </span>
            </button>
            <span class="text-sm text-muted">{{ authStore.user?.email }}</span>
            <button class="text-sm text-primary hover:underline" @click="handleLogout">Вийти</button>
          </div>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
