<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { ROLE_REDIRECTS } from '@/types/user.js'
import AuthLayout from '@/layouts/AuthLayout.vue'
import AppButton from '@/components/common/AppButton.vue'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const error = ref('')

async function handleLogin() {
  if (!email.value || !password.value) {
    error.value = 'Будь ласка, заповніть усі поля'
    return
  }
  isLoading.value = true
  error.value = ''
  const result = await authStore.login(email.value, password.value)
  isLoading.value = false
  if (result.success) {
    const redirect = ROLE_REDIRECTS[authStore.role] || '/login'
    router.push(redirect)
  } else {
    error.value = result.error
  }
}

const TEST_USERS = [
  { label: 'Водій', email: 'driver@test.com', password: 'password123' },
  { label: 'Диспетчер', email: 'dispatcher@test.com', password: 'password123' },
  { label: 'Логіст', email: 'logist@test.com', password: 'password123' },
]

function fillTestUser(user) {
  email.value = user.email
  password.value = user.password
}

async function handleGoogleLogin() {
  isLoading.value = true
  error.value = ''
  const result = await authStore.loginWithGoogle()
  isLoading.value = false
  if (result.success) {
    const redirect = ROLE_REDIRECTS[authStore.role] || '/login'
    router.push(redirect)
  } else {
    error.value = result.error
  }
}
</script>

<template>
  <AuthLayout>
    <h2 class="text-xl font-bold text-gray-900 mb-6 text-center">Вхід до системи</h2>

    <!-- Error -->
    <div
      v-if="error"
      class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
    >
      {{ error }}
    </div>

    <form @submit.prevent="handleLogin" class="flex flex-col gap-4">
      <!-- Email -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          v-model="email"
          type="email"
          placeholder="your@email.com"
          autocomplete="email"
          class="w-full px-3 py-2.5 rounded-lg border border-border bg-bg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        />
      </div>

      <!-- Password -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
        <div class="relative">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="••••••••"
            autocomplete="current-password"
            class="w-full px-3 py-2.5 pr-10 rounded-lg border border-border bg-bg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
          <button
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-gray-700 transition-colors"
            @click="showPassword = !showPassword"
          >
            <svg v-if="!showPassword" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Submit -->
      <AppButton
        type="submit"
        variant="primary"
        size="md"
        :loading="isLoading"
        class="w-full mt-2"
      >
        Увійти
      </AppButton>
    </form>

    <div class="relative my-4">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-border" />
      </div>
      <div class="relative flex justify-center text-xs">
        <span class="px-2 bg-surface text-muted">або</span>
      </div>
    </div>

    <!-- Test users -->
    <div class="mb-4">
      <p class="text-xs text-muted text-center mb-2">Тестові акаунти</p>
      <div class="flex gap-2">
        <button
          v-for="user in TEST_USERS"
          :key="user.email"
          type="button"
          class="flex-1 py-1.5 text-xs font-medium rounded-lg border border-border text-muted hover:border-primary hover:text-primary transition-colors"
          @click="fillTestUser(user)"
        >
          {{ user.label }}
        </button>
      </div>
    </div>

    <!-- Google -->
    <button
      class="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-gray-700 bg-surface hover:bg-gray-50 transition-colors"
      :disabled="isLoading"
      @click="handleGoogleLogin"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      Увійти через Google
    </button>
  </AuthLayout>
</template>
