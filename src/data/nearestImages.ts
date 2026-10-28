/**
 * UCL-style lattice placement: choose periodic copies of BASE / IMAGE
 * that sit next to the selected symmetry element.
 */

import {
  addFrac,
  applyOperator,
  applyOperatorRaw,
  classColor,
  fracToCart,
  isImproper,
  wrap01,
} from './math'
import type {
  CellParams,
  GeneralPoint,
  Operator,
  SpaceGroupDemo,
  Vec3,
} from './types'
import {
  LATTICE_NEIGHBORS as LATTICE,
  outsideCellPenalty as outsidePenalty,
} from './latticeNeighbors'

export type PlacementMode = 'nearest' | 'wrapped'

/**
 * Teaching screw advance sense: flip `direction` so its dominant crystallographic
 * component is positive, preferring +c, then +b, then +a (ITA right-hand /
 * positive-axis convention). Used as a soft Near tie-break along the screw
 * axis itself (e.g. +b for P21/c 2₁ ‖ b) — not to force large lattice hops.
 */
export function teachingScrewSense(direction: Vec3): Vec3 {
  let dx = direction[0]
  let dy = direction[1]
  let dz = direction[2]
  const dominant =
    Math.abs(dz) >= Math.abs(dy) && Math.abs(dz) >= Math.abs(dx)
      ? 2
      : Math.abs(dy) >= Math.abs(dx)
        ? 1
        : 0
  const comp = dominant === 0 ? dx : dominant === 1 ? dy : dz
  if (comp < 0) {
    dx = -dx
    dy = -dy
    dz = -dz
  }
  // Avoid -0 from signed zero after flip (breaks strict equality in tests).
  return [dx || 0, dy || 0, dz || 0]
}

/** Fractional displacement of image−base projected onto {@link teachingScrewSense}. */
export function screwAdvanceAlongSense(
  base: Vec3,
  image: Vec3,
  direction: Vec3,
): number {
  const s = teachingScrewSense(direction)
  const len = Math.hypot(s[0], s[1], s[2]) || 1
  return (
    ((image[0] - base[0]) * s[0] +
      (image[1] - base[1]) * s[1] +
      (image[2] - base[2]) * s[2]) /
    len
  )
}

/**
 * L1 fractional lattice shift between the raw operator image and a chosen
 * periodic copy. Near mode should stay close to the raw Seitz image so the
 * motif sits across the axis (screw a≈−¼, or C2 2-fold across (0,y,0)) rather
 * than a same-side copy across the cell (a≈¾).
 */
export function screwImageLatticeShift(rawImage: Vec3, image: Vec3): number {
  return (
    Math.abs(image[0] - rawImage[0]) +
    Math.abs(image[1] - rawImage[1]) +
    Math.abs(image[2] - rawImage[2])
  )
}

/**
 * True when the chosen image is the minimal-shift lattice copy of the raw
 * Seitz image (shift < ½ cell on every axis). Useful in tests.
 */
export function isCompactScrewImage(rawImage: Vec3, image: Vec3): boolean {
  return (
    Math.abs(image[0] - rawImage[0]) < 0.5 + 1e-9 &&
    Math.abs(image[1] - rawImage[1]) < 0.5 + 1e-9 &&
    Math.abs(image[2] - rawImage[2]) < 0.5 + 1e-9
  )
}

export {
  LATTICE_NEIGHBORS,
  outsideCellPenalty,
  bestNeighborShift,
} from './latticeNeighbors'

