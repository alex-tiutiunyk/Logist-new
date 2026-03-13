import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  limit,
} from 'firebase/firestore'
import { db } from '@/firebase/firestore.js'

export const useEventsStore = defineStore('events', () => {
  const events = ref([])
  let _unsubscribe = null
  const lastReadAt = ref(parseInt(localStorage.getItem('events_last_read') || '0'))

  const unreadCount = computed(() => {
    return events.value.filter(e => {
      const at = e.at?.toMillis?.() ?? e.at?.toDate?.()?.getTime?.() ?? 0
      return at > lastReadAt.value
    }).length
  })

  function subscribe() {
    if (_unsubscribe) return
    const q = query(collection(db, 'events'), orderBy('at', 'desc'), limit(100))
    _unsubscribe = onSnapshot(q, (snap) => {
      events.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    })
  }

  function unsubscribe() {
    if (_unsubscribe) {
      _unsubscribe()
      _unsubscribe = null
    }
  }

  function markAllRead() {
    const now = Date.now()
    lastReadAt.value = now
    localStorage.setItem('events_last_read', now.toString())
  }

  async function addEvent(data) {
    try {
      await addDoc(collection(db, 'events'), {
        ...data,
        at: serverTimestamp(),
      })
    } catch (e) {
      console.error('Error adding event:', e)
    }
  }

  return {
    events,
    unreadCount,
    subscribe,
    unsubscribe,
    markAllRead,
    addEvent,
  }
})
