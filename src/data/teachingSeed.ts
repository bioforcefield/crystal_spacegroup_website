/**
 * Teaching-AU seed placement: keep symmetry copies of the motif clearly
 * separated in the unit cell (same class of bug as SG 11 · P21/m, where a
 * shared monoclinic seed sat on the mirror at y = ¼).
 *
 * Motif L-arms span ~0.15 cell units; centres closer than ~0.3 read as overlaps
 * in low-Z groups. High-Z packs (96–192) cannot always meet that bar — use
 * {@link scaledMinMotifSeparation} for regression floors.
 */

import { applyOperator, fracToCart } from './math'
import type { CellParams, Operator, Vec3 } from './types'

/** Motif-scale floor used for low-multiplicity teaching cells (see P21/m). */
export const MIN_MOTIF_SEPARATION = 0.3

/**
 * Fallback AU used when a group-specific search is skipped.
 * Off common special positions (0, ¼, ½) and off the diagonal x≈y (tetragonal /
 * cubic mirrors). Slightly better p10 clearance than the old [0.17,0.23,0.31].
 */
export const DEFAULT_TEACHING_SEED: Vec3 = [0.32, 0.09, 0.21]

/** ±1 lattice images for periodic pairwise distance. */
const LATTICE_SHIFTS: Vec3[] = (() => {
  const out: Vec3[] = []
  for (let ix = -1; ix <= 1; ix++) {
    for (let iy = -1; iy <= 1; iy++) {
      for (let iz = -1; iz <= 1; iz++) {
        out.push([ix, iy, iz])
      }
    }
  }
  return out
})()

function cartDist(a: Vec3, b: Vec3, cell: CellParams): number {
  const ca = fracToCart(a, cell)
  const cb = fracToCart(b, cell)
  const dx = ca[0] - cb[0]
  const dy = ca[1] - cb[1]
  const dz = ca[2] - cb[2]
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/**
 * Minimum Cartesian distance between distinct wrapped general-position images,
 * also checking ±1 lattice copies (periodic nearest image).
 */
export function minMotifSeparation(
  operators: Operator[],
  seed: Vec3,
  cell: CellParams,
  /** Optional: abort once a pair is known closer than this (search speed). */
  abortBelow?: number,
): number {
  if (operators.length < 2) return Infinity
  const pts = operators.map((op) => applyOperator(op, seed))
  let min = Infinity
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      let d = cartDist(pts[i]!, pts[j]!, cell)
      for (const s of LATTICE_SHIFTS) {
        if (s[0] === 0 && s[1] === 0 && s[2] === 0) continue
        const q: Vec3 = [
          pts[j]![0] + s[0],
          pts[j]![1] + s[1],
          pts[j]![2] + s[2],
        ]
        d = Math.min(d, cartDist(pts[i]!, q, cell))
        if (d < min) min = d
        if (abortBelow !== undefined && min < abortBelow) return min
      }
      if (d < min) min = d
      if (abortBelow !== undefined && min < abortBelow) return min
    }
  }
  return min
}

/** True when the wrapped orbit has `multiplicity` distinct points. */
export function seedIsGeneralPosition(
  operators: Operator[],
  seed: Vec3,
  multiplicity: number,
): boolean {
  const keys = new Set(
    operators.map((op) =>
      applyOperator(op, seed)
        .map((c) => c.toFixed(8))
        .join(','),
    ),
  )
  return keys.size === multiplicity
}

/**
 * Soft floor for regression tests: denser packs get a lower bar.
 *   Z≤8  → 0.30 · Z≤16 → 0.22 · Z≤48 → 0.14 · Z≤96 → 0.09 · else 0.06
 */
export function scaledMinMotifSeparation(multiplicity: number): number {
  // Dense high-symmetry packs (mm / 6mm / cubic) cannot always clear 0.3 even
  // with an optimised general-position seed in a unit teaching cell.
  if (multiplicity <= 4) return MIN_MOTIF_SEPARATION
  if (multiplicity <= 8) return 0.25
  if (multiplicity <= 16) return 0.18
  if (multiplicity <= 48) return 0.12
  if (multiplicity <= 96) return 0.08
  return 0.055
}

/**
 * Compact candidate grid biased off special positions and off x≈y / y≈z / x≈z
 * (diagonal mirrors). Kept small so pickTeachingSeed is cheap at demo build.
 */
