<script setup>
import { ref, onMounted } from 'vue'
import { useNotificationsStore } from '@/stores/notifications.js'
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/firestore.js'
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'

const notifStore = useNotificationsStore()

const routes = ref([])
const isLoading = ref(false)
const showModal = ref(false)
const editingRoute = ref(null)
const isSaving = ref(false)

const form = ref({
  name: '',
  origin: '',
  destination: '',
  distance: '',
  waypoints: [],
})

onMounted(async () => {
  await loadRoutes()
})

async function loadRoutes() {
  isLoading.value = true
  try {
    const snap = await getDocs(collection(db, 'routes'))
    routes.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (e) {
    console.error(e)
  }
  isLoading.value = false
}

function openCreate() {
  editingRoute.value = null
  form.value = { name: '', origin: '', destination: '', distance: '', waypoints: [] }
  showModal.value = true
}

function openEdit(route) {
  editingRoute.value = route
  form.value = {
    name: route.name || '',
    origin: route.origin || '',
    destination: route.destination || '',
    distance: route.distance || '',
    waypoints: [...(route.waypoints || [])],
  }
  showModal.value = true
}

function addWaypoint() {
  form.value.waypoints.push({ id: Date.now().toString(), name: '', type: 'waypoint' })
}

function removeWaypoint(idx) {
  form.value.waypoints.splice(idx, 1)
}

async function saveRoute() {
  if (!form.value.name) {
    notifStore.error('Введіть назву маршруту')
    return
  }
  isSaving.value = true
  try {
    const data = {
      name: form.value.name,
      origin: form.value.origin,
      destination: form.value.destination,
      distance: form.value.distance ? Number(form.value.distance) : null,
      waypoints: form.value.waypoints,
      updatedAt: serverTimestamp(),
    }
    if (editingRoute.value) {
      await updateDoc(doc(db, 'routes', editingRoute.value.id), data)
      notifStore.success('Маршрут оновлено')
    } else {
      await addDoc(collection(db, 'routes'), { ...data, createdAt: serverTimestamp() })
      notifStore.success('Маршрут створено')
    }
    showModal.value = false
    await loadRoutes()
  } catch (e) {
    notifStore.error('Помилка збереження')
  }
  isSaving.value = false
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Маршрути</h1>
        <p class="text-sm text-muted mt-0.5">Бібліотека маршрутів</p>
      </div>
      <AppButton variant="primary" @click="openCreate">+ Новий маршрут</AppButton>
    </div>

    <div class="bg-surface border border-border rounded-xl overflow-hidden">
      <div v-if="isLoading" class="flex justify-center py-8"><AppSpinner /></div>
      <div v-else-if="routes.length === 0" class="text-center text-muted text-sm py-8">Маршрути відсутні</div>
      <table v-else class="w-full text-sm">
        <thead class="bg-bg border-b border-border">
          <tr>
            <th class="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-wide">Назва</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-wide">Звідки</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-wide">Куди</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-wide">Відстань</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-muted uppercase tracking-wide">Точки</th>
            <th class="px-6 py-3" />
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="route in routes" :key="route.id">
            <td class="px-6 py-4 font-medium text-gray-900">{{ route.name }}</td>
            <td class="px-6 py-4 text-muted">{{ route.origin || '—' }}</td>
            <td class="px-6 py-4 text-muted">{{ route.destination || '—' }}</td>
            <td class="px-6 py-4 text-muted">{{ route.distance ? route.distance + ' км' : '—' }}</td>
            <td class="px-6 py-4 text-muted">{{ route.waypoints?.length || 0 }}</td>
            <td class="px-6 py-4">
              <button class="text-primary hover:underline text-xs" @click="openEdit(route)">Редагувати</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AppModal v-model="showModal" :title="editingRoute ? 'Редагувати маршрут' : 'Новий маршрут'">
      <form class="flex flex-col gap-4" @submit.prevent="saveRoute">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Назва маршруту *</label>
          <input v-model="form.name" type="text" placeholder="Київ — Одеса" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Звідки</label>
            <input v-model="form.origin" type="text" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Куди</label>
            <input v-model="form.destination" type="text" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Відстань (км)</label>
          <input v-model="form.distance" type="number" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        <!-- Waypoints -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium text-gray-700">Проміжні точки</label>
            <button type="button" class="text-xs text-primary hover:underline" @click="addWaypoint">+ Додати</button>
          </div>
          <div class="flex flex-col gap-2">
            <div v-for="(wp, idx) in form.waypoints" :key="wp.id" class="flex gap-2 items-center">
              <input v-model="wp.name" type="text" placeholder="Назва точки" class="flex-1 px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <select v-model="wp.type" class="px-3 py-2 rounded-lg border border-border text-sm bg-white focus:outline-none">
                <option value="waypoint">Проміжна</option>
                <option value="loading">Завантаження</option>
                <option value="unloading">Розвантаження</option>
                <option value="terminal">Термінал</option>
              </select>
              <button type="button" class="text-red-500 hover:text-red-700" @click="removeWaypoint(idx)">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </form>
      <template #footer>
        <div class="flex gap-2 justify-end">
          <AppButton variant="ghost" @click="showModal = false">Скасувати</AppButton>
          <AppButton variant="primary" :loading="isSaving" @click="saveRoute">Зберегти</AppButton>
        </div>
      </template>
    </AppModal>
  </div>
</template>
