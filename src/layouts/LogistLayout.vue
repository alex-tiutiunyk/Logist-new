<script setup>
import { onMounted, onUnmounted } from 'vue'
import { RouterView, RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { useEventsStore } from '@/stores/events.js'

const authStore = useAuthStore()
const eventsStore = useEventsStore()
const router = useRouter()

const navItems = [
  { name: 'logist-dashboard',  label: 'Аналітика',  icon: 'chart' },
  { name: 'logist-trips',      label: 'Рейси',      icon: 'truck' },
  { name: 'logist-planning',   label: 'Планування', icon: 'calendar' },
  { name: 'logist-routes',     label: 'Маршрути',   icon: 'map' },
  { name: 'logist-containers', label: 'Контейнери', icon: 'box' },
]

onMounted(() => eventsStore.subscribe())
onUnmounted(() => eventsStore.unsubscribe())

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

function goToEvents() {
  eventsStore.markAllRead()
  router.push({ name: 'logist-events' })
}
</script>

<template>
  <div class="min-h-screen bg-bg flex">

    <!-- Sidebar: md+ icon-only, lg+ full labels -->
    <aside class="hidden md:flex flex-col bg-primary text-white shrink-0 fixed top-0 left-0 bottom-0 z-20 w-16 lg:w-60 transition-all">
      <div class="px-3 lg:px-6 py-5 border-b border-white/10 flex items-center justify-center lg:justify-start">
        <span class="text-xl font-bold tracking-widest hidden lg:inline">ЛОГІСТ</span>
        <span class="text-xl font-bold lg:hidden">Л</span>
        <p class="text-xs text-white/60 mt-0.5 ml-2 hidden lg:block">Логіст</p>
      </div>

      <nav class="flex-1 px-2 py-4 flex flex-col gap-1">
        <RouterLink
          v-for="item in navItems"
          :key="item.name"
          :to="{ name: item.name }"
          custom
          v-slot="{ isActive, navigate }"
        >
          <button
            class="flex items-center justify-center lg:justify-start gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
            :class="isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'"
            :title="item.label"
            @click="navigate"
          >
            <svg v-if="item.icon === 'chart'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <svg v-if="item.icon === 'truck'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM1 1h11l1 6H2L1 1zM12 7h5l3 6v4h-8V7z" />
            </svg>
            <svg v-if="item.icon === 'calendar'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <svg v-if="item.icon === 'map'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <svg v-if="item.icon === 'box'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span class="hidden lg:inline">{{ item.label }}</span>
          </button>
        </RouterLink>
      </nav>

      <div class="px-2 lg:px-4 py-4 border-t border-white/10">
        <div class="hidden lg:flex items-center gap-3 mb-3">
          <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold shrink-0">
            {{ authStore.user?.displayName?.[0] || 'Л' }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ authStore.user?.displayName || 'Логіст' }}</p>
            <p class="text-xs text-white/50 truncate">{{ authStore.user?.email }}</p>
          </div>
        </div>
        <button
          class="w-full flex items-center justify-center gap-2 text-xs text-white/60 hover:text-white transition-colors py-1.5 rounded-lg hover:bg-white/10"
          :title="'Вийти'"
          @click="handleLogout"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span class="hidden lg:inline">Вийти</span>
        </button>
      </div>
    </aside>

    <!-- Main area -->
    <div class="flex-1 md:ml-16 lg:ml-60 flex flex-col min-h-screen">
      <!-- Top header -->
      <header class="bg-surface border-b border-border px-4 lg:px-6 py-3 sticky top-0 z-10">
        <div class="flex items-center justify-between">
          <h1 class="text-base lg:text-lg font-semibold text-gray-900">Логіст</h1>
          <div class="flex items-center gap-2 lg:gap-3">
            <button
              class="relative p-2 rounded-lg hover:bg-bg transition-colors"
              :class="eventsStore.unreadCount > 0 ? 'text-primary' : 'text-muted'"
              @click="goToEvents"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span v-if="eventsStore.unreadCount > 0"
                class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center leading-none"
              >{{ eventsStore.unreadCount > 99 ? '99+' : eventsStore.unreadCount }}</span>
            </button>
            <span class="hidden sm:inline text-sm text-muted">{{ authStore.user?.email }}</span>
            <button class="hidden sm:inline text-sm text-primary hover:underline" @click="handleLogout">Вийти</button>
          </div>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 p-3 lg:p-6 pb-[72px] md:pb-3 lg:pb-6">
        <RouterView />
      </main>
    </div>

    <!-- Bottom nav: mobile only -->
    <nav class="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-surface border-t border-border">
      <div class="flex">
        <RouterLink
          v-for="item in navItems"
          :key="item.name"
          :to="{ name: item.name }"
          custom
          v-slot="{ isActive, navigate }"
        >
          <button
            class="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors"
            :class="isActive ? 'text-primary' : 'text-muted'"
            @click="navigate"
          >
            <svg v-if="item.icon === 'chart'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <svg v-if="item.icon === 'truck'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM1 1h11l1 6H2L1 1zM12 7h5l3 6v4h-8V7z" />
            </svg>
            <svg v-if="item.icon === 'calendar'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <svg v-if="item.icon === 'map'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <svg v-if="item.icon === 'box'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span class="text-[10px] font-medium">{{ item.label }}</span>
          </button>
        </RouterLink>
      </div>
    </nav>

  </div>
</template>
