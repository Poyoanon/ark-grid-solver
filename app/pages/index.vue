<script setup lang="ts">
import type { Core, Astrogem, SolverResult, CoreType, AstrogemCategory } from '~/types/arkgrid'
import { createEmptyCore, createEmptyAstrogem, getCoreSimpleIcon, generateId } from '~/types/arkgrid'

const config = useRuntimeConfig()
const baseURL = config.app.baseURL

const { solveArkGridAsync, getMaxPossibleScore, getDestinyBonus } = useArkGridSolver()

const STORAGE_KEY_CHARACTERS = 'arkgrid-characters'
const STORAGE_KEY_ACTIVE_CHARACTER = 'arkgrid-active-character'

interface Character {
  id: string
  name: string
  cores: Core[]
  astrogems: Astrogem[]
}

const characters = ref<Character[]>([])
const activeCharacterId = ref<string>('')
const results = ref<SolverResult[]>([])
const showResults = ref(false)
const isCalculating = ref(false)
const showAddGemModal = ref(false)
const showResetModal = ref(false)
const showAddCharacterModal = ref(false)
const showDeleteCharacterModal = ref(false)
const newCharacterName = ref('')
const editingCharacterName = ref(false)
const editedName = ref('')

type AstrogemSortOption = 'none' | 'willpower-high' | 'willpower-low' | 'points-high' | 'points-low'
const astrogemSort = ref<AstrogemSortOption>('none')
const astrogemSortOptions = [
  { label: 'Default', value: 'none' },
  { label: 'Willpower (High → Low)', value: 'willpower-high' },
  { label: 'Willpower (Low → High)', value: 'willpower-low' },
  { label: 'Core Points (High → Low)', value: 'points-high' },
  { label: 'Core Points (Low → High)', value: 'points-low' }
]

const activeCharacter = computed(() => {
  return characters.value.find(c => c.id === activeCharacterId.value)
})

const cores = computed({
  get: () => activeCharacter.value?.cores || [],
  set: (value: Core[]) => {
    const char = activeCharacter.value
    if (char) char.cores = value
  }
})

const astrogems = computed({
  get: () => activeCharacter.value?.astrogems || [],
  set: (value: Astrogem[]) => {
    const char = activeCharacter.value
    if (char) char.astrogems = value
  }
})

function createDefaultCharacter(name: string = 'Character 1'): Character {
  return {
    id: generateId(),
    name,
    cores: [],
    astrogems: []
  }
}

onMounted(() => {
  const savedCharacters = localStorage.getItem(STORAGE_KEY_CHARACTERS)
  const savedActiveId = localStorage.getItem(STORAGE_KEY_ACTIVE_CHARACTER)

  if (savedCharacters) {
    try {
      characters.value = JSON.parse(savedCharacters)
    } catch (e) {
      console.error('Failed to load characters from localStorage:', e)
      characters.value = [createDefaultCharacter()]
    }
  } else {
    characters.value = [createDefaultCharacter()]
  }

  if (savedActiveId && characters.value.some(c => c.id === savedActiveId)) {
    activeCharacterId.value = savedActiveId
  } else if (characters.value.length > 0) {
    activeCharacterId.value = characters.value[0]!.id
  }
})

watch(characters, (newCharacters) => {
  localStorage.setItem(STORAGE_KEY_CHARACTERS, JSON.stringify(newCharacters))
}, { deep: true })

watch(activeCharacterId, (newId) => {
  localStorage.setItem(STORAGE_KEY_ACTIVE_CHARACTER, newId)
  showResults.value = false
  results.value = []
})

function addCharacter() {
  const name = newCharacterName.value.trim() || `Character ${characters.value.length + 1}`
  const newChar = createDefaultCharacter(name)
  characters.value.push(newChar)
  activeCharacterId.value = newChar.id
  newCharacterName.value = ''
  showAddCharacterModal.value = false
}

function deleteCharacter() {
  if (characters.value.length <= 1) return
  const index = characters.value.findIndex(c => c.id === activeCharacterId.value)
  if (index !== -1) {
    characters.value.splice(index, 1)
    activeCharacterId.value = characters.value[0]?.id || ''
  }
  showDeleteCharacterModal.value = false
}

function startEditingName() {
  editedName.value = activeCharacter.value?.name || ''
  editingCharacterName.value = true
}

function saveCharacterName() {
  if (activeCharacter.value && editedName.value.trim()) {
    activeCharacter.value.name = editedName.value.trim()
  }
  editingCharacterName.value = false
}