function cartDist(a: Vec3, b: Vec3, cell: CellParams): number {
  const ca = fracToCart(a, cell)
  const cb = fracToCart(b, cell)
  const dx = ca[0] - cb[0]
  const dy = ca[1] - cb[1]
  const dz = ca[2] - cb[2]
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

function distToScrewAxis(
  p: Vec3,
  origin: Vec3,
  direction: Vec3,
  cell: CellParams,
): number {
  // Direction length in Cartesian (independent of which lattice image of the axis).
  const tip0 = fracToCart(
    [
      origin[0] + direction[0],
      origin[1] + direction[1],
      origin[2] + direction[2],
    ],
    cell,
  )
  const oc0 = fracToCart(origin, cell)
  const dc: Vec3 = [tip0[0] - oc0[0], tip0[1] - oc0[1], tip0[2] - oc0[2]]
  const len = Math.sqrt(dc[0] * dc[0] + dc[1] * dc[1] + dc[2] * dc[2]) || 1
  const ux = dc[0] / len
  const uy = dc[1] / len
  const uz = dc[2] / len
  const pc = fracToCart(p, cell)

  // Nearest lattice image of the axis (±1 cells) so Near placements that
  // advance by +1 along c (or a/b) are not falsely far from the element.
  let best = Infinity
  for (let ix = -1; ix <= 1; ix++) {
    for (let iy = -1; iy <= 1; iy++) {
      for (let iz = -1; iz <= 1; iz++) {
        const oc = fracToCart(
          [origin[0] + ix, origin[1] + iy, origin[2] + iz],
          cell,
        )
        const vx = pc[0] - oc[0]
        const vy = pc[1] - oc[1]
        const vz = pc[2] - oc[2]
        const dot = vx * ux + vy * uy + vz * uz
        const cx = vx - dot * ux
        const cy = vy - dot * uy
        const cz = vz - dot * uz
        const d = Math.sqrt(cx * cx + cy * cy + cz * cz)
        if (d < best) best = d
      }
    }
  }
  return best
}

/**
 * Axis-aligned glide/mirror distance when corners are unavailable.
 * Uses |Δfrac| × cell edge along the normal — a teaching approximation that
 * ignores monoclinic a/c obliquity. Prefer {@link distToGlidePlaneSpec} with
 * plane.corners for a true Cartesian normal distance.
 */
function distToGlidePlane(
  p: Vec3,
  planeValue: number,
  normalAxis: 0 | 1 | 2,
  cell: CellParams,
): number {
  const axisLen =
    normalAxis === 0 ? cell.a : normalAxis === 1 ? cell.b : cell.c
  return Math.abs(p[normalAxis] - planeValue) * axisLen
}

function distToGlidePlaneSpec(
  p: Vec3,
  plane: { planeValue?: number; normalAxis?: 0 | 1 | 2; corners?: Vec3[] },
  cell: CellParams,
): number {
  if (plane.corners && plane.corners.length >= 3) {
    const c0 = fracToCart(plane.corners[0], cell)
    const c1 = fracToCart(plane.corners[1], cell)
    const c2 = fracToCart(plane.corners[3] ?? plane.corners[2], cell)
    const e1: Vec3 = [c1[0] - c0[0], c1[1] - c0[1], c1[2] - c0[2]]
    const e2: Vec3 = [c2[0] - c0[0], c2[1] - c0[1], c2[2] - c0[2]]
    const nx = e1[1] * e2[2] - e1[2] * e2[1]
    const ny = e1[2] * e2[0] - e1[0] * e2[2]
    const nz = e1[0] * e2[1] - e1[1] * e2[0]
    const len = Math.hypot(nx, ny, nz) || 1
    const pc = fracToCart(p, cell)
    return Math.abs(
      ((pc[0] - c0[0]) * nx + (pc[1] - c0[1]) * ny + (pc[2] - c0[2]) * nz) / len,
    )
  }
  if (plane.planeValue === undefined || plane.normalAxis === undefined) return 0
  return distToGlidePlane(p, plane.planeValue, plane.normalAxis, cell)
}


function distToPoint(p: Vec3, target: Vec3, cell: CellParams): number {
  return cartDist(p, target, cell)
}

export function distToElement(
  demo: SpaceGroupDemo,
  p: Vec3,
  op: Operator,
): number {
  const cell = demo.cell
  switch (op.classId) {
    case 'identity': {
      const center: Vec3 = [0.5, 0.5, 0.5]
      return cartDist(p, center, cell)
    }
    case 'twofold':
    case 'threefold':
    case 'fourfold':
    case 'sixfold':
    case 'screw': {
      const axis =
        demo.screwAxes.find((s) => s.opIndex === op.index && s.primary) ??
        demo.screwAxes.find((s) => s.opIndex === op.index)
      if (!axis) return 0
      return distToScrewAxis(p, axis.origin, axis.direction, cell)
    }
    case 'mirror': {
      const plane =
        demo.glidePlanes.find((g) => g.opIndex === op.index && g.primary) ??
        demo.glidePlanes.find((g) => g.opIndex === op.index)
      if (!plane) return 0
      return distToGlidePlaneSpec(p, plane, cell)
    }
    case 'inversion': {
      // Prefer inversion center tied to this operator when possible
      let center = demo.inversionCenters.find((c) => c.primary)?.position
      if (op.index !== demo.primaryInversionOp) {
        // Op7 in C2/c: inversion at ¼,¼,0 — fixed point of −x+½,−y+½,−z
        // Fixed point: 2x = t → x = t/2
        const fp: Vec3 = [op.t[0] / 2, op.t[1] / 2, op.t[2] / 2]
        center = fp
      }
      return distToPoint(p, center ?? ([0, 0, 0] as Vec3), cell)
    }
    case 'a-glide':
    case 'b-glide':
    case 'c-glide':
    case 'n-glide':
    case 'd-glide': {
      const plane = demo.glidePlanes.find(
        (g) => g.opIndex === op.index && g.primary,
      )
      if (!plane) return 0
      return distToGlidePlaneSpec(p, plane, cell)
    }
    default:
      return 0
  }
}

export interface PlacementResult {
  points: GeneralPoint[]
  baseCartesian: Vec3
  imageCartesian: Vec3
}

function makePoint(
  demo: SpaceGroupDemo,
  op: Operator,
  fractional: Vec3,
): GeneralPoint {
  return {
    index: op.index,
    fractional,
    cartesian: fracToCart(fractional, demo.cell),
    operator: op,
    improper: isImproper(op.R),
    classId: op.classId,
    classColor: classColor(demo, op.classId),
  }
}

function placedWrapped(demo: SpaceGroupDemo): PlacementResult {
  const points = demo.operators.map((op) =>
    makePoint(demo, op, applyOperator(op, demo.seed)),
  )
  const base = points[0]
  return {
    points,
    baseCartesian: base.cartesian,
    imageCartesian: base.cartesian,
  }
}

/**
 * Near axis scoring weights (ITA teaching cases: P21/c compact −a image,
 * C2 pure 2-fold across (0,y,0), P212121 +c advance, P41/I41 axial screws).
 * Do NOT reintroduce a hard “force Δc ≥ 0” lattice-hop rule — that parked
 * P21/c on the far +a side.
 */
/** Prefer raw Seitz image over a same-side copy across the cell (a≈−¼ vs a≈¾). */
const SCREW_COMPACT_LATTICE_WEIGHT = 0.1
/** Same compact raw-Seitz preference for pure 2-folds (C2 / P2). */
const TWOFOLD_COMPACT_LATTICE_WEIGHT = SCREW_COMPACT_LATTICE_WEIGHT
/** Soft penalty when advance along teachingScrewSense is negative (‖ b for P21/c). */
const SCREW_SENSE_NEG_PENALTY = 0.03
/** Softly discourage |Δc| ≳ ½ when Seitz t_z sets axis height (not screw advance). */
const SCREW_LARGE_DC_HOP_PENALTY = 0.08
const PAIR_BASE_IMAGE_DIST_WEIGHT = 0.25
const PAIR_OUTSIDE_CELL_WEIGHT = 0.2

function pairScore(
  demo: SpaceGroupDemo,
  base: Vec3,
  image: Vec3,
  op: Operator,
): number {
  let score =
    distToElement(demo, base, op) +
    distToElement(demo, image, op) +
    PAIR_BASE_IMAGE_DIST_WEIGHT * cartDist(base, image, demo.cell) +
    PAIR_OUTSIDE_CELL_WEIGHT * (outsidePenalty(base) + outsidePenalty(image))

  // Screws + pure 2-folds: keep a *compact* pairing near the raw Seitz image
  // so the drawn axis sits between BASE and IMAGE (not a same-side +1 hop).
  if (op.classId === 'screw' || op.classId === 'twofold') {
    const rawImage = applyOperatorRaw(op, base)
    const compactW =
      op.classId === 'twofold'
        ? TWOFOLD_COMPACT_LATTICE_WEIGHT
        : SCREW_COMPACT_LATTICE_WEIGHT
    score += compactW * screwImageLatticeShift(rawImage, image)
  }

  if (op.classId === 'screw') {
    const axis =
      demo.screwAxes.find((s) => s.opIndex === op.index && s.primary) ??
      demo.screwAxes.find((s) => s.opIndex === op.index)
    if (axis) {
      const advance = screwAdvanceAlongSense(base, image, axis.direction)
      if (advance < -1e-9) score += SCREW_SENSE_NEG_PENALTY
      const dc = image[2] - base[2]
      if (Math.abs(op.t[2]) > 0.2 && Math.abs(dc) > 0.5) {
        score += SCREW_LARGE_DC_HOP_PENALTY
      }
    }
  }
  return score
}

function placedNearest(
  demo: SpaceGroupDemo,
  selectedIndex: number,
): PlacementResult {
  const seed0: Vec3 = [
    wrap01(demo.seed[0]),
    wrap01(demo.seed[1]),
    wrap01(demo.seed[2]),
  ]
  const selectedOp =
    demo.operators.find((o) => o.index === selectedIndex) ??
    demo.operators[0]

  if (selectedOp.classId === 'identity') {
    return placedWrapped(demo)
  }

  let bestScore = Infinity
  let bestBase: Vec3 = seed0
  let bestImage: Vec3 = applyOperatorRaw(selectedOp, seed0)

  for (const nBase of LATTICE) {
    const base = addFrac(seed0, nBase)
    const rawImage = applyOperatorRaw(selectedOp, base)
    for (const nImg of LATTICE) {
      const image = addFrac(rawImage, nImg)
      const score = pairScore(demo, base, image, selectedOp)
      if (score < bestScore - 1e-9) {
        bestScore = score
        bestBase = base
        bestImage = image
      }
    }
  }

  const points: GeneralPoint[] = demo.operators.map((op) => {
    if (op.index === 1) {
      return makePoint(demo, op, bestBase)
    }
    if (op.index === selectedOp.index) {
      return makePoint(demo, op, bestImage)
    }
    const raw = applyOperatorRaw(op, seed0)
    let best = raw
    let bestD = Infinity
    for (const n of LATTICE) {
      const cand = addFrac(raw, n)
      const d =
        distToElement(demo, cand, selectedOp) + 0.2 * outsidePenalty(cand)
      if (d < bestD - 1e-9) {
        bestD = d
        best = cand
      }
    }
    return makePoint(demo, op, best)
  })

  return {
    points,
    baseCartesian: fracToCart(bestBase, demo.cell),
    imageCartesian: fracToCart(bestImage, demo.cell),
  }
}

export function placedPositions(
  demo: SpaceGroupDemo,
  selectedIndex: number,
  mode: PlacementMode = 'nearest',
): PlacementResult {
  if (mode === 'wrapped') {
    const result = placedWrapped(demo)
    const image =
      result.points.find((p) => p.index === selectedIndex) ?? result.points[0]
    return {
      ...result,
      imageCartesian: image.cartesian,
    }
  }
  return placedNearest(demo, selectedIndex)
}

