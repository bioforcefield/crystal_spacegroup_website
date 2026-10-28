/** Pure lattice readout for the CIF cell HUD (no React — unit-tested). */

import type { CellParams } from '../types'

export type CellBadgeModel = {
  aText: string
  bText: string
  cText: string
  anglesText: string
  originText: string
  orthorhombic: boolean
}

function fmtLen(v: number): string {
  return v >= 10 ? v.toFixed(2) : v.toFixed(3)
}

function fmtAngle(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

/** Compact always-visible a/b/c + angles + origin — no expand gate. */
export function cellBadgeModel(cell: CellParams): CellBadgeModel {
  const alpha = cell.alphaDeg ?? 90
  const beta = cell.betaDeg ?? 90
  const gamma = cell.gammaDeg ?? 90
  const orthorhombic =
    Math.abs(alpha - 90) < 1e-3 &&
    Math.abs(beta - 90) < 1e-3 &&
    Math.abs(gamma - 90) < 1e-3
  return {
    aText: `a ${fmtLen(cell.a)} Å`,
    bText: `b ${fmtLen(cell.b)} Å`,
    cText: `c ${fmtLen(cell.c)} Å`,
    anglesText: orthorhombic
      ? 'α = β = γ = 90°'
      : `α ${fmtAngle(alpha)}° · β ${fmtAngle(beta)}° · γ ${fmtAngle(gamma)}°`,
    originText: 'O (0,0,0)',
    orthorhombic,
  }
}
