<script setup lang="ts">
import { computed } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faClock, faLocationDot, faUserPlus } from '@fortawesome/free-solid-svg-icons'
import { formatMatchDate, formatTimeRange, relativeDayLabel } from '@/lib/dates'
import type { MatchDto, MatchTeam } from '@shared'

const props = defineProps<{
  match: MatchDto
}>()

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
      <span
        v-if="relativeLabel"
        class="shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 text-[11px] font-semibold"
      >
        {{ relativeLabel }}
      </span>
    </div>

    <div class="px-5 mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
      <FontAwesomeIcon :icon="faLocationDot" class="text-[11px]" />
      <span class="truncate">
        {{ match.place.name }}
        <span v-if="match.place.location" class="text-gray-400 dark:text-gray-500">· {{ match.place.location }}</span>
      </span>
    </div>

    <div class="px-5 py-4 grid grid-cols-2 gap-3">
      <div
        v-for="team in [{ n: 1 as const, slots: team1 }, { n: 2 as const, slots: team2 }]"
        :key="team.n"
        class="rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 p-3"
      >
        <p class="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">
          Team {{ team.n }}
        </p>
        <ul class="mt-2 space-y-1.5">
          <li
            v-for="slot in team.slots"
            :key="slot.key"
            :class="[
              'truncate rounded-lg px-2.5 py-1.5 text-[13px]',
              slot.name
                ? 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-medium'
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
      </div>
    </div>
  </article>
</template>
