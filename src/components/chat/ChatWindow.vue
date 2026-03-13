<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useChatStore } from '@/stores/chat.js'
import { useAuthStore } from '@/stores/auth.js'
import MessageBubble from './MessageBubble.vue'

const props = defineProps({
  tripId: {
    type: String,
    required: true,
  },
  currentUserUid: {
    type: String,
    required: true,
  },
  currentUserRole: {
    type: String,
    required: true,
  },
})

const chatStore = useChatStore()
const authStore = useAuthStore()

const messageText = ref('')
const messagesContainer = ref(null)
const isSending = ref(false)

const messages = computed(() => chatStore.messages[props.tripId] || [])

const quickReplies = [
  'Затримка на кордоні',
  'Підтверджую прибуття',
  'Потрібна допомога',
  'Проблема з документами',
]

onMounted(() => {
  chatStore.subscribeToChat(props.tripId)
})

onUnmounted(() => {
  chatStore.unsubscribeFromChat(props.tripId)
})

let prevCount = 0
watch(messages, (newMsgs) => {
  if (newMsgs.length > prevCount && prevCount > 0) {
    const lastMsg = newMsgs[newMsgs.length - 1]
    if (lastMsg.fromUid !== props.currentUserUid) {
      playBeep()
    }
  }
  prevCount = newMsgs.length
  scrollToBottom()
}, { deep: true })

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.frequency.value = 880
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.3)
  } catch (e) {
    // Audio not supported
  }
}

async function sendMessage(text) {
  const msg = text || messageText.value.trim()
  if (!msg) return
  isSending.value = true
  messageText.value = ''
  await chatStore.sendMessage(
    props.tripId,
    msg,
    props.currentUserUid,
    authStore.user?.displayName || props.currentUserRole,
    props.currentUserRole
  )
  isSending.value = false
}

function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}
</script>

<template>
  <div class="flex flex-col h-full bg-surface">
    <!-- Messages -->
    <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
      <div v-if="messages.length === 0" class="flex-1 flex items-center justify-center text-muted text-sm">
        Повідомлень немає. Розпочніть спілкування.
      </div>
      <MessageBubble
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
        :is-own="msg.fromUid === currentUserUid"
      />
    </div>

    <!-- Quick replies (driver only) -->
    <div v-if="currentUserRole === 'driver'" class="px-4 py-2 flex gap-2 overflow-x-auto border-t border-border">
      <button
        v-for="reply in quickReplies"
        :key="reply"
        class="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-bg border border-border text-gray-700 hover:bg-primary hover:text-white hover:border-primary transition-colors"
        @click="sendMessage(reply)"
      >
        {{ reply }}
      </button>
    </div>

    <!-- Input -->
    <div class="p-4 border-t border-border flex gap-2">
      <textarea
        v-model="messageText"
        rows="1"
        placeholder="Повідомлення..."
        class="flex-1 px-3 py-2 rounded-xl border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 bg-bg"
        style="max-height: 100px;"
        @keydown="handleKeydown"
      />
      <button
        class="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center shrink-0"
        :disabled="isSending || !messageText.trim()"
        @click="sendMessage()"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </div>
  </div>
</template>
