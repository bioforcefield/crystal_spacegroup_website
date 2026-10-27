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
import { pbcaDemo } from './pbca'

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

function outsidePenalty(p: Vec3): number {
  let s = 0
  for (let i = 0; i < 3; i++) {
    if (p[i] < 0) s += -p[i]
    else if (p[i] > 1) s += p[i] - 1
  }
  return s
}

function distToScrewAxis(
  p: Vec3,
  origin: Vec3,
  direction: Vec3,
  cell: CellParams,
): number {
  const pc = fracToCart(p, cell)
  const oc = fracToCart(origin, cell)
  const tip = fracToCart(
    [
      origin[0] + direction[0],
      origin[1] + direction[1],
      origin[2] + direction[2],
    ],
    cell,
  )
  const dc: Vec3 = [tip[0] - oc[0], tip[1] - oc[1], tip[2] - oc[2]]
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

function distToGlidePlane(
  p: Vec3,
  planeValue: number,
  normalAxis: 0 | 1 | 2,
  cell: CellParams,
): number {
  // Distance along the normal in Cartesian: for unique-b monoclinic,
  // normals along a/b/c need care; b is orthogonal; a/c are in xz.
  if (normalAxis === 1) {
    return Math.abs(p[1] - planeValue) * cell.b
  }
  const a = fracToCart(
    normalAxis === 0 ? [planeValue, 0, 0] : [0, 0, planeValue],
    cell,
  )
  const b = fracToCart(
    normalAxis === 0 ? [planeValue, 1, 0] : [0, 1, planeValue],
    cell,
  )
  const c = fracToCart(
    normalAxis === 0 ? [planeValue, 0, 1] : [1, 0, planeValue],
    cell,
  )
  // Approximate: use fractional difference × characteristic length
  const axisLen =
    normalAxis === 0 ? cell.a : normalAxis === 2 ? cell.c : cell.b
  void a
  void b
  void c
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

function pairScore(
  demo: SpaceGroupDemo,
  base: Vec3,
  image: Vec3,
  op: Operator,
): number {
  return (
    distToElement(demo, base, op) +
    distToElement(demo, image, op) +
    0.25 * cartDist(base, image, demo.cell) +
    0.2 * (outsidePenalty(base) + outsidePenalty(image))
  )
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

/** @deprecated Pbca-only shim — prefer placedPositions(demo, …) */
export function placedPositionsPbca(
  selectedIndex: number,
  mode: PlacementMode = 'nearest',
): PlacementResult {
  return placedPositions(pbcaDemo, selectedIndex, mode)
}
