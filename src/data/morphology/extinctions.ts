/**
 * Reflection conditions from lattice centering and (when available) symmetry
 * operators. Screw/glide conditions come from the algebraic rule:
 *   if hᵀR ≈ hᵀ and h·t is non-integer → systematically absent.
 * Without operators we keep centering-only — do not invent full ITA tables.
 */

import type { Mat3, Operator, Vec3 } from '../types'
import {
  effectiveCentering,
  isAllowedByCentering,
  type CellMetricHint,
  type LatticeCentering,
} from './centering'

const EPS = 1e-6

/** h' = Rᵀ h  (so h·(R x) = h'·x). */
export function transformHkl(R: Mat3, h: number, k: number, l: number): Vec3 {
  return [
    R[0][0] * h + R[1][0] * k + R[2][0] * l,
    R[0][1] * h + R[1][1] * k + R[2][1] * l,
    R[0][2] * h + R[1][2] * k + R[2][2] * l,
  ]
}

function sameHkl(a: Vec3, h: number, k: number, l: number): boolean {
  return (
    Math.abs(a[0] - h) < 0.51 &&
    Math.abs(a[1] - k) < 0.51 &&
    Math.abs(a[2] - l) < 0.51 &&
    Math.abs(Math.round(a[0]) - h) < EPS &&
    Math.abs(Math.round(a[1]) - k) < EPS &&
    Math.abs(Math.round(a[2]) - l) < EPS
  )
}

/**
 * True if (hkl) survives screw/glide (and other) conditions implied by ops.
 * Empty / identity-only lists → allow all (caller still applies centering).
 */
export function isAllowedByOperators(
  operators: readonly Operator[] | null | undefined,
  h: number,
  k: number,
  l: number,
): boolean {
  if (!operators || operators.length === 0) return true
  const hh = Math.round(h)
  const kk = Math.round(k)
  const ll = Math.round(l)
  for (const op of operators) {
    const hp = transformHkl(op.R, hh, kk, ll)
    if (!sameHkl(hp, hh, kk, ll)) continue
    const phase = hh * op.t[0] + kk * op.t[1] + ll * op.t[2]
    const nearest = Math.round(phase)
    if (Math.abs(phase - nearest) > 0.02) return false
  }
  return true
}

export type ExtinctionMode = 'centering-only' | 'centering+operators'

export interface ReflectionGate {
  centering: LatticeCentering
  mode: ExtinctionMode
  allowed: (h: number, k: number, l: number) => boolean
}

/**
 * Build a reflection gate: centering always; operators when a non-trivial list
 * is provided (CIF or demo SG ops).
 */
export function reflectionGate(
  hm: string | null | undefined,
  cell: CellMetricHint | null | undefined,
  operators?: readonly Operator[] | null,
): ReflectionGate {
  const centering = effectiveCentering(hm, cell)
  const useOps = !!(operators && operators.length > 1)
  const mode: ExtinctionMode = useOps ? 'centering+operators' : 'centering-only'
  return {
    centering,
    mode,
    allowed(h, k, l) {
      if (!isAllowedByCentering(centering, h, k, l)) return false
      if (useOps && !isAllowedByOperators(operators, h, k, l)) return false
      return true
    },
  }
}

/**
 * Smallest positive n such that (nh,nk,nl) is allowed by the gate.
 */
export function harkerOrderGate(
  gate: ReflectionGate,
  h: number,
  k: number,
  l: number,
  maxN = 12,
): number | null {
  if (h === 0 && k === 0 && l === 0) return null
  for (let n = 1; n <= maxN; n++) {
    if (gate.allowed(n * h, n * k, n * l)) return n
  }
  return null
}
