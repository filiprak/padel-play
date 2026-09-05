<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faClock, faLocationDot, faUserPlus, faPen, faTrash, faXmark, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { formatMatchDate, formatTimeRange, relativeDayLabel } from '@/lib/dates'
import { deleteMatch, ApiError } from '@/services'
import type { MatchDto, MatchTeam } from '@shared'

const props = defineProps<{
  match: MatchDto
}>()

const emit = defineEmits<{
  deleted: [id: number]
}>()

const confirmingDelete = ref(false)
const deleting = ref(false)
const deleteError = ref<string | null>(null)

async function onDelete() {
  deleting.value = true
  deleteError.value = null
  try {
    await deleteMatch(props.match.id)
    emit('deleted', props.match.id)
  } catch (e) {
    deleteError.value = e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Unknown error'
    confirmingDelete.value = false
  } finally {
    deleting.value = false
  }
}

interface Slot {
  key: string
  name: string | null
}

function slotsFor(team: MatchTeam): Slot[] {
  const assigned = props.match.players.filter((p) => p.team === team)
  const slots: Slot[] = assigned.map((p) => ({ key: `user-${p.user.id}`, name: p.user.name }))
  for (let i = slots.length; i < 2; i++) {
    slots.push({ key: `empty-${team}-${i}`, name: null })
  }
  return slots
}

const team1 = computed(() => slotsFor(1))
const team2 = computed(() => slotsFor(2))

const dayLabel = computed(() => formatMatchDate(props.match.startsAt))

const timeRange = computed(() => formatTimeRange(props.match.startsAt, props.match.endsAt))

const relativeLabel = computed(() => relativeDayLabel(props.match.startsAt, props.match.endsAt))
</script>

<template>
  <article
    class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden"
  >
    <div class="px-5 pt-4 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm font-semibold">{{ dayLabel }}</p>
        <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <FontAwesomeIcon :icon="faClock" class="text-[11px]" />
          {{ timeRange }}
        </p>
      </div>
      <div class="shrink-0 flex items-center gap-1.5">
        <span
          v-if="relativeLabel"
          class="rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 text-[11px] font-semibold"
        >
          {{ relativeLabel }}
        </span>
        <template v-if="!confirmingDelete">
          <RouterLink
            :to="{ name: 'match-edit', params: { id: match.id } }"
            aria-label="Edit match"
            class="inline-flex items-center justify-center w-7 h-7 rounded-full text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <FontAwesomeIcon :icon="faPen" class="text-xs" />
          </RouterLink>
          <button
            type="button"
            @click="confirmingDelete = true"
            aria-label="Delete match"
            class="inline-flex items-center justify-center w-7 h-7 rounded-full text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <FontAwesomeIcon :icon="faTrash" class="text-xs" />
          </button>
        </template>
        <template v-else>
          <button
            type="button"
            @click="onDelete"
            :disabled="deleting"
            class="inline-flex items-center gap-1 rounded-full bg-red-600 text-white px-2.5 py-1 text-[11px] font-semibold hover:bg-red-700 disabled:opacity-50 transition"
          >
            <FontAwesomeIcon :icon="deleting ? faSpinner : faTrash" :spin="deleting" class="text-[10px]" />
            {{ deleting ? 'Deleting…' : 'Confirm' }}
          </button>
          <button
            type="button"
            @click="confirmingDelete = false"
            :disabled="deleting"
            aria-label="Cancel delete"
            class="inline-flex items-center justify-center w-7 h-7 rounded-full text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-50"
          >
            <FontAwesomeIcon :icon="faXmark" class="text-xs" />
          </button>
        </template>
      </div>
    </div>
    <p v-if="deleteError" class="px-5 pt-2 text-xs text-red-600 dark:text-red-400">{{ deleteError }}</p>

    <div class="px-5 mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
      <FontAwesomeIcon :icon="faLocationDot" class="text-[11px]" />
      <span class="truncate">
        {{ match.place.name }}
        <span v-if="match.place.location" class="text-gray-400 dark:text-gray-500">· {{ match.place.location }}</span>
      </span>
    </div>

    <div class="px-5 py-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <ul class="space-y-1.5">
        <li
          v-for="slot in team1"
          :key="slot.key"
          :class="[
            'truncate rounded-lg px-2.5 py-1.5 text-[13px]',
            slot.name
              ? 'bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 font-medium'
              : 'border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 flex items-center gap-1.5',
          ]"
        >
          <template v-if="slot.name">{{ slot.name }}</template>
          <template v-else>
            <FontAwesomeIcon :icon="faUserPlus" class="text-[11px]" />
            Open spot
          </template>
        </li>
      </ul>

      <span
        aria-hidden="true"
        class="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[11px] font-bold tracking-wide shrink-0"
      >
        VS
      </span>

      <ul class="space-y-1.5">
        <li
          v-for="slot in team2"
          :key="slot.key"
          :class="[
            'truncate rounded-lg px-2.5 py-1.5 text-[13px] text-right',
            slot.name
              ? 'bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 font-medium'
              : 'border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 flex items-center justify-end gap-1.5',
          ]"
        >
          <template v-if="slot.name">{{ slot.name }}</template>
          <template v-else>
            Open spot
            <FontAwesomeIcon :icon="faUserPlus" class="text-[11px]" />
          </template>
        </li>
      </ul>
    </div>
  </article>
</template>
