/**
 * Symmetry-element loci from Seitz operators.
 *
 * Derives:
 *  - inversions (R = −I)
 *  - axis-aligned 2 / 2₁ along a, b, c
 *  - 4 / 4ₙ and 3 / 3ₙ along c (tetragonal / hexagonal)
 *  - mirrors / a·b·c·n·d glides ⊥ a, b, c
 *
 * Body-diagonal 3-folds and other non-axis-aligned elements are left to
 * hand demos or shown as operators-only (see geometryLimited on generated demos).
 *
 * Tolerances: fractional ~1e-3 for classifying R; locus smoke tests ~0.02.
 */

import type {
  GlidePlaneSpec,
  InversionCenterSpec,
  Mat3,
  Operator,
  ScrewAxisSpec,
  SymmetryClassId,
  Vec3,
} from '../types'
import { wrap01 } from '../math'
import { matClose } from './composeOps'

const EPS = 1e-3

const NEG_I: Mat3 = [
  [-1, 0, 0],
  [0, -1, 0],
  [0, 0, -1],
]

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

const MIRROR_A: Mat3 = [
  [-1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
]
const MIRROR_B: Mat3 = [
  [1, 0, 0],
  [0, -1, 0],
  [0, 0, 1],
]
const MIRROR_C: Mat3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, -1],
]

/** 4-fold ‖ c and its inverse. */
const FOUR_C: Mat3 = [
  [0, -1, 0],
  [1, 0, 0],
  [0, 0, 1],
]
const FOUR_C_INV: Mat3 = [
  [0, 1, 0],
  [-1, 0, 0],
  [0, 0, 1],
]

/** 3-fold ‖ c (hex setting) and inverse. */
const THREE_C: Mat3 = [
  [0, -1, 0],
  [1, -1, 0],
  [0, 0, 1],
]
const THREE_C_INV: Mat3 = [
  [-1, 1, 0],
  [-1, 0, 0],
  [0, 0, 1],
]

function fmtFrac(v: number): string {
  const w = wrap01(v)
  if (Math.abs(w) < 1e-6 || Math.abs(w - 1) < 1e-6) return '0'
  if (Math.abs(w - 0.25) < 1e-6) return '¼'
  if (Math.abs(w - 0.5) < 1e-6) return '½'
  if (Math.abs(w - 0.75) < 1e-6) return '¾'
  return w.toFixed(3)
}

function nearHalf(v: number): boolean {
  return Math.abs(wrap01(v) - 0.5) < 0.08
}

function nearZero(v: number): boolean {
  const w = wrap01(v)
  return w < EPS || w > 1 - EPS
}

function nearQuarter(v: number): boolean {
  const w = wrap01(v)
  return Math.abs(w - 0.25) < 0.08 || Math.abs(w - 0.75) < 0.08
}

/** Inversion centers for ops with R = −I: center at t/2 (mod 1). */
export function deriveInversions(ops: Operator[]): InversionCenterSpec[] {
  const out: InversionCenterSpec[] = []
  let sawPrimary = false
  for (const op of ops) {
    if (!matClose(op.R, NEG_I, EPS)) continue
    const position: Vec3 = [
      wrap01(op.t[0] / 2),
      wrap01(op.t[1] / 2),
      wrap01(op.t[2] / 2),
    ]
    const atOrigin =
      Math.abs(position[0]) < EPS &&
      Math.abs(position[1]) < EPS &&
      Math.abs(position[2]) < EPS
    const primary = atOrigin && !sawPrimary
    if (primary) sawPrimary = true
    out.push({
      position,
      primary,
      locus: `(${fmtFrac(position[0])}, ${fmtFrac(position[1])}, ${fmtFrac(position[2])})`,
    })
  }
  if (!sawPrimary && out.length > 0) out[0]!.primary = true
  return out
}

