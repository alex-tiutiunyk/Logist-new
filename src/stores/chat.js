import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ref as dbRef, push, onValue, off, serverTimestamp } from 'firebase/database'
import { rtdb } from '@/firebase/realtimeDb.js'

export const useChatStore = defineStore('chat', () => {
  const messages = ref({})
  const notificationsCount = ref(0)
  const listeners = {}

  function subscribeToChat(tripId) {
    if (listeners[tripId]) return

    const chatRef = dbRef(rtdb, `chat/${tripId}`)
    const listener = onValue(chatRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        messages.value[tripId] = Object.entries(data).map(([id, msg]) => ({
          id,
          ...msg,
        })).sort((a, b) => a.at - b.at)
      } else {
        messages.value[tripId] = []
      }
    })
    listeners[tripId] = { ref: chatRef, listener }
  }

  async function sendMessage(tripId, text, fromUid, fromName, role) {
    try {
      const chatRef = dbRef(rtdb, `chat/${tripId}`)
      await push(chatRef, {
        text,
        fromUid,
        fromName,
        role,
        at: Date.now(),
      })
      return { success: true }
    } catch (e) {
      console.error('Error sending message:', e)
      return { success: false, error: e.message }
    }
  }

  function unsubscribeFromChat(tripId) {
    if (listeners[tripId]) {
      off(listeners[tripId].ref)
      delete listeners[tripId]
    }
  }

  function incrementNotifications() {
    notificationsCount.value++
  }

  function clearNotifications() {
    notificationsCount.value = 0
  }

  return {
    messages,
    notificationsCount,
    subscribeToChat,
    sendMessage,
    unsubscribeFromChat,
    incrementNotifications,
    clearNotifications,
  }
})
