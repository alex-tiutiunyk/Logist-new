import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ref as dbRef, push, onValue, off, serverTimestamp } from 'firebase/database'
import { collection, addDoc, serverTimestamp as fsTimestamp } from 'firebase/firestore'
import { rtdb } from '@/firebase/realtimeDb.js'
import { db } from '@/firebase/firestore.js'

export const useChatStore = defineStore('chat', () => {
  const messages = ref({})
  const unreadCounts = ref({})
  const activeChatTripId = ref(null)
  const _prevCount = {}
  const listeners = {}

  // Total unread across all trips (for driver bottom tab badge)
  const totalUnread = ref(0)

  function _recalcTotal() {
    totalUnread.value = Object.values(unreadCounts.value).reduce((s, n) => s + n, 0)
  }

  function setActiveChat(tripId) {
    activeChatTripId.value = tripId
    unreadCounts.value[tripId] = 0
    _recalcTotal()
  }

  function clearActiveChat() {
    activeChatTripId.value = null
  }

  function subscribeToChat(tripId, tripNumber = null) {
    if (listeners[tripId]) return

    const chatRef = dbRef(rtdb, `chat/${tripId}`)
    const listener = onValue(chatRef, (snapshot) => {
      const data = snapshot.val()
      const msgList = data
        ? Object.entries(data).map(([id, msg]) => ({ id, ...msg })).sort((a, b) => a.at - b.at)
        : []

      const prev = _prevCount[tripId] ?? msgList.length
      if (msgList.length > prev && activeChatTripId.value !== tripId) {
        unreadCounts.value[tripId] = (unreadCounts.value[tripId] || 0) + (msgList.length - prev)
        _recalcTotal()

        // Add notification event for new message
        const lastMsg = msgList[msgList.length - 1]
        if (lastMsg) {
          const tripLabel = tripNumber ? ` рейсу ${tripNumber}` : ''
          addDoc(collection(db, 'events'), {
            type: 'chat_message',
            title: `Нове повідомлення в чаті${tripLabel}`,
            description: lastMsg.text?.length > 100 ? lastMsg.text.slice(0, 100) + '…' : lastMsg.text,
            tripId,
            tripNumber: tripNumber || null,
            by: { uid: lastMsg.fromUid, name: lastMsg.fromName },
            at: fsTimestamp(),
          }).catch(() => {})
        }
      }
      _prevCount[tripId] = msgList.length
      messages.value[tripId] = msgList
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
      delete _prevCount[tripId]
    }
  }

  return {
    messages,
    unreadCounts,
    totalUnread,
    subscribeToChat,
    sendMessage,
    unsubscribeFromChat,
    setActiveChat,
    clearActiveChat,
  }
})
