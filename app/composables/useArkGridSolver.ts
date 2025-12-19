import type { Core, Astrogem, SolverResult } from '~/types/arkgrid'
import { CORE_CONFIG, BREAKPOINT_WEIGHTS, SUN_MOON_DESTINY_BONUS, getCoreCategory } from '~/types/arkgrid'

function isOrderSunCore(core: Core): boolean {
  return core.type === 'Order of the Sun'
}

function isOrderMoonCore(core: Core): boolean {
  return core.type === 'Order of the Moon'
}

let worker: Worker | null = null

function getWorker(baseURL: string): Worker {
  if (!worker) {
    worker = new Worker(`${baseURL}solver-worker.js`)
  }
  return worker
}

export function solveArkGridAsync(cores: Core[], allAstrogems: Astrogem[], baseURL: string): Promise<SolverResult[]> {
  return new Promise((resolve, reject) => {
    if (cores.length === 0) {
      resolve([])
      return
    }

    if (typeof window === 'undefined') {
      resolve([])
      return
    }

    const solverWorker = getWorker(baseURL)

    const handleMessage = (e: MessageEvent) => {
      solverWorker.removeEventListener('message', handleMessage)
      solverWorker.removeEventListener('error', handleError)

      if (e.data.success) {
        resolve(e.data.results)
      } else {
        reject(new Error(e.data.error))
      }
    }

    const handleError = (e: ErrorEvent) => {
      solverWorker.removeEventListener('message', handleMessage)
      solverWorker.removeEventListener('error', handleError)
      reject(new Error(e.message))
    }

    solverWorker.addEventListener('message', handleMessage)
    solverWorker.addEventListener('error', handleError)

    console.log('Posting message to worker')
    solverWorker.postMessage({ cores, astrogems: allAstrogems })
  })
}

export function getMaxPossibleScore(cores: Core[]): number {
  const baseScore = cores.reduce((total, core) => {
    const breakpoints = CORE_CONFIG[core.rarity].breakpoints
    return total + breakpoints.reduce((sum, bp) => sum + (BREAKPOINT_WEIGHTS[bp] || 0), 0)
  }, 0)

  const orderCores = cores.filter(core => getCoreCategory(core.type) === 'Order')

  let destinyBonus = 0
  if (orderCores.some(c => isOrderSunCore(c)) && orderCores.some(c => isOrderMoonCore(c))) {
    destinyBonus += SUN_MOON_DESTINY_BONUS
  }

  return baseScore + destinyBonus
}

export function getDestinyBonus(cores: Core[], results: SolverResult[]): number {
  const orderSunCore = cores.find(c => isOrderSunCore(c))
  const orderMoonCore = cores.find(c => isOrderMoonCore(c))

  if (!orderSunCore || !orderMoonCore) return 0

  const sunResult = results.find(r => r.coreId === orderSunCore.id)
  const moonResult = results.find(r => r.coreId === orderMoonCore.id)

  if (!sunResult || !moonResult) return 0

  if (sunResult.totalPoints >= 14 && moonResult.totalPoints >= 14) {
    return SUN_MOON_DESTINY_BONUS
  }

  return 0
}

export function useArkGridSolver() {
  return {
    solveArkGridAsync,
    getMaxPossibleScore,
    getDestinyBonus
  }
}
