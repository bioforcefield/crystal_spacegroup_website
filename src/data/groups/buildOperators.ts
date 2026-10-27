/** Build Operator[] from ITA triplets with det/trace-based labels/classIds. */

import type { Mat3, Operator, SymmetryClassId, Vec3 } from '../types'
import { det3 } from '../math'
import { matClose } from './composeOps'
import { parseTriplet } from './parseTriplet'

const EPS = 1e-3

const I: Mat3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
]

function trace3(R: Mat3): number {
  return R[0][0] + R[1][1] + R[2][2]
}

function fracPart(v: number): number {
  return ((v % 1) + 1) % 1
}

function nearZero(v: number): boolean {
  const w = fracPart(v)
  return w < EPS || w > 1 - EPS
}

function nearHalf(v: number): boolean {
  return Math.abs(fracPart(v) - 0.5) < 0.08
}

function nearQuarter(v: number): boolean {
  const w = fracPart(v)
  return Math.abs(w - 0.25) < 0.08 || Math.abs(w - 0.75) < 0.08
}

function hasNontrivialT(t: Vec3): boolean {
  return t.some((c) => !nearZero(c))
}

/** Axis-aligned 2-fold: eigenvalue +1 along that axis. */
function twofoldAxisIndex(R: Mat3): 0 | 1 | 2 | null {
  const TWO_A: Mat3 = [
    [1, 0, 0],
    [0, -1, 0],
    [0, 0, -1],
  ]
  const TWO_B: Mat3 = [
    [-1, 0, 0],
    [0, 1, 0],
    [0, 0, -1],
  ]
  const TWO_C: Mat3 = [
    [-1, 0, 0],
    [0, -1, 0],
    [0, 0, 1],
  ]
  if (matClose(R, TWO_A, EPS)) return 0
  if (matClose(R, TWO_B, EPS)) return 1
  if (matClose(R, TWO_C, EPS)) return 2
  return null
}

/** Axis-aligned mirror: eigenvalue −1 along the normal. */
function mirrorNormalIndex(R: Mat3): 0 | 1 | 2 | null {
  const M_A: Mat3 = [
    [-1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ]
  const M_B: Mat3 = [
    [1, 0, 0],
    [0, -1, 0],
    [0, 0, 1],
  ]
  const M_C: Mat3 = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, -1],
  ]
  if (matClose(R, M_A, EPS)) return 0
  if (matClose(R, M_B, EPS)) return 1
  if (matClose(R, M_C, EPS)) return 2
  return null
}

const AXIS_NAME = ['a', 'b', 'c'] as const

function classifyAxisAlignedGlide(
  normal: 0 | 1 | 2,
  t: Vec3,
): { classId: SymmetryClassId; label: string } {
  const inPlane = [0, 1, 2].filter((i) => i !== normal) as (0 | 1 | 2)[]
  const g0 = !nearZero(t[inPlane[0]!])
  const g1 = !nearZero(t[inPlane[1]!])
  const q0 = nearQuarter(t[inPlane[0]!])
  const q1 = nearQuarter(t[inPlane[1]!])
  const axis = AXIS_NAME[normal]

  if (!g0 && !g1) {
    return { classId: 'mirror', label: `mirror ⊥ ${axis}` }
  }
  // Diamond glide: both in-plane components ≈ ¼ or ¾
  if (q0 && q1) {
    return { classId: 'd-glide', label: `d-glide ⊥ ${axis}` }
  }
  if (g0 && g1) {
    return { classId: 'n-glide', label: `n-glide ⊥ ${axis}` }
  }
  // Single in-plane component → a/b/c glide named by that axis
  const glideAxis = g0 ? inPlane[0]! : inPlane[1]!
  const letter = AXIS_NAME[glideAxis]
  const classId = `${letter}-glide` as SymmetryClassId
  return { classId, label: `${letter}-glide ⊥ ${axis}` }
}

function classifyImproperMirrorLike(
  R: Mat3,
  t: Vec3,
): { classId: SymmetryClassId; label: string } {
  const n = mirrorNormalIndex(R)
  if (n !== null) return classifyAxisAlignedGlide(n, t)

  // Non-axis-aligned mirror/glide (e.g. diagonal in cubic/hex)
  const qt = t.filter((c) => nearQuarter(c)).length
  const nontrivial = t.filter((c) => !nearZero(c)).length
  if (qt >= 2) {
    return { classId: 'd-glide', label: 'd-glide (diagonal)' }
  }
  if (nontrivial >= 2) {
    return { classId: 'n-glide', label: 'n-glide / diagonal glide' }
  }
  if (nontrivial === 1) {
    const i = t.findIndex((c) => !nearZero(c)) as 0 | 1 | 2
    const letter = AXIS_NAME[i] ?? 'c'
    return {
      classId: `${letter}-glide` as SymmetryClassId,
      label: `${letter}-glide (diagonal plane)`,
    }
  }
  return { classId: 'mirror', label: 'mirror (diagonal)' }
}

