import { ref } from 'vue'
import { api } from '@/lib/api'

export interface Court {
  id: number
  name: string
  location: string | null
  surface: string
  is_indoor: number
  hourly_price_cents: number
  created_at: string
}

export function useCourts() {
  const courts = ref<Court[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchCourts() {
    loading.value = true
    error.value = null
    try {
      const data = await api<{ courts: Court[] }>('/api/courts')
      courts.value = data.courts
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  async function createCourt(name: string) {
    const data = await api<{ court: Court }>('/api/courts', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
    courts.value.push(data.court)
    return data.court
  }

  return { courts, loading, error, fetchCourts, createCourt }
}