function pushTwofoldAxis(
  out: ScrewAxisSpec[],
  op: Operator,
  axis: 0 | 1 | 2,
  origin: Vec3,
  direction: Vec3,
  parallelT: number,
): void {
  const isScrew = nearHalf(parallelT)
  const kind: '2' | '21' = isScrew ? '21' : '2'
  const axisName = axis === 0 ? 'a' : axis === 1 ? 'b' : 'c'
  let locus: string
  if (axis === 0) {
    locus = `(x, ${fmtFrac(origin[1])}, ${fmtFrac(origin[2])})`
  } else if (axis === 1) {
    locus = `(${fmtFrac(origin[0])}, y, ${fmtFrac(origin[2])})`
  } else {
    locus = `(${fmtFrac(origin[0])}, ${fmtFrac(origin[1])}, z)`
  }
  out.push({
    origin,
    direction,
    locus: isScrew ? `${locus} · 2₁ ‖ ${axisName}` : `${locus} · 2 ‖ ${axisName}`,
    opIndex: op.index,
    primary: !out.some((a) => a.opIndex === op.index),
    kind,
  })
}

/**
 * Axis-aligned 2 / 2₁ along a, b, or c.
 * For R ≈ diag(1,−1,−1): y0=ty/2, z0=tz/2; screw if |tx|≈½.
 */
export function deriveTwofoldAxes(ops: Operator[]): ScrewAxisSpec[] {
  const out: ScrewAxisSpec[] = []
  for (const op of ops) {
    if (matClose(op.R, TWO_A, EPS)) {
      const y0 = wrap01(op.t[1] / 2)
      const z0 = wrap01(op.t[2] / 2)
      pushTwofoldAxis(out, op, 0, [0, y0, z0], [1, 0, 0], op.t[0])
      continue
    }
    if (matClose(op.R, TWO_B, EPS)) {
      const x0 = wrap01(op.t[0] / 2)
      const z0 = wrap01(op.t[2] / 2)
      pushTwofoldAxis(out, op, 1, [x0, 0, z0], [0, 1, 0], op.t[1])
      continue
    }
    if (matClose(op.R, TWO_C, EPS)) {
      const x0 = wrap01(op.t[0] / 2)
      const y0 = wrap01(op.t[1] / 2)
      pushTwofoldAxis(out, op, 2, [x0, y0, 0], [0, 0, 1], op.t[2])
    }
  }
  return out
}

/** Backward-compatible alias: unique-b monoclinic 2 / 2₁ only. */
export function deriveTwofoldOrScrewB(ops: Operator[]): ScrewAxisSpec[] {
  return deriveTwofoldAxes(ops).filter(
    (a) => a.direction[0] === 0 && a.direction[1] === 1 && a.direction[2] === 0,
  )
}

/**
 * 4 / 4ₙ ‖ c: R = [[0,−1,0],[1,0,0],[0,0,1]] (or inverse).
 * Fixed point: x0=(tx−ty)/2, y0=(tx+ty)/2.
 */
export function deriveFourfoldC(ops: Operator[]): ScrewAxisSpec[] {
  const out: ScrewAxisSpec[] = []
  for (const op of ops) {
    const forward = matClose(op.R, FOUR_C, EPS)
    const inverse = matClose(op.R, FOUR_C_INV, EPS)
    if (!forward && !inverse) continue
    const tx = op.t[0]
    const ty = op.t[1]
    const tz = wrap01(op.t[2])
    const x0 = wrap01((tx - ty) / 2)
    const y0 = wrap01((tx + ty) / 2)
    let kind: ScrewAxisSpec['kind'] = '4'
    if (nearHalf(tz)) kind = '42'
    else if (Math.abs(tz - 0.25) < 0.08) kind = '41'
    else if (Math.abs(tz - 0.75) < 0.08) kind = '43'
    out.push({
      origin: [x0, y0, 0],
      direction: [0, 0, 1],
      locus: `(${fmtFrac(x0)}, ${fmtFrac(y0)}, z)`,
      opIndex: op.index,
      primary: !out.some((a) => a.opIndex === op.index),
      kind,
    })
  }
  return out
}

