<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faPlus,
  faRotate,
  faSpinner,
  faTriangleExclamation,
  faCalendarDays,
} from '@fortawesome/free-solid-svg-icons'
import MatchCard from '@/components/MatchCard.vue'
import { listMatches, ApiError } from '@/services'
import type { MatchDto } from '@shared'

const matches = ref<MatchDto[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

async function fetchMatches() {
  loading.value = true
  error.value = null
  try {
    const res = await listMatches({ limit: 100, offset: 0 })
    matches.value = res.matches
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Unknown error'
  } finally {
    loading.value = false
  }
}

onMounted(fetchMatches)

/** Soonest upcoming first (backend already sends startsAt ascending). */
const upcoming = computed(() => {
  const now = Date.now()
  return matches.value.filter((m) => Date.parse(m.endsAt) >= now)
})

const past = computed(() => {
  const now = Date.now()
  return matches.value.filter((m) => Date.parse(m.endsAt) < now).reverse()
})
</script>

<template>
  <div class="mx-auto max-w-xl pb-24">
    <div class="text-center mb-8">
      <h1 class="text-3xl sm:text-4xl font-bold tracking-tight">Matches</h1>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Find a match, join the court</p>
    </div>

    <!-- Loading skeletons -->
    <div v-if="loading && matches.length === 0" class="animate-pulse space-y-4">
      <div v-for="i in [1, 2]" :key="i" class="h-44 bg-gray-100 dark:bg-gray-800 rounded-2xl"></div>
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300"
    >
      <p class="font-medium flex items-center gap-1.5">
        <FontAwesomeIcon :icon="faTriangleExclamation" />
        Failed to load matches
      </p>
      <p class="mt-1 font-mono text-xs break-all">{{ error }}</p>
      <button
        @click="fetchMatches"
        class="mt-3 inline-flex items-center gap-1.5 rounded-full bg-red-600 text-white px-4 py-1.5 text-sm font-medium hover:bg-red-700 transition"
      >
        <FontAwesomeIcon :icon="faRotate" class="h-3.5 w-3.5" />
        Retry
      </button>
    </div>

    <template v-else>
      <!-- Upcoming -->
      <section aria-label="Upcoming matches">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-3">
          <FontAwesomeIcon :icon="faCalendarDays" class="text-[13px]" />
          Upcoming
          <span v-if="upcoming.length > 0" class="font-normal normal-case">· {{ upcoming.length }}</span>
        </h2>
        <div v-if="upcoming.length > 0" class="space-y-4">
          <MatchCard v-for="m in upcoming" :key="m.id" :match="m" />
        </div>
        <div
          v-else
          class="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
        >
          No upcoming matches yet. Tap <span class="font-semibold">+</span> to create the first one.
        </div>
      </section>

      <!-- Past -->
      <section v-if="past.length > 0" aria-label="Past matches" class="mt-10">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
          Past · {{ past.length }}
        </h2>
        <div class="space-y-4 opacity-80">
          <MatchCard v-for="m in past" :key="m.id" :match="m" />
        </div>
      </section>
    </template>

    <!-- FAB: new match -->
    <RouterLink
      :to="{ name: 'match-new' }"
      aria-label="Add match"
      class="fixed bottom-6 right-6 z-20 inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg hover:bg-black dark:hover:bg-gray-100 active:scale-95 transition"
    >
      <FontAwesomeIcon :icon="loading ? faSpinner : faPlus" :spin="loading" class="text-lg" />
    </RouterLink>
  </div>
</template>
