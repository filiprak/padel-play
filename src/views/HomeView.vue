<script setup lang="ts">
import { ref, onMounted } from 'vue'
import HelloWorld from '@/components/HelloWorld.vue'

interface ApiResponse {
  message: string
  timestamp: string
}

const apiData = ref<ApiResponse | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

async function fetchHello() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch('/api/hello')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    apiData.value = (await res.json()) as ApiResponse
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unknown error'
  } finally {
    loading.value = false
  }
}

onMounted(fetchHello)
</script>

<template>
  <div class="home">
    <h1>Padel Play</h1>
    <p class="subtitle">Boilerplate SPA — Vite + Vue 3 + TypeScript + Cloudflare Functions</p>

    <HelloWorld msg="Welcome to Padel Play" />

    <section class="api-demo">
      <h2>API Demo <code>/api/hello</code></h2>
      <button :disabled="loading" @click="fetchHello">
        {{ loading ? 'Loading…' : 'Refetch' }}
      </button>
      <pre v-if="apiData" class="api-output">{{ JSON.stringify(apiData, null, 2) }}</pre>
      <p v-else-if="error" class="error">Error: {{ error }}</p>
      <p v-else-if="loading">Loading API…</p>
      <p v-else class="muted">No data yet. (Run <code>pnpm pages:dev</code> to test Functions locally)</p>
      <p class="hint">
        Dev: <code>pnpm dev</code> for SPA only, <code>pnpm build &amp;&amp; pnpm pages:dev</code> for full Pages +
        Functions.
      </p>
    </section>
  </div>
</template>

<style scoped>
.home h1 {
  font-size: 2.25rem;
  margin-bottom: 0.25rem;
}
.subtitle {
  color: #6b7280;
  margin-bottom: 1.5rem;
}
.api-demo {
  margin-top: 2rem;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: #f9fafb;
}
.api-demo h2 {
  font-size: 1.1rem;
  margin-bottom: 1rem;
}
.api-demo button {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid #d1d5db;
  background: white;
  cursor: pointer;
  font-weight: 600;
}
.api-demo button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.api-output {
  margin-top: 1rem;
  padding: 1rem;
  background: #111827;
  color: #a7f3d0;
  border-radius: 0.5rem;
  overflow: auto;
  font-size: 0.85rem;
}
.error {
  color: #dc2626;
  margin-top: 1rem;
}
.muted {
  color: #6b7280;
  margin-top: 1rem;
}
.hint {
  margin-top: 1rem;
  font-size: 0.8rem;
  color: #6b7280;
}
</style>
