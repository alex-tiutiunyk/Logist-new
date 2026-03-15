<script setup>
import { ref, watch } from 'vue'
import { autosuggest } from '@/services/here.js'

const props = defineProps({
  modelValue: {
    type: Object,
    default: null,
  },
  label: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: 'Введіть адресу...',
  },
})

const emit = defineEmits(['update:modelValue'])

const query = ref(props.modelValue?.name || '')
const suggestions = ref([])
const isLoading = ref(false)
const showDropdown = ref(false)
const inputEl = ref(null)
const dropdownStyle = ref({})

let debounceTimer = null

watch(() => props.modelValue, (val) => {
  if (val?.name && val.name !== query.value) {
    query.value = val.name
  }
})

function updateDropdownPosition() {
  if (!inputEl.value) return
  const rect = inputEl.value.getBoundingClientRect()
  dropdownStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    zIndex: 9999,
  }
}

function onInput() {
  clearTimeout(debounceTimer)
  if (props.modelValue) {
    emit('update:modelValue', null)
  }

  if (query.value.length < 3) {
    suggestions.value = []
    showDropdown.value = false
    return
  }

  debounceTimer = setTimeout(async () => {
    isLoading.value = true
    try {
      suggestions.value = await autosuggest(query.value)
      if (suggestions.value.length > 0) {
        updateDropdownPosition()
        showDropdown.value = true
      } else {
        showDropdown.value = false
      }
    } finally {
      isLoading.value = false
    }
  }, 350)
}

function onFocus() {
  if (suggestions.value.length > 0) {
    updateDropdownPosition()
    showDropdown.value = true
  }
}

function selectSuggestion(item) {
  query.value = item.title
  showDropdown.value = false
  suggestions.value = []
  emit('update:modelValue', {
    name: item.title,
    lat: item.position.lat,
    lng: item.position.lng,
  })
}

function onBlur() {
  setTimeout(() => {
    showDropdown.value = false
  }, 150)
}
</script>

<template>
  <div class="relative">
    <label v-if="label" class="block text-sm font-medium text-gray-700 mb-1">{{ label }}</label>

    <div class="relative">
      <input
        ref="inputEl"
        v-model="query"
        type="text"
        :placeholder="placeholder"
        class="w-full px-3 py-2 pr-9 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface"
        autocomplete="off"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
      />

      <div class="absolute inset-y-0 right-2.5 flex items-center pointer-events-none">
        <svg
          v-if="isLoading"
          class="animate-spin h-4 w-4 text-muted"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <svg
          v-else-if="modelValue?.lat"
          class="h-4 w-4 text-accent"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clip-rule="evenodd"
          />
        </svg>
      </div>
    </div>

    <!-- Dropdown teleported to body to escape overflow:hidden parents -->
    <Teleport to="body">
      <ul
        v-if="showDropdown && suggestions.length"
        :style="dropdownStyle"
        class="bg-surface border border-border rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto"
      >
        <li
          v-for="(item, idx) in suggestions"
          :key="idx"
          class="flex items-start gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-bg transition-colors text-sm"
          @mousedown.prevent="selectSuggestion(item)"
        >
          <svg
            class="w-4 h-4 mt-0.5 shrink-0 text-accent"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <div class="min-w-0">
            <p class="font-medium text-gray-900 truncate">{{ item.title }}</p>
            <p v-if="item.address?.label" class="text-xs text-muted truncate">{{ item.address.label }}</p>
          </div>
        </li>
      </ul>
    </Teleport>
  </div>
</template>
