/** Build Operator[] from ITA triplets with heuristic labels/classIds. */

import type { Mat3, Operator, SymmetryClassId, Vec3 } from '../types'
import { det3 } from '../math'
import { matClose } from './composeOps'
import { parseTriplet } from './parseTriplet'

const I: Mat3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
]
const NEG_I: Mat3 = [
  [-1, 0, 0],
  [0, -1, 0],
  [0, 0, -1],
]
const TWO_B: Mat3 = [
  [-1, 0, 0],
  [0, 1, 0],
  [0, 0, -1],
]
const MIRROR_B: Mat3 = [
  [1, 0, 0],
  [0, -1, 0],
  [0, 0, 1],
]

function classify(R: Mat3, t: Vec3): { classId: SymmetryClassId; label: string } {
  if (matClose(R, I, 1e-6)) {
    const hasT = t.some((c) => Math.abs(((c % 1) + 1) % 1) > 1e-6)
    return {
      classId: 'identity',
      label: hasT ? 'Lattice translation' : 'Identity',
    }
  }
  if (matClose(R, NEG_I, 1e-6)) {
    return { classId: 'inversion', label: 'Inversion (−1)' }
  }
  if (matClose(R, TWO_B, 1e-6)) {
    const ty = ((t[1] % 1) + 1) % 1
    if (Math.abs(ty - 0.5) < 0.08) {
      return { classId: 'screw', label: '2₁ screw ‖ b' }
    }
    return { classId: 'twofold', label: '2-fold ‖ b' }
  }
  // 3-fold ‖ c (hex/trigonal): −y,x−y,z and −x+y,−x,z
  const THREE_P: Mat3 = [
    [0, -1, 0],
    [1, -1, 0],
    [0, 0, 1],
  ]
  const THREE_M: Mat3 = [
    [-1, 1, 0],
    [-1, 0, 0],
    [0, 0, 1],
  ]
  if (matClose(R, THREE_P, 1e-6) || matClose(R, THREE_M, 1e-6)) {
    return { classId: 'threefold', label: '3-fold ‖ c' }
  }
  // −3 ‖ c (rotoinversion): y,−x+y,−z and x−y,x,−z
  const BAR3_A: Mat3 = [
    [0, 1, 0],
    [-1, 1, 0],
    [0, 0, -1],
  ]
  const BAR3_B: Mat3 = [
    [1, -1, 0],
    [1, 0, 0],
    [0, 0, -1],
  ]
  if (matClose(R, BAR3_A, 1e-6) || matClose(R, BAR3_B, 1e-6)) {
    return { classId: 'threefold', label: '−3 ‖ c' }
  }
  if (matClose(R, MIRROR_B, 1e-6)) {
    const tx = ((t[0] % 1) + 1) % 1
    const tz = ((t[2] % 1) + 1) % 1
    const gx = Math.abs(tx) > 1e-3 && Math.abs(tx - 1) > 1e-3
    const gz = Math.abs(tz) > 1e-3 && Math.abs(tz - 1) > 1e-3
    if (gx && gz) return { classId: 'n-glide', label: 'n-glide ⊥ b' }
    if (gx) return { classId: 'a-glide', label: 'a-glide ⊥ b' }
    if (gz) return { classId: 'c-glide', label: 'c-glide ⊥ b' }
    return { classId: 'c-glide', label: 'mirror ⊥ b' }
  }
  // Fallback: improper → treat as glide-ish; proper → screw-ish
  if (det3(R) < 0) {
    return { classId: 'c-glide', label: 'improper (heuristic)' }
  }
  return { classId: 'screw', label: 'rotation/screw (heuristic)' }
}

function seitzString(t: Vec3): string {
  const fmt = (v: number) => {
    const w = ((v % 1) + 1) % 1
    if (Math.abs(w) < 1e-6) return '0'
    if (Math.abs(w - 0.5) < 1e-6) return '½'
    if (Math.abs(w - 0.25) < 1e-6) return '¼'
    if (Math.abs(w - 0.75) < 1e-6) return '¾'
    return w.toFixed(3)
  }
  return `{R | ${fmt(t[0])},${fmt(t[1])},${fmt(t[2])}}`
}

/**
 * Parse triplets into Operator[]. Labels/classIds are heuristics
 * (identity / inversion / unique-b 2·2₁ / glides ⊥ b); refine by hand for demos.
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
