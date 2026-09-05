<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faArrowLeft, faSpinner, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { listPlaces, createPlace, listUsers, createMatch, ApiError } from '@/services'
import type { MatchTeam, PlaceDto, UserDto } from '@shared'

const router = useRouter()

const places = ref<PlaceDto[]>([])
const users = ref<UserDto[]>([])
const loadingOptions = ref(true)
const loadError = ref<string | null>(null)

const useNewPlace = ref(false)
const placeId = ref<number | ''>('')
const newPlaceName = ref('')
const newPlaceLocation = ref('')

const matchDate = ref('')
const startTime = ref('18:00')
const durationMin = ref(90)

/** Four slots: two per team. '' = open spot, otherwise a user id as string. */
const slots = ref<{ team: MatchTeam; userId: string }[]>([
  { team: 1, userId: '' },
  { team: 1, userId: '' },
  { team: 2, userId: '' },
  { team: 2, userId: '' },
])

const submitting = ref(false)
const submitError = ref<string | null>(null)
const formError = ref<string | null>(null)

function defaultDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function loadOptions() {
  loadingOptions.value = true
  loadError.value = null
  try {
    const [p, u] = await Promise.all([listPlaces({ limit: 100 }), listUsers({ limit: 100 })])
    places.value = p.places
    users.value = u.users
  } catch (e) {
    loadError.value = e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Unknown error'
  } finally {
    loadingOptions.value = false
  }
}

onMounted(() => {
  matchDate.value = defaultDate()
  void loadOptions()
})

/** Users already picked in other slots are hidden from each dropdown. */
function optionsFor(index: number): UserDto[] {
  const taken = new Set(slots.value.filter((_, i) => i !== index).map((s) => s.userId).filter((id) => id !== ''))
  return users.value.filter((u) => !taken.has(String(u.id)))
}

const pickedCount = computed(() => slots.value.filter((s) => s.userId !== '').length)

function validate(): string | null {
  if (!useNewPlace.value && placeId.value === '') return 'Choose a place for the match.'
  if (useNewPlace.value && newPlaceName.value.trim().length < 2) return 'New place needs a name (min 2 characters).'
  if (!matchDate.value || !startTime.value) return 'Pick a date and start time.'
  const start = new Date(`${matchDate.value}T${startTime.value}`)
  if (Number.isNaN(start.getTime())) return 'Start date/time is invalid.'
  if (pickedCount.value === 0) return 'Assign at least one player.'
  return null
}

async function onSubmit() {
  submitError.value = null
  const invalid = validate()
  if (invalid) {
    formError.value = invalid
    return
  }
  formError.value = null
  submitting.value = true
  try {
    let resolvedPlaceId: number
    if (useNewPlace.value) {
      const created = await createPlace({
        name: newPlaceName.value.trim(),
        location: newPlaceLocation.value.trim() || undefined,
      })
      resolvedPlaceId = created.place.id
    } else {
      resolvedPlaceId = placeId.value as number
    }

    const start = new Date(`${matchDate.value}T${startTime.value}`)
    const end = new Date(start.getTime() + durationMin.value * 60_000)
    await createMatch({
      placeId: resolvedPlaceId,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      players: slots.value
        .filter((s) => s.userId !== '')
        .map((s) => ({ userId: Number(s.userId), team: s.team })),
    })
    await router.push({ name: 'home' })
  } catch (e) {
    submitError.value = e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Unknown error'
  } finally {
    submitting.value = false
  }
}

const inputClass =
  'w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm outline-none focus:border-gray-900 dark:focus:border-gray-300 focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10 transition disabled:opacity-50'
</script>

