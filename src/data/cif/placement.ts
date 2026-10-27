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
  bestNeighborShift,
  outsideCellPenalty,
} from '../latticeNeighbors'
import { distToElement } from '../nearestImages'
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
