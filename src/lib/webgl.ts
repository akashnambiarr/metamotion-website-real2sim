import {
  DPR_CAP_DESKTOP,
  DPR_CAP_MOBILE,
  HERO_POINTS_DESKTOP,
  HERO_POINTS_MOBILE,
} from '../config'

export function supportsWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return canvas.getContext('webgl2') !== null
  } catch {
    return false
  }
}

function isCoarsePointer(): boolean {
  return window.matchMedia('(pointer: coarse)').matches
}

function deviceMemoryGb(): number | undefined {
  return (navigator as { deviceMemory?: number }).deviceMemory
}

/** Very low-memory devices skip WebGL entirely and keep the poster. */
export function shouldUsePoster(): boolean {
  const mem = deviceMemoryGb()
  return !supportsWebGL2() || (mem !== undefined && mem <= 2)
}

export function pickPointBudget(): number {
  return isCoarsePointer() ? HERO_POINTS_MOBILE : HERO_POINTS_DESKTOP
}

export function pickDprCap(): number {
  return isCoarsePointer() ? DPR_CAP_MOBILE : DPR_CAP_DESKTOP
}

export function pickAntialias(): boolean {
  return !isCoarsePointer()
}

export function pickPowerPreference(): WebGLPowerPreference {
  return isCoarsePointer() ? 'low-power' : 'high-performance'
}

/** Read a CSS custom property (color tokens) so canvas colors never drift from CSS. */
export function cssToken(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}