/**
 * 3 / 3ₙ ‖ c (hex): R = [[0,−1,0],[1,−1,0],[0,0,1]] (or inverse).
 * Fixed point of the xy rotation: for R=(−y, x−y), solve
 *   −y + tx = x,  x − y + ty = y  ⇒  x = (2 tx + ty)/3, y = (tx + 2?)/3
 * Using: x + y = tx,  x − 2y = −ty from the two eqs...
 * From −y+tx=x ⇒ x+y=tx
 * From x−y+ty=y ⇒ x+ty=2y ⇒ y=(x+ty)/2
 * ⇒ x + (x+ty)/2 = tx ⇒ (3/2)x = tx − ty/2 ⇒ x = (2 tx − ty)/3
 *    y = tx − x = (tx + ty)/3? Wait: y = tx - x = tx - (2tx - ty)/3 = (3tx - 2tx + ty)/3 = (tx+ty)/3
 */
export function deriveThreefoldC(ops: Operator[]): ScrewAxisSpec[] {
  const out: ScrewAxisSpec[] = []
  for (const op of ops) {
    const forward = matClose(op.R, THREE_C, EPS)
    const inverse = matClose(op.R, THREE_C_INV, EPS)
    if (!forward && !inverse) continue
    const tx = op.t[0]
    const ty = op.t[1]
    const tz = wrap01(op.t[2])
    let x0: number
    let y0: number
    if (forward) {
      // R: (−y+tx, x−y+ty, z+tz); fixed ⇒ x=(2tx−ty)/3, y=(tx+ty)/3
      x0 = wrap01((2 * tx - ty) / 3)
      y0 = wrap01((tx + ty) / 3)
    } else {
      // R: (−x+y+tx, −x+ty, z+tz); fixed ⇒ x=(tx+ty)/3, y=−x+ty
      x0 = wrap01((tx + ty) / 3)
      y0 = wrap01(-x0 + ty)
    }
    let kind: ScrewAxisSpec['kind'] = '3'
    if (Math.abs(tz - 1 / 3) < 0.08 || Math.abs(tz - 2 / 3) < 0.08) {
      kind = '3'
    }
    out.push({
      origin: [x0, y0, 0],
      direction: [0, 0, 1],
      locus: `(${fmtFrac(x0)}, ${fmtFrac(y0)}, z)`,
      opIndex: op.index,
      primary: !out.some((a) => a.opIndex === op.index),
      kind,
    })
  }
  return out
}

type GlideClass = Extract<
  SymmetryClassId,
  'a-glide' | 'b-glide' | 'c-glide' | 'n-glide' | 'd-glide' | 'mirror'
>

function classifyGlideComponents(
  normal: 0 | 1 | 2,
  glide: Vec3,
): { classId: GlideClass; label: string } {
  const inPlane = ([0, 1, 2] as const).filter((i) => i !== normal)
  const g0 = !nearZero(glide[inPlane[0]!])
  const g1 = !nearZero(glide[inPlane[1]!])
  const q0 = nearQuarter(glide[inPlane[0]!])
  const q1 = nearQuarter(glide[inPlane[1]!])
  const axis = normal === 0 ? 'a' : normal === 1 ? 'b' : 'c'

  if (!g0 && !g1) return { classId: 'mirror', label: `mirror ⊥ ${axis}` }
  if (q0 && q1) return { classId: 'd-glide', label: `d-glide ⊥ ${axis}` }
  if (g0 && g1) return { classId: 'n-glide', label: `n-glide ⊥ ${axis}` }
  const glideAxis = g0 ? inPlane[0]! : inPlane[1]!
  const letter = glideAxis === 0 ? 'a' : glideAxis === 1 ? 'b' : 'c'
  return {
    classId: `${letter}-glide` as GlideClass,
    label: `${letter}-glide ⊥ ${axis}`,
  }
}