const availableCoreTypes = computed(() => {
  const usedTypes = cores.value.map(c => c.type)
  const allTypes: CoreType[] = [
    'Order of the Sun',
    'Order of the Moon',
    'Order of the Star',
    'Chaos of the Sun',
    'Chaos of the Moon',
    'Chaos of the Star'
  ]
  return allTypes.filter(t => !usedTypes.includes(t))
})

function addCore() {
  if (!activeCharacter.value || cores.value.length >= 6) return
  const nextType = availableCoreTypes.value[0]
  if (!nextType) return
  activeCharacter.value.cores.push(createEmptyCore(nextType))
  showResults.value = false
}

function removeCore(index: number) {
  if (!activeCharacter.value) return
  activeCharacter.value.cores.splice(index, 1)
  showResults.value = false
}

function updateCore(index: number, core: Core) {
  if (!activeCharacter.value) return
  activeCharacter.value.cores[index] = core
  showResults.value = false
}

function addAstrogem(category: AstrogemCategory) {
  if (!activeCharacter.value) return
  activeCharacter.value.astrogems.push(createEmptyAstrogem(category))
  showResults.value = false
  showAddGemModal.value = false
}

function removeAstrogemById(id: string) {
  if (!activeCharacter.value) return
  const index = activeCharacter.value.astrogems.findIndex(g => g.id === id)
  if (index !== -1) {
    activeCharacter.value.astrogems.splice(index, 1)
    showResults.value = false
  }
}

function updateAstrogemById(id: string, gem: Astrogem) {
  if (!activeCharacter.value) return
  const index = activeCharacter.value.astrogems.findIndex(g => g.id === id)
  if (index !== -1) {
    activeCharacter.value.astrogems[index] = gem
    showResults.value = false
  }
}

async function calculate() {
  if (cores.value.length === 0 || astrogems.value.length === 0) return

  isCalculating.value = true
  showResults.value = false

  try {
    const plainCores = JSON.parse(JSON.stringify(cores.value))
    const plainAstrogems = JSON.parse(JSON.stringify(astrogems.value))
    results.value = await solveArkGridAsync(plainCores, plainAstrogems, baseURL)
    showResults.value = true

    await nextTick()
    document.getElementById('optimization-results')?.scrollIntoView({ behavior: 'smooth' })
  } catch (error) {
    console.error('Solver error:', error)
  } finally {
    isCalculating.value = false
  }
}

function getResultForCore(coreId: string): SolverResult | undefined {
  return results.value.find(r => r.coreId === coreId)
}

const sortedAstrogems = computed(() => {
  const gems = [...astrogems.value]
  switch (astrogemSort.value) {
    case 'willpower-high':
      return gems.sort((a, b) => b.willpower - a.willpower)
    case 'willpower-low':
      return gems.sort((a, b) => a.willpower - b.willpower)
    case 'points-high':
      return gems.sort((a, b) => b.points - a.points)
    case 'points-low':
      return gems.sort((a, b) => a.points - b.points)
    default:
      return gems
  }
})

const orderAstrogems = computed(() => astrogems.value.filter(g => g.category === 'Order'))
const chaosAstrogems = computed(() => astrogems.value.filter(g => g.category === 'Chaos'))

const totalScore = computed(() => {
  const baseScore = results.value.reduce((sum, r) => sum + r.score, 0)
  const destinyBonus = getDestinyBonus(cores.value, results.value)
  return baseScore + destinyBonus
})
const maxPossible = computed(() => getMaxPossibleScore(cores.value))