export const TEACHING_SEED_CANDIDATES: readonly Vec3[] = [
  DEFAULT_TEACHING_SEED,
  [0.18, 0.08, 0.31], // P21/m-style clearance from y=¼
  [0.22, 0.15, 0.3],
  [0.17, 0.23, 0.31], // legacy default
  [0.12, 0.19, 0.27], // legacy cubic
  [0.09, 0.32, 0.18],
  [0.11, 0.37, 0.21],
  [0.13, 0.32, 0.07],
  [0.07, 0.32, 0.15],
  [0.07, 0.41, 0.07],
  [0.07, 0.41, 0.21],
  [0.07, 0.21, 0.41],
  [0.07, 0.18, 0.09],
  [0.07, 0.32, 0.11],
  [0.07, 0.37, 0.21],
  [0.09, 0.21, 0.37],
  [0.09, 0.15, 0.37],
  [0.11, 0.18, 0.07],
  [0.11, 0.41, 0.07],
  [0.13, 0.07, 0.13],
  [0.13, 0.07, 0.07],
  [0.13, 0.32, 0.11],
  [0.13, 0.21, 0.09],
  [0.15, 0.32, 0.11],
  [0.18, 0.32, 0.07],
  [0.18, 0.37, 0.13],
  [0.21, 0.07, 0.07],
  [0.21, 0.09, 0.11],
  [0.21, 0.09, 0.37],
  [0.21, 0.11, 0.11],
  [0.21, 0.11, 0.15],
  [0.21, 0.32, 0.15],
  [0.21, 0.41, 0.15],
  [0.28, 0.11, 0.37],
  [0.32, 0.15, 0.21],
  [0.32, 0.21, 0.09],
  [0.32, 0.21, 0.13],
  [0.32, 0.21, 0.41],
  [0.37, 0.13, 0.21],
  [0.41, 0.07, 0.18],
  [0.41, 0.07, 0.07],
  [0.07, 0.13, 0.21],
  [0.07, 0.21, 0.07],
  [0.07, 0.21, 0.32],
  [0.09, 0.21, 0.09],
  [0.09, 0.21, 0.32],
  [0.21, 0.41, 0.32],
  [0.18, 0.11, 0.11],
  [0.18, 0.09, 0.13],
]

/** Lean candidate list for high-Z cubic / F / I packs (search must stay cheap). */
const HIGH_Z_CANDIDATES: readonly Vec3[] = [
  DEFAULT_TEACHING_SEED,
  [0.07, 0.13, 0.21],
  [0.07, 0.21, 0.37],
  [0.09, 0.21, 0.32],
  [0.09, 0.21, 0.37],
  [0.07, 0.37, 0.21],
  [0.11, 0.28, 0.41],
  [0.13, 0.29, 0.41],
  [0.15, 0.28, 0.41],
  [0.21, 0.09, 0.37],
]

export interface PickTeachingSeedOptions {
  /**
   * Prefer this seed when it already meets the scaled clearance floor
   * (hand-tuned AUs stay stable).
   */
  prefer?: Vec3
  /** Extra candidates to try (e.g. a hand-tuned seed). */
  extraCandidates?: Vec3[]
  /**
   * Stop once clearance reaches this absolute value (default: 1.05× scaled floor).
   * Keeps high-Z generated builds out of the critical path.
   */
  goodEnough?: number
}

/**
 * Choose a general-position AU that maximises min motif separation for this
 * operator set + teaching cell.
 */
export function pickTeachingSeed(
  operators: Operator[],
  cell: CellParams,
  multiplicity: number,
  opts: PickTeachingSeedOptions = {},
): Vec3 {
  const floor = scaledMinMotifSeparation(multiplicity)
  const goodEnough = opts.goodEnough ?? floor * 1.05
  const basePool =
    multiplicity > 48 ? HIGH_Z_CANDIDATES : TEACHING_SEED_CANDIDATES
  const pool: Vec3[] = [
    ...(opts.prefer ? [opts.prefer] : []),
    ...(opts.extraCandidates ?? []),
    ...basePool,
  ]

  // Deduplicate
  const seen = new Set<string>()
  const unique: Vec3[] = []
  for (const s of pool) {
    const k = s.map((c) => c.toFixed(5)).join(',')
    if (seen.has(k)) continue
    seen.add(k)
    unique.push(s)
  }

  let best: Vec3 = opts.prefer ?? DEFAULT_TEACHING_SEED
  let bestMin = -1
  let preferMin = -1

  for (const seed of unique) {
    if (!seedIsGeneralPosition(operators, seed, multiplicity)) continue
    // Abort early if this candidate cannot beat the current best.
    const m = minMotifSeparation(
      operators,
      seed,
      cell,
      bestMin >= 0 ? bestMin : undefined,
    )
    if (opts.prefer && seedsEqual(seed, opts.prefer)) {
      preferMin = m
      // Keep a hand-tuned seed that already clears the floor.
      if (m >= floor) {
        return seed
      }
    }
    if (m > bestMin + 1e-12) {
      bestMin = m
      best = seed
      if (m >= goodEnough) {
        return best
      }
    }
  }

  if (opts.prefer && preferMin >= floor) return opts.prefer
  return best
}

function seedsEqual(a: Vec3, b: Vec3): boolean {
  return (
    Math.abs(a[0] - b[0]) < 1e-9 &&
    Math.abs(a[1] - b[1]) < 1e-9 &&
    Math.abs(a[2] - b[2]) < 1e-9
  )
}

