export type CoreRarity = 'Epic' | 'Legendary' | 'Relic' | 'Ancient'
export type CoreType = 'Order of the Sun' | 'Order of the Moon' | 'Order of the Star' | 'Chaos of the Sun' | 'Chaos of the Moon' | 'Chaos of the Star'
export type AstrogemCategory = 'Order' | 'Chaos'

export interface Astrogem {
  id: string
  name: string
  category: AstrogemCategory
  willpower: number
  points: number
}

export interface Core {
  id: string
  name: string
  type: CoreType
  rarity: CoreRarity
  astrogems: Astrogem[]
}

export interface SolverResult {
  coreId: string
  astrogems: Astrogem[]
  totalPoints: number
  totalWillpower: number
  breakpointsHit: number[]
  score: number
}

export const CORE_CONFIG: Record<CoreRarity, { maxWillpower: number, breakpoints: number[] }> = {
  Epic: { maxWillpower: 9, breakpoints: [10] },
  Legendary: { maxWillpower: 12, breakpoints: [10, 14] },
  Relic: { maxWillpower: 15, breakpoints: [10, 14, 17, 18, 19, 20] },
  Ancient: { maxWillpower: 17, breakpoints: [10, 14, 17, 18, 19, 20] }
}

export const BREAKPOINT_WEIGHTS: Record<number, number> = {
  10: 1,
  14: 5,
  17: 5,
  18: 0.5,
  19: 0.5,
  20: 0.5
}

export const ANCIENT_17P_BONUS = 1.5

export const CORE_CATEGORIES: Record<CoreType, AstrogemCategory> = {
  'Order of the Sun': 'Order',
  'Order of the Moon': 'Order',
  'Order of the Star': 'Order',
  'Chaos of the Sun': 'Chaos',
  'Chaos of the Moon': 'Chaos',
  'Chaos of the Star': 'Chaos'
}

export const CORE_ICONS: Record<CoreType, string> = {
  'Order of the Sun': '/images/core_order_sun.png',
  'Order of the Moon': '/images/core_order_moon.png',
  'Order of the Star': '/images/core_order_star.png',
  'Chaos of the Sun': '/images/core_chaos_sun.png',
  'Chaos of the Moon': '/images/core_chaos_moon.png',
  'Chaos of the Star': '/images/core_chaos_star.png'
}

export function getCoreSimpleIcon(type: CoreType): string {
  if (type.includes('Sun')) return '/images/sun.png'
  if (type.includes('Moon')) return '/images/moon.png'
  return '/images/star.png'
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

export function createEmptyCore(type: CoreType, rarity: CoreRarity = 'Relic'): Core {
  return {
    id: generateId(),
    name: type,
    type,
    rarity,
    astrogems: []
  }
}

export function createEmptyAstrogem(category: AstrogemCategory): Astrogem {
  return {
    id: generateId(),
    name: '',
    category,
    willpower: 0,
    points: 0
  }
}

export function getCoreCategory(type: CoreType): AstrogemCategory {
  return CORE_CATEGORIES[type]
}

export function getMaxWillpower(rarity: CoreRarity): number {
  return CORE_CONFIG[rarity].maxWillpower
}

export function getBreakpoints(rarity: CoreRarity): number[] {
  return CORE_CONFIG[rarity].breakpoints
}

export function calculateTotalWillpower(astrogems: Astrogem[]): number {
  return astrogems.reduce((sum, gem) => sum + gem.willpower, 0)
}

export function calculateTotalPoints(astrogems: Astrogem[]): number {
  return astrogems.reduce((sum, gem) => sum + gem.points, 0)
}

export function getBreakpointsHit(points: number, rarity: CoreRarity): number[] {
  const breakpoints = getBreakpoints(rarity)
  return breakpoints.filter(bp => points >= bp)
}

export function calculateScore(points: number, rarity: CoreRarity): number {
  const breakpointsHit = getBreakpointsHit(points, rarity)
  return breakpointsHit.reduce((score, bp) => {
    let weight = BREAKPOINT_WEIGHTS[bp] || 0
    if (bp === 17 && rarity === 'Ancient') {
      weight += ANCIENT_17P_BONUS
    }
    return score + weight
  }, 0)
}
