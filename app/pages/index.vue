<script setup lang="ts">
import type { Core, Astrogem, SolverResult, CoreType, AstrogemCategory } from '~/types/arkgrid'
import { createEmptyCore, createEmptyAstrogem, getCoreSimpleIcon } from '~/types/arkgrid'

const { solveArkGrid, getMaxPossibleScore } = useArkGridSolver()

const STORAGE_KEY_CORES = 'arkgrid-cores'
const STORAGE_KEY_ASTROGEMS = 'arkgrid-astrogems'

const cores = ref<Core[]>([])
const astrogems = ref<Astrogem[]>([])
const results = ref<SolverResult[]>([])
const showResults = ref(false)
const isCalculating = ref(false)
const showAddGemModal = ref(false)
const showResetModal = ref(false)

onMounted(() => {
  const savedCores = localStorage.getItem(STORAGE_KEY_CORES)
  const savedAstrogems = localStorage.getItem(STORAGE_KEY_ASTROGEMS)

  if (savedCores) {
    try {
      cores.value = JSON.parse(savedCores)
    } catch (e) {
      console.error('Failed to load cores from localStorage:', e)
    }
  }

  if (savedAstrogems) {
    try {
      astrogems.value = JSON.parse(savedAstrogems)
    } catch (e) {
      console.error('Failed to load astrogems from localStorage:', e)
    }
  }
})

watch(cores, (newCores) => {
  localStorage.setItem(STORAGE_KEY_CORES, JSON.stringify(newCores))
}, { deep: true })

watch(astrogems, (newAstrogems) => {
  localStorage.setItem(STORAGE_KEY_ASTROGEMS, JSON.stringify(newAstrogems))
}, { deep: true })

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
  if (cores.value.length >= 6) return
  const nextType = availableCoreTypes.value[0]
  if (!nextType) return
  cores.value.push(createEmptyCore(nextType))
  showResults.value = false
}

function removeCore(index: number) {
  cores.value.splice(index, 1)
  showResults.value = false
}

function updateCore(index: number, core: Core) {
  cores.value[index] = core
  showResults.value = false
}

function addAstrogem(category: AstrogemCategory) {
  astrogems.value.push(createEmptyAstrogem(category))
  showResults.value = false
  showAddGemModal.value = false
}

function removeAstrogem(index: number) {
  astrogems.value.splice(index, 1)
  showResults.value = false
}

function updateAstrogem(index: number, gem: Astrogem) {
  astrogems.value[index] = gem
  showResults.value = false
}

async function calculate() {
  if (cores.value.length === 0 || astrogems.value.length === 0) return

  isCalculating.value = true
  showResults.value = false

  await new Promise(resolve => setTimeout(resolve, 100))

  try {
    results.value = solveArkGrid(cores.value, astrogems.value)
    showResults.value = true

    await nextTick()
    document.getElementById('optimization-results')?.scrollIntoView({ behavior: 'smooth' })
  } finally {
    isCalculating.value = false
  }
}

function getResultForCore(coreId: string): SolverResult | undefined {
  return results.value.find(r => r.coreId === coreId)
}

const orderAstrogems = computed(() => astrogems.value.filter(g => g.category === 'Order'))
const chaosAstrogems = computed(() => astrogems.value.filter(g => g.category === 'Chaos'))

const totalScore = computed(() => results.value.reduce((sum, r) => sum + r.score, 0))
const maxPossible = computed(() => getMaxPossibleScore(cores.value))

function resetAll() {
  cores.value = []
  astrogems.value = []
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
      </div>

      <UAlert
        icon="i-lucide-info"
        color="info"
        variant="subtle"
        title="How to use"
        description="Add your cores (up to 6), then add all your available astrogems. Click 'Calculate Optimal Assignment' to find the best assignment that maximizes your breakpoint scores. Priority is given to 14p and 17p breakpoints. This page saves all your cores and gems, so you can come back to it at a later time."
        class="mb-6"
      />

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
          <div class="flex items-center justify-between">
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
              v-for="(gem, index) in astrogems"
              :key="gem.id"
              :astrogem="gem"
              @update:astrogem="updateAstrogem(index, $event)"
              @remove="removeAstrogem(index)"
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

      <div class="mt-8 flex justify-center gap-4">
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
                      :src="getCoreSimpleIcon(cores.find(c => c.id === result.coreId)?.type as CoreType)"
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
    </UContainer>
  </div>
</template>