<template>
  <div class="mx-auto max-w-xl">
    <RouterLink
      :to="{ name: 'home' }"
      class="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition mb-6"
    >
      <FontAwesomeIcon :icon="faArrowLeft" class="text-xs" />
      All matches
    </RouterLink>

    <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">New match</h1>
    <p class="mt-1.5 text-sm text-gray-600 dark:text-gray-400">2 vs 2 — leave slots empty for open spots.</p>

    <div
      v-if="loadError"
      class="mt-6 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300"
    >
      <p class="font-medium flex items-center gap-1.5">
        <FontAwesomeIcon :icon="faTriangleExclamation" />
        Failed to load places and players
      </p>
      <p class="mt-1 font-mono text-xs break-all">{{ loadError }}</p>
      <button
        @click="loadOptions"
        class="mt-3 rounded-full bg-red-600 text-white px-4 py-1.5 text-sm font-medium hover:bg-red-700 transition"
      >
        Retry
      </button>
    </div>

    <form v-else @submit.prevent="onSubmit" class="mt-6 space-y-6">
      <!-- Place -->
      <fieldset :disabled="loadingOptions || submitting" class="space-y-3">
        <legend class="text-sm font-semibold">Place</legend>
        <div v-if="!useNewPlace" class="space-y-2">
          <select v-model.number="placeId" :class="inputClass" aria-label="Place">
            <option :value="''" disabled>Select a place…</option>
            <option v-for="p in places" :key="p.id" :value="p.id">
              {{ p.name }}{{ p.location ? ` · ${p.location}` : '' }}
            </option>
          </select>
          <button
            v-if="places.length > 0"
            type="button"
            @click="useNewPlace = true"
            class="text-[13px] text-gray-500 dark:text-gray-400 underline underline-offset-2 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Or add a new place
          </button>
          <p v-else class="text-[13px] text-gray-500 dark:text-gray-400">
            No places yet —
            <button
              type="button"
              @click="useNewPlace = true"
              class="underline underline-offset-2 hover:text-gray-900 dark:hover:text-gray-100"
            >
              add the first one
            </button>
          </p>
        </div>
        <div v-else class="space-y-2 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5">
          <input v-model="newPlaceName" :class="inputClass" placeholder="Place name" aria-label="New place name" />
          <input
            v-model="newPlaceLocation"
            :class="inputClass"
            placeholder="Location (optional)"
            aria-label="New place location"
          />
          <button
            v-if="places.length > 0"
            type="button"
            @click="useNewPlace = false"
            class="text-[13px] text-gray-500 dark:text-gray-400 underline underline-offset-2 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Choose an existing place instead
          </button>
        </div>
      </fieldset>

      <!-- Date & time -->
      <fieldset :disabled="submitting" class="space-y-3">
        <legend class="text-sm font-semibold">Date &amp; time</legend>
        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="mb-1 block text-xs text-gray-500 dark:text-gray-400">Date</span>
            <input v-model="matchDate" type="date" :class="inputClass" />
          </label>
          <label class="block">
            <span class="mb-1 block text-xs text-gray-500 dark:text-gray-400">Start</span>
            <input v-model="startTime" type="time" :class="inputClass" />
          </label>
        </div>
        <label class="block">
          <span class="mb-1 block text-xs text-gray-500 dark:text-gray-400">Duration</span>
          <select v-model.number="durationMin" :class="inputClass">
            <option :value="60">60 min</option>
            <option :value="90">90 min</option>
            <option :value="120">120 min</option>
          </select>
        </label>
      </fieldset>

      <!-- Players -->
      <fieldset :disabled="loadingOptions || submitting" class="space-y-3">
        <legend class="text-sm font-semibold">Players <span class="font-normal text-gray-500">· {{ pickedCount }}/4</span></legend>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            v-for="(team, ti) in [1, 2]"
            :key="team"
            class="rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 p-3 space-y-2"
          >
            <p class="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">
              Team {{ team }}
            </p>
            <select
              v-for="slotIndex in [ti * 2, ti * 2 + 1]"
              :key="slotIndex"
              v-model="slots[slotIndex]!.userId"
              :class="inputClass"
              :aria-label="`Team ${team} player ${slotIndex % 2 === 0 ? 1 : 2}`"
            >
              <option value="">Open spot</option>
              <option v-for="u in optionsFor(slotIndex)" :key="u.id" :value="String(u.id)">
                {{ u.name }}
              </option>
            </select>
          </div>
        </div>
        <p v-if="users.length === 0 && !loadingOptions" class="text-[13px] text-gray-500 dark:text-gray-400">
          No users yet — matches need at least one player.
        </p>
      </fieldset>

      <!-- Errors -->
      <p v-if="formError" class="text-sm text-red-600 dark:text-red-400">{{ formError }}</p>
      <div
        v-if="submitError"
        class="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300"
      >
        <p class="font-medium flex items-center gap-1.5">
          <FontAwesomeIcon :icon="faTriangleExclamation" />
          Couldn't create the match
        </p>
        <p class="mt-1 font-mono text-xs break-all">{{ submitError }}</p>
      </div>

      <button
        type="submit"
        :disabled="submitting || loadingOptions"
        class="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-3 text-sm font-semibold hover:bg-black dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        <FontAwesomeIcon v-if="submitting" :icon="faSpinner" spin />
        {{ submitting ? 'Creating…' : 'Create match' }}
      </button>
    </form>
  </div>
</template>
