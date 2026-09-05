<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faRotate, faSpinner, faHeartPulse, faTriangleExclamation, faCode, faCheckCircle } from '@fortawesome/free-solid-svg-icons'
import { getHealth, ApiError } from '@/services'
import type { HealthResponse } from '@shared'

const health = ref<HealthResponse | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const lastFetched = ref<Date | null>(null)

async function fetchHealth() {
  loading.value = true
  error.value = null
  try {
    health.value = await getHealth()
    lastFetched.value = new Date()
  } catch (e) {
    error.value = e instanceof ApiError ? `${e.message} (HTTP ${e.status})` : e instanceof Error ? e.message : 'Unknown error'
  } finally {
    loading.value = false
  }
}

onMounted(fetchHealth)

const statusColor = computed(() => {
  if (!health.value) return 'bg-gray-400'
  return health.value.status === 'ok' ? 'bg-emerald-500' : 'bg-amber-500'
})

const uptimeLabel = computed(() => {
  if (!health.value) return '—'
  try {
    return new Date(health.value.uptime).toLocaleString()
  } catch {
    return String(health.value.uptime)
  }
})
</script>

<template>
  <div class="mx-auto max-w-xl">
    <!-- Hero -->
    <div class="text-center mb-8">
      <h1 class="text-3xl sm:text-4xl font-bold tracking-tight">Padel Play</h1>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Minimal health dashboard</p>
    </div>

    <!-- Health card -->
    <div class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      <div class="px-6 py-5 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3 min-w-0">
          <span class="relative flex h-2.5 w-2.5 shrink-0">
            <span :class="['animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', statusColor]"></span>
            <span :class="['relative inline-flex rounded-full h-2.5 w-2.5', statusColor]"></span>
          </span>
          <div class="min-w-0">
            <h2 class="text-sm font-semibold flex items-center gap-2">
              <FontAwesomeIcon :icon="faHeartPulse" class="text-emerald-500 text-[13px]" />
              API Health
              <code class="text-[11px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">/api/health</code>
            </h2>
            <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
              <span v-if="lastFetched">Updated {{ lastFetched.toLocaleTimeString() }}</span>
              <span v-else>—</span>
            </p>
          </div>
        </div>

        <button
          @click="fetchHealth"
          :disabled="loading"
          class="inline-flex items-center gap-1.5 shrink-0 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 text-sm font-medium hover:bg-black dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <FontAwesomeIcon :icon="loading ? faSpinner : faRotate" :spin="loading" class="h-3.5 w-3.5" />
          <span>{{ loading ? 'Refreshing…' : 'Refresh' }}</span>
        </button>
      </div>

      <!-- Content -->
      <div class="px-6 pb-6">
        <!-- Loading skeleton -->
        <div v-if="loading && !health && !error" class="animate-pulse space-y-3">
          <div class="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4"></div>
          <div class="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl"></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <p class="font-medium flex items-center gap-1.5">
            <FontAwesomeIcon :icon="faTriangleExclamation" />
            Failed to fetch health
          </p>
          <p class="mt-1 font-mono text-xs break-all">{{ error }}</p>
          <p class="mt-2 text-xs">Tip: run <code class="font-mono bg-red-100 dark:bg-red-900/40 px-1 rounded">pnpm build && pnpm pages:dev</code> locally.</p>
        </div>

        <!-- Success -->
        <div v-else-if="health" class="space-y-3">
          <div class="grid grid-cols-3 gap-3">
            <div class="rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 p-3">
              <div class="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <FontAwesomeIcon :icon="faCheckCircle" class="text-emerald-500" /> Status
              </div>
              <div class="mt-1 text-sm font-semibold capitalize">{{ health.status }}</div>
            </div>
            <div class="rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 p-3 col-span-2">
              <div class="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <FontAwesomeIcon :icon="faCode" /> Version
              </div>
              <div class="mt-1 text-sm font-mono">{{ health.version }}</div>
            </div>
          </div>

          <div class="rounded-xl bg-gray-950 dark:bg-black text-gray-100 p-4 overflow-auto">
            <div class="text-[11px] uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1.5">
              <FontAwesomeIcon :icon="faCode" /> Response
            </div>
            <pre class="text-xs font-mono leading-relaxed whitespace-pre-wrap break-all">{{ JSON.stringify(health, null, 2) }}</pre>
            <div class="mt-3 text-[11px] text-gray-400">Uptime marker: {{ uptimeLabel }}</div>
          </div>
        </div>

        <!-- Empty -->
        <div v-else class="text-sm text-gray-500 dark:text-gray-400 py-2">No data yet.</div>
      </div>
    </div>

    <p class="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
      Dark mode syncs with system &amp; persists in <code class="font-mono">localStorage</code>.
    </p>
  </div>
</template>
