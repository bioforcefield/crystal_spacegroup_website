/**
 * CIF placement modes mirroring SG demos (SpaceGroupPage):
 * - nearest ("Near"): translate intact molecules by lattice vectors so they
 *   sit next to the selected symmetry element (may leave the cell).
 * - wrapped ("Cell"): every atom at its wrapped [0,1)³ image inside the cell.
 *
 * Lattice ±1 search and outside-cell penalty are shared with
 * `latticeNeighbors` / `nearestImages` (same Near/Cell semantics).
 */

import { addFrac, fracToCart } from '../math'
import {
  LATTICE_NEIGHBORS,
  bestNeighborShift,
  outsideCellPenalty,
} from '../latticeNeighbors'
import { distToElement, pairScore } from '../nearestImages'
import type { PlacementMode } from '../nearestImages'
import type { SpaceGroupDemo, Vec3 } from '../types'
import type { ExpandedStructure, SymmetryCopyAtom } from './types'

export type CifPlacementMode = PlacementMode // 'nearest' | 'wrapped'

function moleculeCentroidFrac(
  atoms: SymmetryCopyAtom[],
  indices: number[],
  useDisplay: boolean,
): Vec3 {
  const n = indices.length || 1
  let x = 0
  let y = 0
  let z = 0
  for (const i of indices) {
    const a = atoms[i]!
    const f = useDisplay ? a.displayFractional : a.fractional
    x += f[0]
    y += f[1]
    z += f[2]
  }
  return [x / n, y / n, z / n]
}

/** Best lattice shift for a fractional point relative to the selected element. */
export function bestLatticeShift(
  frac: Vec3,
  demo: SpaceGroupDemo,
  selectedOpIndex: number,
): Vec3 {
  const op =
    demo.operators.find((o) => o.index === selectedOpIndex) ??
    demo.operators[0]
  if (!op || op.classId === 'identity') {
    return bestNeighborShift(frac, (cand) => outsideCellPenalty(cand))
  }
  return bestNeighborShift(
    frac,
    (cand) => distToElement(demo, cand, op) + 0.2 * outsideCellPenalty(cand),
  )
}

export interface CifPlacementResult {
  /** Cartesian draw positions, same length as structure.atoms. */
  positions: Vec3[]
  /** Fractional draw positions (for tests / diagnostics). */
  fractionals: Vec3[]
  mode: CifPlacementMode
}

/**
 * Place CIF atoms for drawing.
 * - wrapped: use wrapped cartesian (in-cell); molecules may appear cut at faces.
 * - nearest: keep intact-molecule relative geometry; translate each molecule
 *   by a lattice vector so its centroid sits near the selected element.
 */
/** True when R·R = I (2-fold, mirror, inversion — pair midpoint is on the element). */
export function isOrderTwo(R: number[][] | number[]): boolean {
  const M = (Array.isArray(R[0]) ? R : [R.slice(0, 3), R.slice(3, 6), R.slice(6, 9)]) as number[][]
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      let v = 0
      for (let k = 0; k < 3; k++) v += M[i]![k]! * M[k]![j]!
      if (Math.abs(v - (i === j ? 1 : 0)) > 1e-6) return false
    }
  return true
}

/** Midpoint-on-drawn-element dominates the SG pairScore tie-breakers. */
const PAIR_MIDPOINT_WEIGHT = 1000

