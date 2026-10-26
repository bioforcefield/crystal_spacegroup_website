/**
 * UCL-style lattice placement: choose periodic copies of BASE / IMAGE
 * (and the other general-position motifs) that sit next to the selected
 * symmetry element, instead of always wrapping into [0, 1)³.
 */

import {
  CELL,
  OPERATORS,
  SEED,
  applyOperator,
  applyOperatorRaw,
  addFrac,
  classColor,
  fracToCart,
  isImproper,
  wrap01,
  type CellParams,
  type GeneralPoint,
  type Operator,
  type Vec3,
} from './pbca'
import {
  GLIDE_PLANES,
  INVERSION_CENTERS,
  SCREW_AXES,
} from './symmetryElements'

export type PlacementMode = 'nearest' | 'wrapped'

const LATTICE: Vec3[] = (() => {
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

function cartDist(a: Vec3, b: Vec3, cell: CellParams): number {
  const ca = fracToCart(a, cell)
  const cb = fracToCart(b, cell)
  const dx = ca[0] - cb[0]
  const dy = ca[1] - cb[1]
  const dz = ca[2] - cb[2]
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/** How far a fractional point sits outside the unit cube [0, 1]³. */
function outsidePenalty(p: Vec3): number {
  let s = 0
  for (let i = 0; i < 3; i++) {
    if (p[i] < 0) s += -p[i]
    else if (p[i] > 1) s += p[i] - 1
  }
  return s
}

/** Perpendicular distance from fractional point to infinite screw axis. */
function distToScrewAxis(
  p: Vec3,
  origin: Vec3,
  direction: Vec3,
  cell: CellParams,
): number {
  const pc = fracToCart(p, cell)
  const oc = fracToCart(origin, cell)
  const dc: Vec3 = [
    direction[0] * cell.a,
    direction[1] * cell.b,
    direction[2] * cell.c,
  ]
  const len = Math.sqrt(dc[0] * dc[0] + dc[1] * dc[1] + dc[2] * dc[2]) || 1
  const ux = dc[0] / len
  const uy = dc[1] / len
  const uz = dc[2] / len
  const vx = pc[0] - oc[0]
  const vy = pc[1] - oc[1]
  const vz = pc[2] - oc[2]
  const dot = vx * ux + vy * uy + vz * uz
  const cx = vx - dot * ux
  const cy = vy - dot * uy
  const cz = vz - dot * uz
  return Math.sqrt(cx * cx + cy * cy + cz * cz)
}

/** Distance from fractional point to a glide plane (constant along normalAxis). */
function distToGlidePlane(
  p: Vec3,
  planeValue: number,
  normalAxis: 0 | 1 | 2,
  cell: CellParams,
): number {
  const axisLen = normalAxis === 0 ? cell.a : normalAxis === 1 ? cell.b : cell.c
  return Math.abs(p[normalAxis] - planeValue) * axisLen
}

function distToPoint(p: Vec3, target: Vec3, cell: CellParams): number {
  return cartDist(p, target, cell)
}

/** Distance from a fractional point to the primary element of the selected operator. */
export function distToElement(
  p: Vec3,
  op: Operator,
  cell: CellParams = CELL,
): number {
  switch (op.classId) {
    case 'identity': {
      const center: Vec3 = [0.5, 0.5, 0.5]
      return cartDist(p, center, cell)
    }
    case 'screw': {
      const axis = SCREW_AXES.find((s) => s.opIndex === op.index && s.primary)
      if (!axis) return 0
      return distToScrewAxis(p, axis.origin, axis.direction, cell)
    }
    case 'inversion': {
      const center =
        INVERSION_CENTERS.find((c) => c.primary)?.position ?? ([0, 0, 0] as Vec3)
      return distToPoint(p, center, cell)
    }
    case 'a-glide':
    case 'b-glide':
    case 'c-glide': {
      const plane = GLIDE_PLANES.find(
        (g) => g.opIndex === op.index && g.primary,
      )
      if (!plane) return 0
      return distToGlidePlane(p, plane.planeValue, plane.normalAxis, cell)
    }
    default:
      return 0
  }
}

export interface PlacementResult {
  /** Lattice-adjusted general positions (fractional may leave [0,1)). */
  points: GeneralPoint[]
  /** Cartesian position of BASE (op 1) used for connector / ghost. */
  baseCartesian: Vec3
  /** Cartesian position of selected IMAGE. */
  imageCartesian: Vec3
}

function makePoint(op: Operator, fractional: Vec3, cell: CellParams): GeneralPoint {
  return {
    index: op.index,
    fractional,
    cartesian: fracToCart(fractional, cell),
    operator: op,
    improper: isImproper(op.R),
    classId: op.classId,
    classColor: classColor(op.classId),
  }
}

/**
 * Wrapped mode: every general position folded into [0, 1)³ (legacy behaviour).
 */
function placedWrapped(seed: Vec3, cell: CellParams): PlacementResult {
  const points = OPERATORS.map((op) =>
    makePoint(op, applyOperator(op, seed), cell),
  )
  const base = points[0]
  return {
    points,
    baseCartesian: base.cartesian,
    imageCartesian: base.cartesian,
  }
}

/**
 * Score for a BASE/IMAGE candidate pair relative to the selected element.
 * Primary: hug the element + keep the pair compact.
 * Soft outside penalty breaks ties along infinite axes / planes so motifs
 * stay near the drawn unit cell (UCL-style neighbour cells, not far cells).
 */
function pairScore(
  base: Vec3,
  image: Vec3,
  op: Operator,
  cell: CellParams,
): number {
  return (
    distToElement(base, op, cell) +
    distToElement(image, op, cell) +
    0.25 * cartDist(base, image, cell) +
    0.2 * (outsidePenalty(base) + outsidePenalty(image))
  )
}

/**
 * Nearest mode: for the selected operator, search lattice translates of
 * BASE (= seed) and IMAGE (= R·BASE + t) over {-1,0,1}³ and pick the pair
 * that hugs the geometric element. Other motifs snap to the same element.
 */
function placedNearest(
  seed: Vec3,
  selectedIndex: number,
  cell: CellParams,
): PlacementResult {
  const seed0: Vec3 = [wrap01(seed[0]), wrap01(seed[1]), wrap01(seed[2])]
  const selectedOp =
    OPERATORS.find((o) => o.index === selectedIndex) ?? OPERATORS[0]

  // Identity: keep everything in the cell
  if (selectedOp.classId === 'identity') {
    return placedWrapped(seed0, cell)
  }

  let bestScore = Infinity
  let bestBase: Vec3 = seed0
  let bestImage: Vec3 = applyOperatorRaw(selectedOp, seed0)

  for (const nBase of LATTICE) {
    const base = addFrac(seed0, nBase)
    const rawImage = applyOperatorRaw(selectedOp, base)
    for (const nImg of LATTICE) {
      const image = addFrac(rawImage, nImg)
      const score = pairScore(base, image, selectedOp, cell)
      if (score < bestScore - 1e-9) {
        bestScore = score
        bestBase = base
        bestImage = image
      }
    }
  }

  const points: GeneralPoint[] = OPERATORS.map((op) => {
    if (op.index === 1) {
      return makePoint(op, bestBase, cell)
    }
    if (op.index === selectedOp.index) {
      return makePoint(op, bestImage, cell)
    }
    // Other motifs: raw image of seed0, then lattice translate nearest the element
    // (with a soft outside penalty so they stay nearby).
    const raw = applyOperatorRaw(op, seed0)
    let best = raw
    let bestD = Infinity
    for (const n of LATTICE) {
      const cand = addFrac(raw, n)
      const d =
        distToElement(cand, selectedOp, cell) + 0.2 * outsidePenalty(cand)
      if (d < bestD - 1e-9) {
        bestD = d
        best = cand
      }
    }
    return makePoint(op, best, cell)
  })

  return {
    points,
    baseCartesian: fracToCart(bestBase, cell),
    imageCartesian: fracToCart(bestImage, cell),
  }
}

/**
 * Place all general-position motifs for the given selection + mode.
 */
export function placedPositions(
  selectedIndex: number,
  mode: PlacementMode = 'nearest',
  seed: Vec3 = SEED,
  cell: CellParams = CELL,
): PlacementResult {
  if (mode === 'wrapped') {
    const result = placedWrapped(seed, cell)
    const image =
      result.points.find((p) => p.index === selectedIndex) ?? result.points[0]
    return {
      ...result,
      imageCartesian: image.cartesian,
    }
  }
  return placedNearest(seed, selectedIndex, cell)
}
