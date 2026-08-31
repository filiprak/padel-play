<script setup lang="ts">
import { ref, onMounted } from 'vue'
import HelloWorld from '@/components/HelloWorld.vue'
import { useCourts } from '@/composables/useCourts'

interface HealthResponse {
  status: string
  uptime: number
  version: string
}

const health = ref<HealthResponse | null>(null)
const healthLoading = ref(false)
const healthError = ref<string | null>(null)

async function fetchHealth() {
  healthLoading.value = true
  healthError.value = null
  try {
    const res = await fetch('/api/health')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    health.value = (await res.json()) as HealthResponse
  } catch (e) {
    healthError.value = e instanceof Error ? e.message : 'Unknown error'
  } finally {
    healthLoading.value = false
  }
}

// Courts via Turso
const { courts, loading: courtsLoading, error: courtsError, fetchCourts, createCourt } = useCourts()
const newCourtName = ref('')

async function handleCreateCourt() {
  if (!newCourtName.value.trim()) return
  try {
    await createCourt(newCourtName.value.trim())
    newCourtName.value = ''
  } catch (e) {
    courtsError.value = e instanceof Error ? e.message : String(e)
  }
}

onMounted(() => {
  fetchHealth()
  fetchCourts()
})
</script>

<template>
  <div class="home">
    <h1>Padel Play</h1>
    <p class="subtitle">Vite + Vue 3 + TypeScript + Cloudflare Functions + Turso</p>

    <HelloWorld msg="Welcome to Padel Play" />

    <section class="api-demo">
      <h2>Health <code>/api/health</code></h2>
      <button :disabled="healthLoading" @click="fetchHealth">
        {{ healthLoading ? 'Loading…' : 'Refetch' }}
      </button>
      <pre v-if="health" class="api-output">{{ JSON.stringify(health, null, 2) }}</pre>
      <p v-else-if="healthError" class="error">Error: {{ healthError }}</p>
      <p v-else-if="healthLoading">Loading…</p>
      <p v-else class="muted">No data yet.</p>
    </section>

    <section class="api-demo">
      <h2>Courts <code>/api/courts</code></h2>
      <p class="hint">Turso DB — requires <code>TURSO_DATABASE_URL</code> in <code>.dev.vars</code>. Run <code>pnpm db:init</code> to seed.</p>
      <div class="courts">
        <div class="courts-header">
          <h3>Courts ({{ courts.length }})</h3>
          <button :disabled="courtsLoading" @click="fetchCourts">{{ courtsLoading ? 'Loading…' : 'Refresh' }}</button>
        </div>
        <p v-if="courtsError" class="error">{{ courtsError }}</p>
        <ul v-else-if="courts.length" class="court-list">
          <li v-for="c in courts" :key="c.id">
            <strong>{{ c.name }}</strong> — {{ c.location || '—' }} · {{ c.surface }} · {{ c.is_indoor ? 'indoor' : 'outdoor' }} · €{{ (c.hourly_price_cents / 100).toFixed(2) }}/h
          </li>
        </ul>
        <p v-else-if="!courtsLoading" class="muted">No courts yet. Create one below or run <code>pnpm db:init</code>.</p>

        <form @submit.prevent="handleCreateCourt" class="create-form">
          <input v-model="newCourtName" placeholder="New court name" />
          <button type="submit">Create</button>
        </form>
        <p class="hint">Try: <code>curl /api/courts</code>, <code>curl -X POST /api/courts -d '{"name":"My Court"}' -H 'Content-Type: application/json'</code></p>
      </div>
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
.court-list {
  margin: 1rem 0;
  padding-left: 1.25rem;
}
.court-list li {
  margin: 0.25rem 0;
}
.create-form {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
}
.create-form input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
}
.create-form button {
  white-space: nowrap;
}
.courts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 1rem 0 0.5rem;
}
.courts-header h3 {
  margin: 0;
}
</style>