function pushGlide(
  out: GlidePlaneSpec[],
  op: Operator,
  normal: 0 | 1 | 2,
  planeValue: number,
  glide: Vec3,
): void {
  const { classId, label } = classifyGlideComponents(normal, glide)
  const axis = normal === 0 ? 'x' : normal === 1 ? 'y' : 'z'
  out.push({
    planeValue,
    normalAxis: normal,
    glide,
    label,
    classId,
    opIndex: op.index,
    primary: !out.some((g) => g.opIndex === op.index),
    locus: `${axis} = ${fmtFrac(planeValue)}, glide (${fmtFrac(glide[0])}, ${fmtFrac(glide[1])}, ${fmtFrac(glide[2])})`,
  })
}

/**
 * Axis-aligned mirrors / glides ⊥ a, b, c.
 * Plane at (t_normal)/2; glide = in-plane components of t.
 */
export function deriveAxisAlignedGlides(ops: Operator[]): GlidePlaneSpec[] {
  const out: GlidePlaneSpec[] = []
  for (const op of ops) {
    if (matClose(op.R, MIRROR_A, EPS)) {
      const planeValue = wrap01(op.t[0] / 2)
      const glide: Vec3 = [0, wrap01(op.t[1]), wrap01(op.t[2])]
      pushGlide(out, op, 0, planeValue, glide)
      continue
    }
    if (matClose(op.R, MIRROR_B, EPS)) {
      const planeValue = wrap01(op.t[1] / 2)
      const glide: Vec3 = [wrap01(op.t[0]), 0, wrap01(op.t[2])]
      pushGlide(out, op, 1, planeValue, glide)
      continue
    }
    if (matClose(op.R, MIRROR_C, EPS)) {
      const planeValue = wrap01(op.t[2] / 2)
      const glide: Vec3 = [wrap01(op.t[0]), wrap01(op.t[1]), 0]
      pushGlide(out, op, 2, planeValue, glide)
    }
  }
  return out
}

/** Backward-compatible alias: glides ⊥ b only. */
export function deriveGlidesPerpB(ops: Operator[]): GlidePlaneSpec[] {
  return deriveAxisAlignedGlides(ops).filter((g) => g.normalAxis === 1)
}

export interface DerivedElements {
  inversions: InversionCenterSpec[]
  /** All derived rotation/screw axes (a/b/c 2-folds, 4‖c, 3‖c). */
  axes: ScrewAxisSpec[]
  /** All derived axis-aligned mirrors/glides. */
  glides: GlidePlaneSpec[]
  /** @deprecated alias of axes filtered to ‖ b — kept for older tests */
  axesB: ScrewAxisSpec[]
  /** @deprecated alias of glides ⊥ b */
  glidesPerpB: GlidePlaneSpec[]
}

export function deriveElements(ops: Operator[]): DerivedElements {
  const axes = [
    ...deriveTwofoldAxes(ops),
    ...deriveFourfoldC(ops),
    ...deriveThreefoldC(ops),
  ]
  const glides = deriveAxisAlignedGlides(ops)
  return {
    inversions: deriveInversions(ops),
    axes,
    glides,
    axesB: axes.filter(
      (a) => a.direction[0] === 0 && a.direction[1] === 1 && a.direction[2] === 0,
    ),
    glidesPerpB: glides.filter((g) => g.normalAxis === 1),
  }
}

/** True when we derived no geometric overlays beyond (maybe) inversions. */
export function isGeometryLimited(derived: DerivedElements, ops: Operator[]): boolean {
  const nonId = ops.filter((o) => o.classId !== 'identity')
  if (nonId.length === 0) return false
  const hasAxisOrGlide = derived.axes.length > 0 || derived.glides.length > 0
  if (hasAxisOrGlide) return false
  // Only inversions (or nothing) while other classes exist → limited
  const other = nonId.some((o) => o.classId !== 'inversion')
  return other || derived.inversions.length === 0
}

/** Near-equality for smoke tests (fractional). */
export function fracNear(a: number, b: number, tol = 0.02): boolean {
  const d = Math.abs(wrap01(a - b))
  return d <= tol || d >= 1 - tol
}
