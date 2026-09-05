<script setup lang="ts">
import { RouterView } from 'vue-router'
import { ref, onMounted, watch } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons'
import Logo from './components/Logo.vue'

const isDark = ref(false)

function applyDark(v: boolean) {
  document.documentElement.classList.toggle('dark', v)
  localStorage.setItem('theme', v ? 'dark' : 'light')
}

function toggleDark() {
  isDark.value = !isDark.value
  applyDark(isDark.value)
}

onMounted(() => {
  const saved = localStorage.getItem('theme')
  if (saved === 'dark' || saved === 'light') {
    isDark.value = saved === 'dark'
  } else {
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  applyDark(isDark.value)
  // sync with system if no explicit choice
  const mql = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = (e: MediaQueryListEvent) => {
    if (!localStorage.getItem('theme')) {
      isDark.value = e.matches
      applyDark(e.matches)
    }
  }
  mql.addEventListener('change', handler)
})

// keep in sync if changed elsewhere
watch(isDark, (v) => applyDark(v))
</script>

<template>
  <div class="min-h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans antialiased transition-colors">
    <header class="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur">
      <div class="max-w-3xl mx-auto w-full px-6 py-3 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <Logo class="w-7 h-7 shrink-0" />
          <span class="font-semibold text-[17px] tracking-tight">Padel Play</span>
        </div>
        <button
          @click="toggleDark"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          class="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          <FontAwesomeIcon :icon="isDark ? faSun : faMoon" class="text-sm" />
        </button>
      </div>
    </header>

    <main class="flex-1 w-full max-w-3xl mx-auto px-6 py-10 sm:py-14">
      <RouterView />
    </main>
  </div>
</template>
