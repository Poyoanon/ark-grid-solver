const CORE_CONFIG = {
  Epic: { maxWillpower: 9, breakpoints: [10] },
  Legendary: { maxWillpower: 12, breakpoints: [10, 14] },
  Relic: { maxWillpower: 15, breakpoints: [10, 14, 17, 18, 19, 20] },
  Ancient: { maxWillpower: 17, breakpoints: [10, 14, 17, 18, 19, 20] }
}

const BREAKPOINT_WEIGHTS = {
  10: 1,
  14: 5,
  17: 5,
  18: 0.5,
  19: 0.5,
  20: 0.5
}

const ANCIENT_17P_BONUS = 1.5
const SUN_MOON_DESTINY_BONUS = 10

const CORE_CATEGORIES = {
  'Order of the Sun': 'Order',
  'Order of the Moon': 'Order',
  'Order of the Star': 'Order',
  'Chaos of the Sun': 'Chaos',
  'Chaos of the Moon': 'Chaos',
  'Chaos of the Star': 'Chaos'
}

function generateId() {
  return Math.random().toString(36).substring(2, 11)
}

function getCoreCategory(type) {
  return CORE_CATEGORIES[type]
}

function calculateTotalWillpower(astrogems) {
  return astrogems.reduce((sum, gem) => sum + gem.willpower, 0)
}

function calculateTotalPoints(astrogems) {
  return astrogems.reduce((sum, gem) => sum + gem.points, 0)
}

function getBreakpointsHit(points, rarity) {
  const breakpoints = CORE_CONFIG[rarity].breakpoints
  return breakpoints.filter(bp => points >= bp)
}

function calculateScore(points, rarity) {
  const breakpointsHit = getBreakpointsHit(points, rarity)
  return breakpointsHit.reduce((score, bp) => {
    let weight = BREAKPOINT_WEIGHTS[bp] || 0
    if (bp === 17 && rarity === 'Ancient') {
      weight += ANCIENT_17P_BONUS
    }
    return score + weight
  }, 0)
}

function expandAstrogems(astrogems) {
  const expanded = []
  for (const gem of astrogems) {
    const qty = gem.quantity ?? 1
    for (let i = 0; i < qty; i++) {
      expanded.push({
        ...gem,
        id: i === 0 ? gem.id : generateId(),
        quantity: 1
      })
    }
  }
  return expanded
}

function isOrderSunCore(core) {
  return core.type === 'Order of the Sun'
}

function isOrderMoonCore(core) {
  return core.type === 'Order of the Moon'
}