function resetAll() {
  if (!activeCharacter.value) return
  activeCharacter.value.cores = []
  activeCharacter.value.astrogems = []
  results.value = []
  showResults.value = false
  showResetModal.value = false
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <UContainer class="py-8">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold mb-2">
          Ark Grid Solver
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Optimize your astrogem assignments for maximum breakpoints
        </p>
        <p class="text-gray-800 dark:text-gray-600">
          by poyo age 6
        </p>
        <a
          href="https://ko-fi.com/poyoanon"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-block mt-2"
        >
          <img
            :src="baseURL + 'images/kofilogo.png'"
            alt="Support me on Ko-fi"
            class="h-8"
          >
        </a>
      </div>

      <UAlert
        icon="i-lucide-info"
        color="info"
        variant="subtle"
        title="How to use"
        description="Add your cores (up to 6), then add all your available astrogems. Click 'Calculate Optimal Assignment' to find the best assignment that maximizes your breakpoint scores. Priority is given to 14p and 17p breakpoints. It also prioritizes Order Sun and Order Moon's Destiny effect synergy. This page saves all your cores and gems, so you can come back to it at a later time."
        class="mb-6"
      />

      <div class="mb-6">
        <h2 class="text-lg font-semibold flex items-center gap-2 mb-3">
          <UIcon name="i-lucide-users" />
          Characters
        </h2>
        <div class="flex items-center gap-2 flex-wrap">
          <div class="flex items-center gap-1 flex-wrap">
            <UButton
              v-for="char in characters"
              :key="char.id"
              :color="char.id === activeCharacterId ? 'primary' : 'neutral'"
              :variant="char.id === activeCharacterId ? 'solid' : 'outline'"
              size="sm"
              @click="activeCharacterId = char.id"
            >
              {{ char.name }}
            </UButton>
          </div>
          <UButton
            icon="i-lucide-plus"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="showAddCharacterModal = true"
          />
        </div>

        <div
          v-if="activeCharacter"
          class="mt-2 flex items-center gap-2"
        >
          <template v-if="editingCharacterName">
            <UInput
              v-model="editedName"
              size="sm"
              placeholder="Character name"
              class="w-48"
              @keyup.enter="saveCharacterName"
            />
            <UButton
              icon="i-lucide-check"
              color="success"
              variant="ghost"
              size="xs"
              @click="saveCharacterName"
            />
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="editingCharacterName = false"
            />
          </template>
          <template v-else>
            <UButton
              icon="i-lucide-pencil"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="startEditingName"
            />
            <UButton
              v-if="characters.length > 1"
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              size="xs"
              @click="showDeleteCharacterModal = true"
            />
          </template>
        </div>
      </div>

      <div class="grid lg:grid-cols-2 gap-6">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold flex items-center gap-2">
              <UIcon name="i-lucide-hexagon" />
              Cores
              <UBadge
                color="neutral"
                variant="subtle"
              >
                {{ cores.length }}/6
              </UBadge>
            </h2>
            <UButton
              icon="i-lucide-plus"
              :disabled="cores.length >= 6"
              size="sm"
              @click="addCore"
            >
              Add Core
            </UButton>
          </div>

          <div
            v-if="cores.length === 0"
            class="text-center py-12 border-2 border-dashed rounded-lg"
          >
            <UIcon
              name="i-lucide-hexagon"
              class="size-12 text-gray-400 mb-2"
            />
            <p class="text-gray-500">
              No cores added yet
            </p>
            <UButton
              class="mt-4"
              @click="addCore"
            >
              Add Your First Core
            </UButton>
          </div>

          <div class="space-y-4">
            <CoreCard
              v-for="(core, index) in cores"
              :key="core.id"
              :core="core"
              :show-results="showResults"
              :result-astrogems="getResultForCore(core.id)?.astrogems"
              @update:core="updateCore(index, $event)"
              @remove="removeCore(index)"
            />
          </div>
        </div>

        <div class="space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <h2 class="text-xl font-semibold flex items-center gap-2">
              <UIcon name="i-lucide-gem" />
              Astrogems
              <UBadge
                color="neutral"
                variant="subtle"
              >
                {{ astrogems.length }}
              </UBadge>
            </h2>
            <div
              v-if="astrogems.length > 1"
              class="flex items-center gap-2"
            >
              <UIcon
                name="i-lucide-arrow-up-down"
                class="size-4 text-gray-500"
              />
              <USelect
                v-model="astrogemSort"
                :items="astrogemSortOptions"
                value-key="value"
                size="sm"
                class="w-48"
              />
            </div>
          </div>

          <div
            v-if="astrogems.length > 0"
            class="grid grid-cols-2 gap-4"
          >
            <UCard>
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-gem"
                  class="text-red-500"
                />
                <span class="font-medium">Order: {{ orderAstrogems.length }}</span>
              </div>
            </UCard>
            <UCard>
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-gem"
                  class="text-blue-500"
                />
                <span class="font-medium">Chaos: {{ chaosAstrogems.length }}</span>
              </div>
            </UCard>
          </div>

          <div class="grid sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
            <AstrogemCard
              v-for="gem in sortedAstrogems"
              :key="gem.id"
              :astrogem="gem"
              @update:astrogem="updateAstrogemById(gem.id, $event)"
              @remove="removeAstrogemById(gem.id)"
            />

            <div
              class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors min-h-40"
              @click="showAddGemModal = true"
            >
              <UIcon
                name="i-lucide-plus"
                class="size-8 text-gray-400 mb-2"
              />
              <span class="text-sm text-gray-500">Add Astrogem</span>
            </div>
          </div>
        </div>
      </div>

      <UModal v-model:open="showAddGemModal">
        <template #content>
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold">
                  Add New Astrogem
                </h3>
                <UButton
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  @click="showAddGemModal = false"
                />
              </div>
            </template>

            <div class="space-y-4">
              <p class="text-gray-600 dark:text-gray-400">
                Select the astrogem category:
              </p>
              <div class="grid grid-cols-2 gap-4">
                <button
                  class="p-6 rounded-lg border-2 border-red-400/50 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex flex-col items-center gap-2"
                  @click="addAstrogem('Order')"
                >
                  <UIcon
                    name="i-lucide-gem"
                    class="size-8 text-red-500"
                  />
                  <span class="font-medium">Order</span>
                </button>
                <button
                  class="p-6 rounded-lg border-2 border-blue-400/50 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex flex-col items-center gap-2"
                  @click="addAstrogem('Chaos')"
                >
                  <UIcon
                    name="i-lucide-gem"
                    class="size-8 text-blue-500"
                  />
                  <span class="font-medium">Chaos</span>
                </button>
              </div>
            </div>
          </UCard>
        </template>
      </UModal>

      <div class="mt-8 flex flex-col items-center gap-4">
        <div class="flex justify-center gap-4">
          <UButton
            size="xl"
            icon="i-lucide-calculator"
            :loading="isCalculating"
            :disabled="cores.length === 0 || astrogems.length === 0"
            @click="calculate"
          >
            Calculate Optimal Assignment
          </UButton>
          <UButton
            size="xl"
            color="neutral"
            variant="outline"
            icon="i-lucide-refresh-cw"
            @click="showResetModal = true"
          >
            Reset All
          </UButton>
        </div>

        <div
          v-if="isCalculating"
          class="flex flex-col items-center gap-3 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
        >
          <div class="flex items-center gap-3">
            <UIcon
              name="i-lucide-loader-2"
              class="w-6 h-6 text-blue-500 animate-spin"
            />
            <span class="text-lg font-medium text-blue-700 dark:text-blue-300">
              Calculating optimal assignments...
            </span>
          </div>
          <p class="text-sm text-blue-600 dark:text-blue-400 text-center max-w-md">
            This may take a few seconds depending on the number of astrogems. The page will remain responsive while calculating.
          </p>
        </div>
      </div>

      <UModal v-model:open="showResetModal">
        <template #content>
          <UCard :ui="{ root: 'border-2 border-red-500' }">
            <template #header>
              <div class="flex items-center gap-2 text-red-500">
                <UIcon name="i-lucide-alert-triangle" />
                <h3 class="text-lg font-semibold">
                  Are you sure?
                </h3>
              </div>
            </template>

            <p class="text-gray-600 dark:text-gray-400">
              This will delete all your current cores and gems.
            </p>

            <template #footer>
              <div class="flex justify-end gap-3">
                <UButton
                  color="neutral"
                  variant="outline"
                  @click="showResetModal = false"
                >
                  Cancel
                </UButton>
                <UButton
                  color="error"
                  @click="resetAll"
                >
                  Yes, Reset All
                </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>

      <div
        v-if="showResults"
        id="optimization-results"
        class="mt-8"
      >
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold flex items-center gap-2">
                <UIcon
                  name="i-lucide-trophy"
                  class="text-yellow-500"
                />
                Optimization Results
              </h3>
              <UBadge
                color="success"
                size="lg"
              >
                Score: {{ totalScore.toFixed(1) }} / {{ maxPossible.toFixed(1) }}
              </UBadge>
            </div>
          </template>

          <div class="space-y-4">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="text-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div class="text-2xl font-bold">
                  {{ results.filter(r => r.breakpointsHit.includes(17)).length }}
                </div>
                <div class="text-sm text-gray-500">
                  17p Reached
                </div>
              </div>
              <div class="text-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div class="text-2xl font-bold">
                  {{ results.filter(r => r.breakpointsHit.includes(14)).length }}
                </div>
                <div class="text-sm text-gray-500">
                  14p Reached
                </div>
              </div>
              <div class="text-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div class="text-2xl font-bold">
                  {{ results.filter(r => r.breakpointsHit.includes(10)).length }}
                </div>
                <div class="text-sm text-gray-500">
                  10p Reached
                </div>
              </div>
              <div class="text-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div class="text-2xl font-bold">
                  {{ results.reduce((sum, r) => sum + r.astrogems.length, 0) }}
                </div>
                <div class="text-sm text-gray-500">
                  Gems Used
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <h4 class="font-medium">
                Assignment Details:
              </h4>
              <div
                v-for="result in results"
                :key="result.coreId"
                class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <img
                      :src="baseURL + getCoreSimpleIcon(cores.find(c => c.id === result.coreId)?.type as CoreType)"
                      :alt="cores.find(c => c.id === result.coreId)?.type"
                      class="size-5"
                    >
                    <span class="font-medium">
                      {{ cores.find(c => c.id === result.coreId)?.type }}
                    </span>
                  </div>
                  <div class="flex flex-col items-end gap-0.5 text-sm text-gray-600 dark:text-gray-400">
                    <span class="flex items-center gap-1">
                      <img
                        src="/images/astrogem_willpower.png"
                        class="size-3"
                        alt="Willpower"
                      >
                      {{ result.totalWillpower }} Willpower
                    </span>
                    <span class="flex items-center gap-1">
                      <img
                        src="/images/astrogem_point.png"
                        class="size-3"
                        alt="Core Points"
                      >
                      {{ result.totalPoints }} Core Points
                    </span>
                  </div>
                </div>

                <div class="flex flex-wrap gap-2 mb-2">
                  <UBadge
                    v-for="bp in result.breakpointsHit"
                    :key="bp"
                    color="success"
                    variant="solid"
                    size="sm"
                  >
                    {{ bp }}p ✓
                  </UBadge>
                </div>

                <div
                  v-if="result.astrogems.length > 0"
                  class="flex flex-wrap gap-2"
                >
                  <div
                    v-for="gem in result.astrogems"
                    :key="gem.id"
                    class="text-xs px-2 py-2 bg-white dark:bg-gray-700 rounded border flex flex-col gap-1"
                  >
                    <span class="flex items-center gap-1">
                      <UIcon
                        name="i-lucide-gem"
                        :class="gem.category === 'Order' ? 'text-red-500' : 'text-blue-500'"
                        class="size-3"
                      />
                      {{ gem.category }}
                    </span>
                    <span class="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <img
                        src="/images/astrogem_willpower.png"
                        class="size-3"
                        alt="Willpower"
                      >
                      {{ gem.willpower }} Willpower
                    </span>
                    <span class="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <img
                        src="/images/astrogem_point.png"
                        class="size-3"
                        alt="Core Points"
                      >
                      {{ gem.points }} Core Points
                    </span>
                  </div>
                </div>
                <div
                  v-else
                  class="text-sm text-gray-400 italic"
                >
                  No astrogems assigned
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <UModal v-model:open="showAddCharacterModal">
        <template #content>
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold">
                  Add New Character
                </h3>
                <UButton
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  @click="showAddCharacterModal = false"
                />
              </div>
            </template>

            <UFormField label="Character Name">
              <UInput
                v-model="newCharacterName"
                placeholder="Enter character name"
                @keyup.enter="addCharacter"
              />
            </UFormField>

            <template #footer>
              <div class="flex justify-end gap-3">
                <UButton
                  color="neutral"
                  variant="outline"
                  @click="showAddCharacterModal = false"
                >
                  Cancel
                </UButton>
                <UButton
                  color="primary"
                  @click="addCharacter"
                >
                  Add Character
                </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>

      <UModal v-model:open="showDeleteCharacterModal">
        <template #content>
          <UCard :ui="{ root: 'border-2 border-red-500' }">
            <template #header>
              <div class="flex items-center gap-2 text-red-500">
                <UIcon name="i-lucide-alert-triangle" />
                <h3 class="text-lg font-semibold">
                  Delete Character?
                </h3>
              </div>
            </template>

            <p class="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete "{{ activeCharacter?.name }}"? This will permanently delete all their cores and gems.
            </p>

            <template #footer>
              <div class="flex justify-end gap-3">
                <UButton
                  color="neutral"
                  variant="outline"
                  @click="showDeleteCharacterModal = false"
                >
                  Cancel
                </UButton>
                <UButton
                  color="error"
                  @click="deleteCharacter"
                >
                  Yes, Delete
                </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>
    </UContainer>
  </div>
</template>
