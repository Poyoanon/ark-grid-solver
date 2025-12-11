<script setup lang="ts">
import type { Core, CoreRarity, CoreType, Astrogem } from '~/types/arkgrid'
import { CORE_CONFIG, CORE_ICONS, getCoreCategory, calculateTotalWillpower, calculateTotalPoints, getBreakpointsHit } from '~/types/arkgrid'

const props = defineProps<{
  core: Core
  showResults?: boolean
  resultAstrogems?: Astrogem[]
}>()

const emit = defineEmits<{
  'update:core': [core: Core]
  'remove': []
}>()

const rarityOptions: CoreRarity[] = ['Epic', 'Legendary', 'Relic', 'Ancient']

const coreTypeOptions: CoreType[] = [
  'Order of the Sun',
  'Order of the Moon',
  'Order of the Star',
  'Chaos of the Sun',
  'Chaos of the Moon',
  'Chaos of the Star'
]

const selectedRarity = computed({
  get: () => props.core.rarity,
  set: (value: CoreRarity) => {
    emit('update:core', { ...props.core, rarity: value })
  }
})

const selectedType = computed({
  get: () => props.core.type,
  set: (value: CoreType) => {
    emit('update:core', { ...props.core, type: value, name: value })
  }
})

const coreCategory = computed(() => getCoreCategory(props.core.type))
const maxWillpower = computed(() => CORE_CONFIG[props.core.rarity].maxWillpower)
const breakpoints = computed(() => CORE_CONFIG[props.core.rarity].breakpoints)

const displayAstrogems = computed(() => props.resultAstrogems || props.core.astrogems)
const currentWillpower = computed(() => calculateTotalWillpower(displayAstrogems.value))
const currentPoints = computed(() => calculateTotalPoints(displayAstrogems.value))
const hitBreakpoints = computed(() => getBreakpointsHit(currentPoints.value, props.core.rarity))

const willpowerProgress = computed(() => {
  return Math.min((currentWillpower.value / maxWillpower.value) * 100, 100)
})

const isOverWillpower = computed(() => currentWillpower.value > maxWillpower.value)

const rarityColors: Record<CoreRarity, string> = {
  Epic: 'purple',
  Legendary: 'orange',
  Relic: 'sky',
  Ancient: 'amber'
}

const currentRarityColor = computed(() => rarityColors[props.core.rarity])

function getBreakpointStatus(bp: number): 'hit' | 'next' | 'far' {
  if (hitBreakpoints.value.includes(bp)) return 'hit'
  const nextBp = breakpoints.value.find(b => !hitBreakpoints.value.includes(b))
  if (bp === nextBp) return 'next'
  return 'far'
}
</script>

<template>
  <UCard :ui="{ root: `border-2 border-${currentRarityColor}-500/50` }">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <img
            :src="CORE_ICONS[core.type]"
            :alt="core.type"
            class="size-5"
          />
          <span class="font-semibold">{{ core.type }}</span>
        </div>
        <UButton
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          size="xs"
          @click="emit('remove')"
        />
      </div>
    </template>

    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-3">
        <UFormField label="Core Type">
          <USelect
            v-model="selectedType"
            :items="coreTypeOptions"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Rarity">
          <USelect
            v-model="selectedRarity"
            :items="rarityOptions"
            class="w-full"
          />
        </UFormField>
      </div>

      <div class="space-y-1">
        <div class="flex justify-between text-sm">
          <span class="flex items-center gap-1">
            <img src="/images/astrogem_willpower.png" class="size-4" alt="Willpower">
            Willpower
          </span>
          <span :class="isOverWillpower ? 'text-red-500 font-bold' : ''">
            {{ currentWillpower }} / {{ maxWillpower }}
          </span>
        </div>
        <UProgress
          :model-value="willpowerProgress"
          :color="isOverWillpower ? 'error' : 'primary'"
          size="sm"
        />
      </div>

      <div class="space-y-2">
        <div class="flex justify-between items-center">
          <span class="text-sm flex items-center gap-1">
            <img src="/images/astrogem_point.png" class="size-4" alt="Core Points">
            Core Points
          </span>
          <span class="text-lg font-bold">{{ currentPoints }}</span>
        </div>

        <div class="flex gap-1 flex-wrap">
          <UBadge
            v-for="bp in breakpoints"
            :key="bp"
            :color="getBreakpointStatus(bp) === 'hit' ? 'success' : getBreakpointStatus(bp) === 'next' ? 'warning' : 'neutral'"
            :variant="getBreakpointStatus(bp) === 'hit' ? 'solid' : 'outline'"
            size="sm"
          >
            {{ bp }}p
            <UIcon
              v-if="getBreakpointStatus(bp) === 'hit'"
              name="i-lucide-check"
              class="ml-1"
            />
          </UBadge>
        </div>
      </div>

      <div v-if="showResults && resultAstrogems && resultAstrogems.length > 0" class="space-y-2">
        <div class="text-sm font-medium">Assigned Astrogems:</div>
        <div class="space-y-1">
          <div
            v-for="gem in resultAstrogems"
            :key="gem.id"
            class="flex flex-col gap-1 text-sm bg-gray-100 dark:bg-gray-800 rounded px-2 py-2"
          >
            <span class="flex items-center gap-1">
              <UIcon
                name="i-lucide-gem"
                :class="gem.category === 'Order' ? 'text-red-500' : 'text-blue-500'"
                class="size-4"
              />
              {{ gem.category }}
            </span>
            <span class="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <img src="/images/astrogem_willpower.png" class="size-3" alt="Willpower">
              {{ gem.willpower }} Willpower
            </span>
            <span class="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <img src="/images/astrogem_point.png" class="size-3" alt="Core Points">
              {{ gem.points }} Core Points
            </span>
          </div>
        </div>
      </div>

      <div v-if="!showResults" class="flex gap-1">
        <div
          v-for="i in 4"
          :key="i"
          class="size-8 rounded border-2 flex items-center justify-center text-xs"
          :class="i <= core.astrogems.length
            ? 'border-primary-500 bg-primary-500/20'
            : 'border-gray-300 dark:border-gray-600'"
        >
          {{ i <= core.astrogems.length ? core.astrogems[i - 1]?.points : '-' }}
        </div>
        <span class="text-xs text-gray-500 ml-2 self-center">
          {{ core.astrogems.length }}/4 slots
        </span>
      </div>
    </div>
  </UCard>
</template>
