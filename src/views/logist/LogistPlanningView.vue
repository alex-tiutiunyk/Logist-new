<script setup>
import { ref, onMounted } from 'vue'
import { useTripsStore } from '@/stores/trips.js'
import { useNotificationsStore } from '@/stores/notifications.js'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/firebase/firestore.js'
import AppButton from '@/components/common/AppButton.vue'

const tripsStore = useTripsStore()
const notifStore = useNotificationsStore()

const drivers = ref([])
const isSubmitting = ref(false)

const form = ref({
  number: '',
  driverUid: '',
  driverName: '',
  origin: '',
  destination: '',
  isInternational: false,
  eta: '',
  containers: [],
})

onMounted(async () => {
  const snap = await getDocs(collection(db, 'users'))
  drivers.value = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(u => u.role === 'driver')
})

function addContainer() {
  form.value.containers.push({
    id: Date.now().toString(),
    number: '',
    type: '20ft',
    sealNumber: '',
    weight: '',
    cargoDescription: '',
  })
}

function removeContainer(idx) {
  form.value.containers.splice(idx, 1)
}

function onDriverChange() {
  const driver = drivers.value.find(d => d.id === form.value.driverUid)
  if (driver) {
    form.value.driverName = driver.name || driver.displayName || ''
  }
}

async function submitTrip() {
  if (!form.value.number || !form.value.origin || !form.value.destination) {
    notifStore.error('Заповніть обов\'язкові поля')
    return
  }
  isSubmitting.value = true
  const tripData = {
    number: form.value.number,
    driverUid: form.value.driverUid,
    driverName: form.value.driverName,
    isInternational: form.value.isInternational,
    eta: form.value.eta ? new Date(form.value.eta) : null,
    waypoints: [
      { id: '1', name: form.value.origin, type: 'loading', completed: false, arrivedAt: null, departedAt: null, lat: 0, lng: 0 },
      { id: '2', name: form.value.destination, type: 'unloading', completed: false, arrivedAt: null, departedAt: null, lat: 0, lng: 0 },
    ],
    containers: form.value.containers.map(c => ({
      ...c,
      weight: c.weight ? Number(c.weight) : 0,
    })),
    availableStatuses: [
      'en_route_to_loading', 'arrived_at_loading', 'loading_started',
      'loading_completed', 'departed', 'in_transit',
      ...(form.value.isInternational ? ['customs_arrived_at_border', 'customs_in_progress', 'customs_completed', 'customs_border_crossed'] : []),
      'arrived_at_unloading', 'unloading_started', 'unloading_completed',
      'documents_signed', 'en_route_to_terminal', 'arrived_at_terminal',
      'container_returned', 'trip_completed',
    ],
  }
  const result = await tripsStore.createTrip(tripData)
  isSubmitting.value = false
  if (result.success) {
    notifStore.success('Рейс створено успішно')
    form.value = { number: '', driverUid: '', driverName: '', origin: '', destination: '', isInternational: false, eta: '', containers: [] }
  } else {
    notifStore.error('Помилка створення рейсу')
  }
}

const containerTypes = [
  { value: '20ft', label: '20 футів' },
  { value: '40ft', label: '40 футів' },
  { value: '40ft_hc', label: '40 футів HC' },
  { value: '45ft', label: '45 футів' },
]
</script>

<template>
  <div class="flex flex-col gap-6 max-w-2xl">
    <div>
      <h1 class="text-xl font-bold text-gray-900">Планування рейсу</h1>
      <p class="text-sm text-muted mt-0.5">Створення нового маршруту</p>
    </div>

    <form class="flex flex-col gap-6" @submit.prevent="submitTrip">
      <!-- Basic info -->
      <div class="bg-surface border border-border rounded-xl p-5">
        <h3 class="text-sm font-semibold text-gray-900 mb-4">Основна інформація</h3>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Номер рейсу *</label>
            <input v-model="form.number" type="text" placeholder="TP-001" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Водій</label>
            <select v-model="form.driverUid" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white" @change="onDriverChange">
              <option value="">Оберіть водія</option>
              <option v-for="d in drivers" :key="d.id" :value="d.id">
                {{ d.name || d.displayName || d.email }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Звідки *</label>
            <input v-model="form.origin" type="text" placeholder="Київ" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Куди *</label>
            <input v-model="form.destination" type="text" placeholder="Одеса" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">ETA</label>
            <input v-model="form.eta" type="datetime-local" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div class="flex items-center gap-2 pt-6">
            <input v-model="form.isInternational" type="checkbox" id="isIntl" class="rounded border-border" />
            <label for="isIntl" class="text-sm text-gray-700">Міжнародний рейс</label>
          </div>
        </div>
      </div>

      <!-- Containers -->
      <div class="bg-surface border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-gray-900">Контейнери</h3>
          <AppButton variant="ghost" size="sm" type="button" @click="addContainer">
            + Додати контейнер
          </AppButton>
        </div>

        <div v-if="form.containers.length === 0" class="text-sm text-muted text-center py-4">
          Контейнери не додано
        </div>

        <div v-else class="flex flex-col gap-4">
          <div
            v-for="(container, idx) in form.containers"
            :key="container.id"
            class="p-4 bg-bg rounded-xl border border-border"
          >
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium text-gray-700">Контейнер {{ idx + 1 }}</span>
              <button type="button" class="text-red-500 hover:text-red-700 text-xs" @click="removeContainer(idx)">
                Видалити
              </button>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-muted mb-1">Номер контейнера</label>
                <input v-model="container.number" type="text" placeholder="ABCD1234567" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label class="block text-xs text-muted mb-1">Тип</label>
                <select v-model="container.type" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                  <option v-for="t in containerTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-muted mb-1">Номер пломби</label>
                <input v-model="container.sealNumber" type="text" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label class="block text-xs text-muted mb-1">Вага (кг)</label>
                <input v-model="container.weight" type="number" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div class="col-span-2">
                <label class="block text-xs text-muted mb-1">Опис вантажу</label>
                <input v-model="container.cargoDescription" type="text" placeholder="Промислове обладнання" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Submit -->
      <div class="flex justify-end">
        <AppButton type="submit" variant="primary" size="lg" :loading="isSubmitting">
          Створити рейс
        </AppButton>
      </div>
    </form>
  </div>
</template>
