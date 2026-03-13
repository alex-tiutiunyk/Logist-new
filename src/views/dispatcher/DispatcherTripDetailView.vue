<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { useTripsStore } from '@/stores/trips.js'
import { useNotificationsStore } from '@/stores/notifications.js'
import { useEventsStore } from '@/stores/events.js'
import { EMERGENCY_STATUSES } from '@/types/status.js'
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppSpinner from '@/components/common/AppSpinner.vue'
import StatusTimeline from '@/components/status/StatusTimeline.vue'
import ChatWindow from '@/components/chat/ChatWindow.vue'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/firebase/firestore.js'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const tripsStore = useTripsStore()
const notifStore = useNotificationsStore()
const eventsStore = useEventsStore()

const tripId = computed(() => route.params.id)
const trip = computed(() => tripsStore.currentTrip)
const activeTab = ref('info')

const showEditModal = ref(false)
const showDeleteConfirm = ref(false)
const showEditConfirm = ref(false)
const isEditing = ref(false)
const isDeleting = ref(false)
const drivers = ref([])

const editForm = ref({
  number: '',
  driverUid: '',
  eta: '',
  isInternational: false,
  originName: '',
  destinationName: '',
})

let unsubscribe = null

const isSos = computed(() => trip.value && EMERGENCY_STATUSES.includes(trip.value.currentStatus))

const isExpired = computed(() => {
  if (!trip.value?.eta) return false
  const eta = trip.value.eta.toDate ? trip.value.eta.toDate() : new Date(trip.value.eta)
  return eta < new Date()
})

onMounted(async () => {
  await tripsStore.fetchTrip(tripId.value)
  unsubscribe = tripsStore.subscribeToTrip(tripId.value)
  try {
    const snap = await getDocs(collection(db, 'users'))
    drivers.value = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.role === 'driver')
  } catch (e) {}
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})

function openEdit() {
  if (!trip.value) return
  const t = trip.value
  editForm.value = {
    number: t.number || '',
    driverUid: t.driverUid || '',
    eta: t.eta ? formatDatetimeLocal(t.eta) : '',
    isInternational: t.isInternational || false,
    originName: t.waypoints?.[0]?.name || '',
    destinationName: t.waypoints?.[t.waypoints.length - 1]?.name || '',
  }
  showEditModal.value = true
}

