<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faSpinner, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    message?: string
    confirmLabel?: string
    cancelLabel?: string
    loading?: boolean
  }>(),
  {
    message: '',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    loading: false,
  },
)

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open && !props.loading) emit('cancel')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

// Lock background scroll while the modal is open.
watch(
  () => props.open,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  },
  { immediate: true },
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
    >
      <div class="absolute inset-0 bg-black/50" @click="$emit('cancel')" aria-hidden="true"></div>
      <div
        class="relative w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl p-6"
      >
        <div class="flex items-start gap-3">
          <span
            class="inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
          >
            <FontAwesomeIcon :icon="faTriangleExclamation" />
          </span>
          <div class="min-w-0">
            <h2 class="text-base font-semibold">{{ title }}</h2>
            <p v-if="message" class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ message }}</p>
          </div>
        </div>
        <div class="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            @click="$emit('cancel')"
            :disabled="loading"
            class="rounded-full border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition"
          >
            {{ cancelLabel }}
          </button>
          <button
            type="button"
            @click="$emit('confirm')"
            :disabled="loading"
            class="inline-flex items-center gap-1.5 rounded-full bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition"
          >
            <FontAwesomeIcon v-if="loading" :icon="faSpinner" spin />
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