export function placeCifStructure(
  structure: ExpandedStructure,
  mode: CifPlacementMode,
  selectedOp: number,
  demo: SpaceGroupDemo | null,
): CifPlacementResult {
  const n = structure.atoms.length
  const fractionals: Vec3[] = new Array(n)
  const positions: Vec3[] = new Array(n)

  if (mode === 'wrapped' || n === 0) {
    for (let i = 0; i < n; i++) {
      const a = structure.atoms[i]!
      fractionals[i] = [...a.fractional] as Vec3
      positions[i] = [...a.cartesian] as Vec3
    }
    return { positions, fractionals, mode: 'wrapped' }
  }

  // nearest — group by moleculeId
  const byMol = new Map<number, number[]>()
  for (let i = 0; i < n; i++) {
    const mid = structure.atoms[i]!.moleculeId
    let list = byMol.get(mid)
    if (!list) {
      list = []
      byMol.set(mid, list)
    }
    list.push(i)
  }

  const shifts = new Map<number, Vec3>()
  for (const [mid, indices] of byMol) {
    const centroid = moleculeCentroidFrac(structure.atoms, indices, true)
    if (demo) {
      shifts.set(mid, bestLatticeShift(centroid, demo, selectedOp))
    } else {
      shifts.set(mid, [0, 0, 0])
    }
  }

  // Pair each selected-op molecule with its AU source (shared auIndex) and
  // shift both jointly with the SG-page pairScore so the selected symmetry
  // element sits *between* BASE and IMAGE (independent per-molecule nearest
  // shifts could park both on the same side of the axis/centre).
  const op = demo?.operators.find((o) => o.index === selectedOp)
  if (demo && op && op.classId !== 'identity' && selectedOp !== 1) {
    const auMolOf = new Map<number, number>()
    for (const a of structure.atoms) {
      if (a.opIndex === 1 && !auMolOf.has(a.auIndex)) auMolOf.set(a.auIndex, a.moleculeId)
    }
    const pairedAu = new Set<number>()
    const order2 = isOrderTwo(op.R)
    for (const [mid, indices] of byMol) {
      const first = structure.atoms[indices[0]!]!
      if (first.opIndex !== selectedOp) continue
      const auMid = auMolOf.get(first.auIndex)
      if (auMid == null || pairedAu.has(auMid)) continue
      const cA = moleculeCentroidFrac(structure.atoms, byMol.get(auMid)!, true)
      const cM = moleculeCentroidFrac(structure.atoms, indices, true)
      let best = Infinity
      let sA: Vec3 = [0, 0, 0]
      let sM: Vec3 = [0, 0, 0]
      for (const nA of LATTICE_NEIGHBORS) {
        const base = addFrac(cA, nA)
        for (const nM of LATTICE_NEIGHBORS) {
          const image = addFrac(cM, nM)
          const mid: Vec3 = [
            (base[0] + image[0]) / 2,
            (base[1] + image[1]) / 2,
            (base[2] + image[2]) / 2,
          ]
          // Hard rule: the pair midpoint must lie on the *drawn* element
          // instance (distToElement is not lattice-periodic), so other
          // equivalent instances (e.g. 2₁ at x=½ when x=0 is drawn) lose.
          // Order-2 ops (2, 2₁, m, glides, 1̄): midpoint on the element.
          // Higher order (3/4/6, screws, rotoinversions): the midpoint is not
          // on the axis, so require equal distance to the drawn instance.
          const miss = order2
            ? distToElement(demo, mid, op)
            : Math.abs(distToElement(demo, base, op) - distToElement(demo, image, op))
          const sc =
            PAIR_MIDPOINT_WEIGHT * miss +
            pairScore(demo, base, image, op)
          if (sc < best - 1e-9) {
            best = sc
            sA = nA
            sM = nM
          }
        }
      }
      shifts.set(auMid, sA)
      shifts.set(mid, sM)
      pairedAu.add(auMid)
    }
  }

  for (let i = 0; i < n; i++) {
    const a = structure.atoms[i]!
    const shift = shifts.get(a.moleculeId) ?? ([0, 0, 0] as Vec3)
    const frac = addFrac(a.displayFractional, shift)
    fractionals[i] = frac
    positions[i] = fracToCart(frac, structure.cell)
  }

  return { positions, fractionals, mode: 'nearest' }
}

/** Whether a bond should be drawn in wrapped (Cell) mode: endpoints close in wrapped cart. */
export function bondVisibleInWrapped(
  aCart: Vec3,
  bCart: Vec3,
  maxDist = 3.5,
): boolean {
  const d = Math.hypot(
    aCart[0] - bCart[0],
    aCart[1] - bCart[1],
    aCart[2] - bCart[2],
  )
  return d <= maxDist
}