function formatDatetimeLocal(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function requestEditConfirm() {
  showEditModal.value = false
  showEditConfirm.value = true
}

async function confirmEdit() {
  isEditing.value = true
  const driver = drivers.value.find(d => d.id === editForm.value.driverUid)
  const wp = trip.value.waypoints ? [...trip.value.waypoints] : []
  if (wp[0]) wp[0] = { ...wp[0], name: editForm.value.originName }
  if (wp[wp.length - 1]) wp[wp.length - 1] = { ...wp[wp.length - 1], name: editForm.value.destinationName }

  const result = await tripsStore.updateTrip(trip.value.id, {
    number: editForm.value.number,
    driverUid: editForm.value.driverUid,
    driverName: driver?.name || driver?.displayName || trip.value.driverName,
    eta: editForm.value.eta ? new Date(editForm.value.eta) : null,
    isInternational: editForm.value.isInternational,
    waypoints: wp,
  })
  if (result.success) {
    await eventsStore.addEvent({
      type: 'trip_edited',
      title: `Рейс ${editForm.value.number} відредаговано`,
      description: `${editForm.value.originName || '?'} → ${editForm.value.destinationName || '?'}`,
      tripId: trip.value.id,
      tripNumber: editForm.value.number,
      by: { uid: authStore.user?.uid, name: authStore.user?.displayName || 'Диспетчер' },
    })
    notifStore.success('Рейс оновлено')
  } else {
    notifStore.error('Помилка редагування')
  }
  showEditConfirm.value = false
  isEditing.value = false
}

async function doDelete() {
  isDeleting.value = true
  const tripNumber = trip.value?.number
  const result = await tripsStore.deleteTrip(trip.value.id)
  if (result.success) {
    await eventsStore.addEvent({
      type: 'trip_deleted',
      title: `Рейс ${tripNumber} видалено`,
      by: { uid: authStore.user?.uid, name: authStore.user?.displayName || 'Диспетчер' },
    })
    notifStore.success('Рейс видалено')
    router.push({ name: 'dispatcher-trips' })
  } else {
    notifStore.error('Помилка видалення')
  }
  isDeleting.value = false
}

const containerTypeLabels = {
  '20ft': '20 футів', '40ft': '40 футів', '40ft_hc': '40 футів HC', '45ft': '45 футів',
}

function formatDate(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div v-if="tripsStore.isLoading && !trip" class="flex justify-center py-12">
      <AppSpinner size="lg" />
    </div>

    <template v-else-if="trip">
      <!-- SOS Alert Banner -->
      <div
        v-if="isSos"
        class="flex items-center gap-3 px-5 py-3 rounded-xl bg-red-600 text-white animate-pulse"
      >
        <svg class="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <p class="font-bold text-sm">SOS — Надзвичайна ситуація</p>
          <p class="text-xs text-red-100">Поточний статус: {{ trip.currentStatus }}</p>
        </div>
      </div>

      <!-- Header -->
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-xl font-bold text-gray-900">Рейс {{ trip.number }}</h1>
          <p class="text-sm text-muted mt-0.5">{{ trip.driverName }}</p>
        </div>
        <div class="flex items-center gap-2">
          <span v-if="trip.isInternational" class="text-xs text-purple-600 font-medium bg-purple-50 border border-purple-200 px-2 py-1 rounded-full">Міжнародний</span>
          <AppBadge :status="trip.currentStatus" />
          <AppButton variant="ghost" size="sm" :disabled="isExpired" :title="isExpired ? 'Рейс прострочено' : ''" @click="openEdit">Редагувати</AppButton>
          <AppButton variant="danger" size="sm" @click="showDeleteConfirm = true">Видалити</AppButton>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex border-b border-border gap-4">
        <button
          v-for="tab in [
            { key: 'info', label: 'Інформація' },
            { key: 'timeline', label: 'Хронологія' },
            { key: 'containers', label: 'Контейнери' },
            { key: 'docs', label: 'Документи' },
            { key: 'chat', label: 'Чат' },
          ]"
          :key="tab.key"
          class="pb-3 text-sm font-medium border-b-2 transition-colors"
          :class="activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-gray-700'"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Info tab -->
      <div v-if="activeTab === 'info'" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="bg-surface border border-border rounded-xl p-5">
          <h3 class="text-sm font-semibold text-gray-900 mb-3">Основна інформація</h3>
          <dl class="flex flex-col gap-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-muted">Водій</dt>
              <dd class="font-medium text-gray-900">{{ trip.driverName || '—' }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted">ETA</dt>
              <dd class="font-medium text-gray-900">{{ formatDate(trip.eta) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted">Тип</dt>
              <dd class="font-medium text-gray-900">{{ trip.isInternational ? 'Міжнародний' : 'Внутрішній' }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted">Створено</dt>
              <dd class="font-medium text-gray-900">{{ formatDate(trip.createdAt) }}</dd>
            </div>
            <div v-if="isSos" class="flex justify-between mt-2 pt-2 border-t border-red-200">
              <dt class="text-red-600 font-semibold">Статус SOS</dt>
              <dd class="font-bold text-red-700">{{ trip.currentStatus }}</dd>
            </div>
          </dl>
        </div>

        <div class="bg-surface border border-border rounded-xl p-5">
          <h3 class="text-sm font-semibold text-gray-900 mb-3">Маршрут</h3>
          <div class="flex flex-col gap-2">
            <div v-for="(wp, idx) in trip.waypoints" :key="wp.id || idx" class="flex items-center gap-2 text-sm">
              <div class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                :class="wp.completed ? 'bg-accent text-white' : 'bg-border text-muted'"
              >{{ idx + 1 }}</div>
              <span class="text-gray-800">{{ wp.name }}</span>
              <span class="text-xs text-muted">({{ wp.type }})</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Timeline tab -->
      <div v-if="activeTab === 'timeline'">
        <StatusTimeline :status-log="trip.statusLog || []" :waypoints="trip.waypoints || []" />
      </div>

      <!-- Containers tab -->
      <div v-if="activeTab === 'containers'">
        <div v-if="trip.containers?.length" class="bg-surface border border-border rounded-xl overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-bg border-b border-border">
              <tr>
                <th class="text-left px-4 py-3 text-xs font-medium text-muted uppercase">Номер</th>
                <th class="text-left px-4 py-3 text-xs font-medium text-muted uppercase">Тип</th>
                <th class="text-left px-4 py-3 text-xs font-medium text-muted uppercase">Пломба</th>
                <th class="text-left px-4 py-3 text-xs font-medium text-muted uppercase">Вага</th>
                <th class="text-left px-4 py-3 text-xs font-medium text-muted uppercase">Вантаж</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="c in trip.containers" :key="c.id">
                <td class="px-4 py-3 font-mono font-semibold">{{ c.number }}</td>
                <td class="px-4 py-3 text-muted">{{ containerTypeLabels[c.type] || c.type }}</td>
                <td class="px-4 py-3 text-muted">{{ c.sealNumber || '—' }}</td>
                <td class="px-4 py-3 text-muted">{{ c.weight ? c.weight + ' кг' : '—' }}</td>
                <td class="px-4 py-3 text-gray-700">{{ c.cargoDescription || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="text-center text-muted text-sm py-8">Контейнери відсутні</p>
      </div>

      <!-- Docs tab -->
      <div v-if="activeTab === 'docs'" class="text-sm text-muted text-center py-8">
        Документи рейсу {{ trip.number }}
      </div>

      <!-- Chat tab -->
      <div v-if="activeTab === 'chat'" class="h-[500px]">
        <ChatWindow
          :trip-id="trip.id"
          :current-user-uid="authStore.user?.uid"
          current-user-role="dispatcher"
        />
      </div>
    </template>

    <div v-else class="text-center text-muted py-12">
      Рейс не знайдено
    </div>

    <!-- Edit modal -->
    <AppModal v-model="showEditModal" title="Редагувати рейс" persistent>
      <form class="flex flex-col gap-4" @submit.prevent="requestEditConfirm">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Номер рейсу</label>
            <input v-model="editForm.number" type="text" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Водій</label>
            <select v-model="editForm.driverUid" class="w-full px-3 py-2 rounded-lg border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Не призначено</option>
              <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.name || d.displayName || d.email }}</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Звідки</label>
            <input v-model="editForm.originName" type="text" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Куди</label>
            <input v-model="editForm.destinationName" type="text" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">ETA</label>
          <input v-model="editForm.eta" type="datetime-local" class="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div class="flex items-center gap-2">
          <input v-model="editForm.isInternational" type="checkbox" id="editIntl" class="rounded" />
          <label for="editIntl" class="text-sm text-gray-700">Міжнародний рейс</label>
        </div>
      </form>
      <template #footer>
        <div class="flex gap-2 justify-end">
          <AppButton variant="ghost" @click="showEditModal = false">Скасувати</AppButton>
          <AppButton variant="primary" @click="requestEditConfirm">Далі</AppButton>
        </div>
      </template>
    </AppModal>

    <!-- Edit confirm modal -->
    <AppModal v-model="showEditConfirm" title="Підтвердити зміни?">
      <p class="text-sm text-gray-700">
        Ви хочете зберегти зміни до рейсу <strong>{{ editForm.number }}</strong>?
        Рейс є активним — зміни набудуть сили негайно.
      </p>
      <template #footer>
        <div class="flex gap-2 justify-end">
          <AppButton variant="ghost" @click="showEditConfirm = false; showEditModal = true">Назад</AppButton>
          <AppButton variant="primary" :loading="isEditing" @click="confirmEdit">Підтвердити</AppButton>
        </div>
      </template>
    </AppModal>

    <!-- Delete confirm modal -->
    <AppModal v-model="showDeleteConfirm" title="Видалити рейс?">
      <p class="text-sm text-gray-700">
        Ви впевнені, що хочете видалити рейс <strong>{{ trip?.number }}</strong>? Цю дію не можна скасувати.
      </p>
      <template #footer>
        <div class="flex gap-2 justify-end">
          <AppButton variant="ghost" @click="showDeleteConfirm = false">Скасувати</AppButton>
          <AppButton variant="danger" :loading="isDeleting" @click="doDelete">Видалити</AppButton>
        </div>
      </template>
    </AppModal>
  </div>
</template>
