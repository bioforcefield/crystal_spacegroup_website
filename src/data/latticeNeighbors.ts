/**
 * Shared ±1 lattice-neighbor search used by SG Near/Cell placement
 * and CIF molecule placement (same semantics).
 */

import type { Vec3 } from './types'
import { addFrac } from './math'

/** All integer lattice vectors with each component in {−1,0,+1} (27 cells). */
export const LATTICE_NEIGHBORS: Vec3[] = (() => {
  const out: Vec3[] = []
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      for (let k = -1; k <= 1; k++) {
        out.push([i, j, k])
      }
    }
  }
  return out
})()

/** How far a fractional point sits outside the [0,1)³ cell. */
export function outsideCellPenalty(p: Vec3): number {
  let s = 0
  for (let i = 0; i < 3; i++) {
    if (p[i]! < 0) s += -p[i]!
    else if (p[i]! > 1) s += p[i]! - 1
  }
  return s
}

/**
 * Choose the lattice neighbor n that minimizes score(frac + n).
 * Returns the shift vector n (not the shifted point).
 */
export function bestNeighborShift(
  frac: Vec3,
  score: (cand: Vec3) => number,
  neighbors: Vec3[] = LATTICE_NEIGHBORS,
): Vec3 {
  let best: Vec3 = [0, 0, 0]
  let bestScore = Infinity
  for (const n of neighbors) {
    const cand = addFrac(frac, n)
    const s = score(cand)
    if (s < bestScore - 1e-9) {
      bestScore = s
      best = n
    }
  }
  return best
}
