import type { Core, Astrogem, SolverResult, CoreRarity } from '~/types/arkgrid'
import { CORE_CONFIG, BREAKPOINT_WEIGHTS, getCoreCategory, calculateTotalWillpower, calculateTotalPoints, getBreakpointsHit, calculateScore } from '~/types/arkgrid'

function findValidCombinations(
  core: Core,
  availableAstrogems: Astrogem[],
  maxAstrogems: number = 4
): Astrogem[][] {
  const coreCategory = getCoreCategory(core.type)
  const maxWillpower = CORE_CONFIG[core.rarity].maxWillpower
  const compatibleGems = availableAstrogems.filter(gem => gem.category === coreCategory)

  const validCombinations: Astrogem[][] = []

  function generateCombinations(
    startIndex: number,
    currentCombo: Astrogem[],
    currentWillpower: number
  ) {
    if (currentCombo.length > 0) {
      validCombinations.push([...currentCombo])
    }

    if (currentCombo.length >= maxAstrogems) return

    for (let i = startIndex; i < compatibleGems.length; i++) {
      const gem = compatibleGems[i]!
      const newWillpower = currentWillpower + gem.willpower
      if (newWillpower > maxWillpower) continue

      currentCombo.push(gem)
      generateCombinations(i + 1, currentCombo, newWillpower)
      currentCombo.pop()
    }
  }

  generateCombinations(0, [], 0)
  validCombinations.unshift([])

  return validCombinations
}

function scoreCombination(astrogems: Astrogem[], rarity: CoreRarity): number {
  const totalPoints = calculateTotalPoints(astrogems)
  return calculateScore(totalPoints, rarity)
}

export function solveArkGrid(cores: Core[], allAstrogems: Astrogem[]): SolverResult[] {
  if (cores.length === 0) return []

  const orderAstrogems = allAstrogems.filter(gem => gem.category === 'Order')
  const chaosAstrogems = allAstrogems.filter(gem => gem.category === 'Chaos')
  const orderCores = cores.filter(core => getCoreCategory(core.type) === 'Order')
  const chaosCores = cores.filter(core => getCoreCategory(core.type) === 'Chaos')
  const orderResults = solveCategoryOptimal(orderCores, orderAstrogems)
  const chaosResults = solveCategoryOptimal(chaosCores, chaosAstrogems)

  return [...orderResults, ...chaosResults]
}

function solveCategoryOptimal(cores: Core[], astrogems: Astrogem[]): SolverResult[] {
  if (cores.length === 0) return []

  let bestAssignment: Map<string, Astrogem[]> = new Map()
  let bestTotalScore = -1
  const coreCombinations: Map<string, Astrogem[][]> = new Map()
  for (const core of cores) {
    const combinations = findValidCombinations(core, astrogems)
    coreCombinations.set(core.id, combinations)
  }

  function search(
    coreIndex: number,
    usedGemIds: Set<string>,
    currentAssignment: Map<string, Astrogem[]>,
    currentScore: number
  ) {
    if (coreIndex >= cores.length) {
      if (currentScore > bestTotalScore) {
        bestTotalScore = currentScore
        bestAssignment = new Map(currentAssignment)
      }
      return
    }

    const core = cores[coreIndex]
    if (!core) return

    const combinations = coreCombinations.get(core.id) || [[]]

    for (const combo of combinations) {
      const hasConflict = combo.some(gem => usedGemIds.has(gem.id))
      if (hasConflict) continue

      const comboScore = scoreCombination(combo, core.rarity)
      const maxRemainingScore = (cores.length - coreIndex - 1) * 12
      if (currentScore + comboScore + maxRemainingScore <= bestTotalScore) {
        continue
      }

      const newUsedIds = new Set(usedGemIds)
      combo.forEach(gem => newUsedIds.add(gem.id))
      currentAssignment.set(core.id, combo)
      search(coreIndex + 1, newUsedIds, currentAssignment, currentScore + comboScore)

      currentAssignment.delete(core.id)
    }
  }

  cores.sort((a, b) => {
    const rarityOrder: Record<CoreRarity, number> = { Ancient: 0, Relic: 1, Legendary: 2, Epic: 3 }
    return rarityOrder[a.rarity] - rarityOrder[b.rarity]
  })

  search(0, new Set(), new Map(), 0)

  const results: SolverResult[] = []
  for (const core of cores) {
    const assignedGems = bestAssignment.get(core.id) || []
    const totalPoints = calculateTotalPoints(assignedGems)
    const totalWillpower = calculateTotalWillpower(assignedGems)
    const breakpointsHit = getBreakpointsHit(totalPoints, core.rarity)
    const score = calculateScore(totalPoints, core.rarity)

    results.push({
      coreId: core.id,
      astrogems: assignedGems,
      totalPoints,
      totalWillpower,
      breakpointsHit,
      score
    })
  }

  return results
}

export function getMaxPossibleScore(cores: Core[]): number {
  return cores.reduce((total, core) => {
    const breakpoints = CORE_CONFIG[core.rarity].breakpoints
    return total + breakpoints.reduce((sum, bp) => sum + (BREAKPOINT_WEIGHTS[bp] || 0), 0)
  }, 0)
}

export function useArkGridSolver() {
  return {
    solveArkGrid,
    getMaxPossibleScore
  }
}