/**
 * Projection-readable clearance target from mirror / glide planes (fractional,
 * along the plane normal). P21/m and P21/c use ≈0.17. Dense packs with many
 * plane families get a softer bar.
 */
export function scaledPlaneClearance(multiplicity: number): number {
  if (multiplicity <= 8) return 0.12
  if (multiplicity <= 16) return 0.08
  if (multiplicity <= 48) return 0.04
  return 0.02
}

function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) [a, b] = [b, a % b]
  return a
}

/**
 * Smallest distance (fractional, along the primitive plane normal, divided by
 * its length) from the seed to any mirror or glide plane of the operator set.
 * Glide translations are ignored: this is the "looks on the plane in
 * projection" metric (P21/c c-glide case), not 3D overlap.
 * Returns Infinity when the group has no reflection-type operators.
 */
export function minPlaneClearance(operators: Operator[], seed: Vec3): number {
  let min = Infinity
  for (const op of operators) {
    const R = op.R
    const det =
      R[0]![0]! * (R[1]![1]! * R[2]![2]! - R[1]![2]! * R[2]![1]!) -
      R[0]![1]! * (R[1]![0]! * R[2]![2]! - R[1]![2]! * R[2]![0]!) +
      R[0]![2]! * (R[1]![0]! * R[2]![1]! - R[1]![1]! * R[2]![0]!)
    const trace = R[0]![0]! + R[1]![1]! + R[2]![2]!
    if (Math.round(det) !== -1 || Math.round(trace) !== 1) continue
    // Rows of (R − I) annihilate in-plane vectors → plane normal covector.
    let n: number[] | null = null
    for (let r = 0; r < 3; r++) {
      const row = [0, 1, 2].map((c) => Math.round(R[r]![c]! - (r === c ? 1 : 0)))
      if (row.some((v) => v !== 0)) {
        n = row
        break
      }
    }
    if (!n) continue
    const g = gcd(gcd(n[0]!, n[1]!), n[2]!)
    n = n.map((v) => v / g)
    const img = applyOperator(op, seed)
    const nd =
      n[0]! * (img[0]! - seed[0]) + n[1]! * (img[1]! - seed[1]) + n[2]! * (img[2]! - seed[2])
    const frac = Math.abs(nd - Math.round(nd))
    const clr = frac / 2 / Math.hypot(n[0]!, n[1]!, n[2]!)
    if (clr < min) min = clr
  }
  return min
}


/**
 * Projection-readable radial clearance target from screw / rotation axes
 * (fractional, in the plane ⊥ the axis). P21/c aims ≈0.25–0.30. Dense packs
 * with many axis families get a softer bar.
 */
export function scaledScrewClearance(multiplicity: number): number {
  if (multiplicity <= 4) return 0.18
  if (multiplicity <= 8) return 0.14
  if (multiplicity <= 16) return 0.10
  if (multiplicity <= 48) return 0.06
  return 0.03
}

export type ScrewAxisLike = {
  origin: Vec3
  direction: Vec3
}

/**
 * Smallest perpendicular distance (fractional L2 in the plane ⊥ the axis)
 * from the seed to any screw/rotation axis, wrapping to the nearest lattice
 * image of each axis (±1 cells). Returns Infinity when `screwAxes` is empty.
 *
 * When `cell` is provided, the same foot-of-perpendicular is measured in
 * Cartesian teaching-cell units (useful for non-orthogonal cells).
 */
export function minScrewClearance(
  seed: Vec3,
  screwAxes: readonly ScrewAxisLike[],
  cell?: CellParams,
): number {
  if (!screwAxes.length) return Infinity
  let min = Infinity
  for (const ax of screwAxes) {
    const d = ax.direction
    const len2 = d[0]! * d[0]! + d[1]! * d[1]! + d[2]! * d[2]!
    if (len2 < 1e-18) continue
    for (let ix = -1; ix <= 1; ix++) {
      for (let iy = -1; iy <= 1; iy++) {
        for (let iz = -1; iz <= 1; iz++) {
          const O: Vec3 = [
            ax.origin[0]! + ix,
            ax.origin[1]! + iy,
            ax.origin[2]! + iz,
          ]
          const v: Vec3 = [
            seed[0]! - O[0],
            seed[1]! - O[1],
            seed[2]! - O[2],
          ]
          const t = (v[0]! * d[0]! + v[1]! * d[1]! + v[2]! * d[2]!) / len2
          const foot: Vec3 = [
            O[0]! + t * d[0]!,
            O[1]! + t * d[1]!,
            O[2]! + t * d[2]!,
          ]
          const dist = cell
            ? cartDist(seed, foot, cell)
            : Math.hypot(
                seed[0]! - foot[0]!,
                seed[1]! - foot[1]!,
                seed[2]! - foot[2]!,
              )
          if (dist < min) min = dist
        }
      }
    }
  }
  return min
}