function findValidCombinations(core, availableAstrogems, maxAstrogems = 4) {
  const coreCategory = getCoreCategory(core.type)
  const maxWillpower = CORE_CONFIG[core.rarity].maxWillpower
  const compatibleGems = availableAstrogems.filter(gem => gem.category === coreCategory)

  const validCombinations = []

  function generateCombinations(startIndex, currentCombo, currentWillpower) {
    if (currentCombo.length > 0) {
      validCombinations.push([...currentCombo])
    }

    if (currentCombo.length >= maxAstrogems) return

    for (let i = startIndex; i < compatibleGems.length; i++) {
      const gem = compatibleGems[i]
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

function solveCategoryOptimal(cores, astrogems) {
  if (cores.length === 0) return []

  let bestAssignment = new Map()
  let bestTotalScore = -1

  const rarityOrder = { Ancient: 0, Relic: 1, Legendary: 2, Epic: 3 }
  const sortedCores = [...cores].sort((a, b) => {
    return rarityOrder[a.rarity] - rarityOrder[b.rarity]
  })

  const hasOrderSunCore = cores.some(c => isOrderSunCore(c))
  const hasOrderMoonCore = cores.some(c => isOrderMoonCore(c))
  const canGetDestinyBonus = hasOrderSunCore && hasOrderMoonCore
  const destinyBonusValue = canGetDestinyBonus ? SUN_MOON_DESTINY_BONUS : 0

  const maxRemainingScores = new Array(sortedCores.length + 1).fill(0)
  for (let i = sortedCores.length - 1; i >= 0; i--) {
    const core = sortedCores[i]
    const breakpoints = CORE_CONFIG[core.rarity].breakpoints
    const coreMaxScore = breakpoints.reduce((s, bp) => s + (BREAKPOINT_WEIGHTS[bp] || 0), 0)
    maxRemainingScores[i] = maxRemainingScores[i + 1] + coreMaxScore
  }

  const gemIndexMap = new Map()
  astrogems.forEach((gem, idx) => gemIndexMap.set(gem.id, idx))

  const allCoreCombos = []
  for (const core of sortedCores) {
    const combos = findValidCombinations(core, astrogems)
    const scoredCombos = combos.map((gems) => {
      const points = calculateTotalPoints(gems)
      const score = calculateScore(points, core.rarity)
      const gemIndices = gems.map(g => gemIndexMap.get(g.id))
      return { gems, gemIndices, score, points }
    })
    scoredCombos.sort((a, b) => b.score - a.score)
    allCoreCombos.push(scoredCombos)
  }

  const usedGems = new Array(astrogems.length).fill(false)
  const currentAssignment = new Array(sortedCores.length).fill(null)

  const search = (coreIndex, currentScore) => {
    if (coreIndex === sortedCores.length) {
      let totalScore = currentScore
      if (canGetDestinyBonus) {
        const sunCoreIdx = sortedCores.findIndex(c => isOrderSunCore(c))
        const moonCoreIdx = sortedCores.findIndex(c => isOrderMoonCore(c))
        if (sunCoreIdx !== -1 && moonCoreIdx !== -1) {
          const sunGems = currentAssignment[sunCoreIdx] || []
          const moonGems = currentAssignment[moonCoreIdx] || []
          const sunPoints = calculateTotalPoints(sunGems)
          const moonPoints = calculateTotalPoints(moonGems)
          if (sunPoints >= 14 && moonPoints >= 14) {
            totalScore += SUN_MOON_DESTINY_BONUS
          }
        }
      }
      if (totalScore > bestTotalScore) {
        bestTotalScore = totalScore
        bestAssignment = new Map()
        sortedCores.forEach((core, idx) => {
          bestAssignment.set(core.id, currentAssignment[idx] || [])
        })
      }
      return
    }

    if (currentScore + maxRemainingScores[coreIndex] + destinyBonusValue <= bestTotalScore) {
      return
    }

    const combos = allCoreCombos[coreIndex]

    for (const combo of combos) {
      let hasConflict = false
      for (const idx of combo.gemIndices) {
        if (usedGems[idx]) {
          hasConflict = true
          break
        }
      }
      if (hasConflict) continue

      for (const idx of combo.gemIndices) {
        usedGems[idx] = true
      }
      currentAssignment[coreIndex] = combo.gems

      search(coreIndex + 1, currentScore + combo.score)

      for (const idx of combo.gemIndices) {
        usedGems[idx] = false
      }
      currentAssignment[coreIndex] = null
    }
  }

  search(0, 0)

  const results = []
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

function solveArkGrid(cores, allAstrogems) {
  if (cores.length === 0) return []

  const expandedAstrogems = expandAstrogems(allAstrogems)

  const orderAstrogems = expandedAstrogems.filter(gem => gem.category === 'Order')
  const chaosAstrogems = expandedAstrogems.filter(gem => gem.category === 'Chaos')
  const orderCores = cores.filter(core => getCoreCategory(core.type) === 'Order')
  const chaosCores = cores.filter(core => getCoreCategory(core.type) === 'Chaos')

  const orderResults = solveCategoryOptimal(orderCores, orderAstrogems)
  const chaosResults = solveCategoryOptimal(chaosCores, chaosAstrogems)

  const resultsMap = new Map()
  for (const result of [...orderResults, ...chaosResults]) {
    resultsMap.set(result.coreId, result)
  }

  return cores.map(core => resultsMap.get(core.id)).filter(Boolean)
}

self.onmessage = function(e) {
  const { cores, astrogems } = e.data
  
  try {
    const results = solveArkGrid(cores, astrogems)
    self.postMessage({ success: true, results })
  } catch (error) {
    self.postMessage({ success: false, error: error.message })
  }
}