function classifyTwofoldLike(
  R: Mat3,
  t: Vec3,
): { classId: SymmetryClassId; label: string } {
  const ax = twofoldAxisIndex(R)
  if (ax !== null) {
    const parallel = t[ax]!
    if (nearHalf(parallel)) {
      return { classId: 'screw', label: `2₁ screw ‖ ${AXIS_NAME[ax]}` }
    }
    if (nearZero(parallel)) {
      return { classId: 'twofold', label: `2-fold ‖ ${AXIS_NAME[ax]}` }
    }
    return { classId: 'screw', label: `2-fold / screw ‖ ${AXIS_NAME[ax]}` }
  }
  // Body/face diagonal 2-folds (common in cubic)
  const screwish = t.some((c) => nearHalf(c) || nearQuarter(c))
  if (screwish) {
    return { classId: 'screw', label: '2-fold / 2₁ (diagonal)' }
  }
  return { classId: 'twofold', label: '2-fold (diagonal)' }
}

function classifyFourfoldLike(
  t: Vec3,
): { classId: SymmetryClassId; label: string } {
  // Prefer ‖ c when tz indicates screw; else generic
  if (nearQuarter(t[2]) || nearHalf(t[2])) {
    if (nearHalf(t[2])) return { classId: 'screw', label: '4₂ screw' }
    const w = fracPart(t[2])
    if (Math.abs(w - 0.25) < 0.08) return { classId: 'screw', label: '4₁ screw' }
    if (Math.abs(w - 0.75) < 0.08) return { classId: 'screw', label: '4₃ screw' }
    return { classId: 'screw', label: '4ₙ screw' }
  }
  if (t.some((c) => nearQuarter(c) || nearHalf(c))) {
    return { classId: 'screw', label: '4ₙ / 4-fold screw' }
  }
  return { classId: 'fourfold', label: '4-fold' }
}

function classifySixfoldLike(
  t: Vec3,
): { classId: SymmetryClassId; label: string } {
  if (nearHalf(t[2])) return { classId: 'screw', label: '6₃ screw ‖ c' }
  if (nearQuarter(t[2])) return { classId: 'screw', label: '6ₙ screw ‖ c' }
  if (hasNontrivialT(t)) return { classId: 'screw', label: '6-fold / 6ₙ' }
  return { classId: 'screw', label: '6-fold ‖ c' }
}

/**
 * Classify R|t by det(R) and tr(R) (crystallographic rotation orders),
 * then refine screws/glides from the translation part.
 *
 * Proper (det=+1): tr 3→1, −1→2, 0→3, 1→4, 2→6
 * Improper (det=−1): tr −3→−1, 1→m, 0→−3, −1→−4, −2→−6
 */
export function classify(
  R: Mat3,
  t: Vec3,
): { classId: SymmetryClassId; label: string } {
  if (matClose(R, I, 1e-6)) {
    return {
      classId: 'identity',
      label: hasNontrivialT(t) ? 'Lattice translation' : 'Identity',
    }
  }

  const det = Math.round(det3(R))
  const tr = Math.round(trace3(R))

  // —— Proper ——
  if (det === 1) {
    if (tr === 3) {
      return {
        classId: 'identity',
        label: hasNontrivialT(t) ? 'Lattice translation' : 'Identity',
      }
    }
    if (tr === -1) return classifyTwofoldLike(R, t)
    if (tr === 0) {
      return {
        classId: 'threefold',
        label: hasNontrivialT(t) ? '3ₙ screw / 3-fold' : '3-fold',
      }
    }
    if (tr === 1) return classifyFourfoldLike(t)
    if (tr === 2) return classifySixfoldLike(t)
    return { classId: 'screw', label: `rotation (tr=${tr})` }
  }

  // —— Improper ——
  if (det === -1) {
    if (tr === -3) {
      return { classId: 'inversion', label: 'Inversion (−1)' }
    }
    if (tr === 1) return classifyImproperMirrorLike(R, t)
    if (tr === 0) {
      return { classId: 'threefold', label: '−3 rotoinversion' }
    }
    if (tr === -1) {
      return { classId: 'fourfold', label: '−4 rotoinversion' }
    }
    if (tr === -2) {
      return { classId: 'threefold', label: '−6 rotoinversion' }
    }
    // Fallback: still an improper isometry — prefer mirror/glide family over inventing c-glide
    return classifyImproperMirrorLike(R, t)
  }

  // Non-orthogonal / unexpected det — should not happen for ITA ops
  return { classId: 'identity', label: `unclassified (det=${det}, tr=${tr})` }
}

function seitzString(t: Vec3): string {
  const fmt = (v: number) => {
    const w = fracPart(v)
    if (Math.abs(w) < 1e-6) return '0'
    if (Math.abs(w - 0.5) < 1e-6) return '½'
    if (Math.abs(w - 0.25) < 1e-6) return '¼'
    if (Math.abs(w - 0.75) < 1e-6) return '¾'
    return w.toFixed(3)
  }
  return `{R | ${fmt(t[0])},${fmt(t[1])},${fmt(t[2])}}`
}

/**
 * Parse triplets into Operator[]. Labels/classIds use det/trace classification
 * with axis-aligned screw/glide refinement. Hand demos may still polish further.
 */
export function buildOperatorsFromTriplets(triplets: string[]): Operator[] {
  return triplets.map((triplet, i) => {
    const { R, t } = parseTriplet(triplet)
    const { classId, label } = classify(R, t)
    return {
      index: i + 1,
      triplet,
      label,
      classId,
      R,
      t,
      seitz: seitzString(t),
    }
  })
}
