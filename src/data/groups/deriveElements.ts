/**
 * Symmetry-element loci from Seitz operators.
 *
 * Derives:
 *  - inversions (R = −I)
 *  - axis-aligned 2 / 2₁ along a, b, c
 *  - 4 / 4ₙ and 3 / 3ₙ along c (tetragonal / hexagonal)
 *  - cubic 〈111〉 body-diagonal 3-folds (per operator)
 *  - face-diagonal 2-folds (cubic 〈110〉)
 *  - 4 / 4ₙ ‖ a, b, and c
 *  - mirrors / a·b·c·n·d glides ⊥ a, b, c
 *  - diagonal (non-axis-aligned) mirrors / glides via corners
 *
 * Remaining uncaptured loci set geometryLimited on generated demos.
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

/** ---- Stage 1: body-diagonal 3-folds + diagonal glides ---- */

function sub3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}
function add3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}
function scale3(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s]
}
function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}
function cross3(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}
function norm3(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2])
}
function normalize3(a: Vec3): Vec3 | null {
  const n = norm3(a)
  if (n < 1e-8) return null
  return [a[0] / n, a[1] / n, a[2] / n]
}

/** Eigenvector of R for eigenvalue ≈ +1 (rotation axis). */
function axisEigenvectorPlus1(R: Mat3): Vec3 | null {
  // Rows of (R − I); axis ∝ cross of two independent rows
  const r0: Vec3 = [R[0][0] - 1, R[0][1], R[0][2]]
  const r1: Vec3 = [R[1][0], R[1][1] - 1, R[1][2]]
  const r2: Vec3 = [R[2][0], R[2][1], R[2][2] - 1]
  let v = cross3(r0, r1)
  if (norm3(v) < 1e-6) v = cross3(r0, r2)
  if (norm3(v) < 1e-6) v = cross3(r1, r2)
  return normalize3(v)
}

/** Eigenvector of R for eigenvalue ≈ −1 (mirror normal). */
function axisEigenvectorMinus1(R: Mat3): Vec3 | null {
  const r0: Vec3 = [R[0][0] + 1, R[0][1], R[0][2]]
  const r1: Vec3 = [R[1][0], R[1][1] + 1, R[1][2]]
  const r2: Vec3 = [R[2][0], R[2][1], R[2][2] + 1]
  let v = cross3(r0, r1)
  if (norm3(v) < 1e-6) v = cross3(r0, r2)
  if (norm3(v) < 1e-6) v = cross3(r1, r2)
  return normalize3(v)
}

function isBodyDiagonalDir(d: Vec3): boolean {
  const a = [Math.abs(d[0]), Math.abs(d[1]), Math.abs(d[2])]
  // All |components| ≈ equal and nonzero → 〈111〉 family
  if (a[0] < 0.4 || a[1] < 0.4 || a[2] < 0.4) return false
  return (
    Math.abs(a[0] - a[1]) < 0.25 &&
    Math.abs(a[1] - a[2]) < 0.25 &&
    Math.abs(a[0] - a[2]) < 0.25
  )
}

function fmtDir(d: Vec3): string {
  const s = (v: number) => {
    if (Math.abs(v) < 0.2) return '0'
    if (v > 0.2) return '1'
    return '-1'
  }
  return `[${s(d[0])}${s(d[1])}${s(d[2])}]`
}

/**
 * Point on a screw/rotation axis for angle θ = ±120° (3-fold).
 * x = ½ t⊥ + ½ cot(θ/2) (û × t⊥); for 120°, cot(60°)=1/√3.
 */
function threefoldAxisPoint(R: Mat3, t: Vec3, û: Vec3): Vec3 {
  const tau = dot3(t, û)
  const tPerp = sub3(t, scale3(û, tau))
  // Sense: right-handed if û · (e × R e) > 0 for some e ⊥ û
  let e: Vec3 = [1, 0, 0]
  if (Math.abs(dot3(e, û)) > 0.9) e = [0, 1, 0]
  e = sub3(e, scale3(û, dot3(e, û)))
  const en = normalize3(e) ?? ([1, 0, 0] as Vec3)
  const Ren: Vec3 = [
    R[0][0] * en[0] + R[0][1] * en[1] + R[0][2] * en[2],
    R[1][0] * en[0] + R[1][1] * en[1] + R[1][2] * en[2],
    R[2][0] * en[0] + R[2][1] * en[1] + R[2][2] * en[2],
  ]
  const sense = Math.sign(dot3(û, cross3(en, Ren))) || 1
  const cot = 1 / Math.sqrt(3) // |θ|=120°
  const uxT = cross3(û, tPerp)
  const origin = add3(
    scale3(tPerp, 0.5),
    scale3(uxT, 0.5 * cot * sense),
  )
  return [wrap01(origin[0]), wrap01(origin[1]), wrap01(origin[2])]
}

function det3local(R: Mat3): number {
  return (
    R[0][0] * (R[1][1] * R[2][2] - R[1][2] * R[2][1]) -
    R[0][1] * (R[1][0] * R[2][2] - R[1][2] * R[2][0]) +
    R[0][2] * (R[1][0] * R[2][1] - R[1][1] * R[2][0])
  )
}
function trace3local(R: Mat3): number {
  return R[0][0] + R[1][1] + R[2][2]
}

/**
 * Cubic 〈111〉 (body-diagonal) 3-folds. Hex 3‖c stays in deriveThreefoldC.
 */
export function deriveBodyDiagonalThreefolds(ops: Operator[]): ScrewAxisSpec[] {
  const out: ScrewAxisSpec[] = []
  const seen: string[] = []
  for (const op of ops) {
    const det = Math.round(det3local(op.R))
    const tr = Math.round(trace3local(op.R))
    if (det !== 1 || tr !== 0) continue
    // Skip hex ‖c (already covered)
    if (matClose(op.R, THREE_C, EPS) || matClose(op.R, THREE_C_INV, EPS)) continue

    const û = axisEigenvectorPlus1(op.R)
    if (!û || !isBodyDiagonalDir(û)) continue

    const origin = threefoldAxisPoint(op.R, op.t, û)
    // Integer direction for rendering / labels
    const direction: Vec3 = [
      Math.sign(û[0]) || 1,
      Math.sign(û[1]) || 1,
      Math.sign(û[2]) || 1,
    ]
    const key = `${direction.join(',')}|${origin.map((c) => c.toFixed(2)).join(',')}`
    const primaryForAxis = !seen.includes(key)
    if (primaryForAxis) seen.push(key)

    const dirLabel = fmtDir(direction)
    out.push({
      origin,
      direction,
      locus: `${dirLabel} through (${fmtFrac(origin[0])}, ${fmtFrac(origin[1])}, ${fmtFrac(origin[2])})`,
      opIndex: op.index,
      primary: primaryForAxis && !out.some((a) => a.opIndex === op.index),
      kind: '3',
    })
  }
  return out
}

/** Build a unit-cell parallelogram for plane n·x = d (n unit-ish). */
function planeCorners(normal: Vec3, d: number): [Vec3, Vec3, Vec3, Vec3] {
  // Find two in-plane basis vectors from lattice axes
  const candidates: Vec3[] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [1, 1, 0],
    [1, 0, 1],
    [0, 1, 1],
  ]
  let u: Vec3 | null = null
  let v: Vec3 | null = null
  for (const c of candidates) {
    const p = sub3(c, scale3(normal, dot3(c, normal)))
    const pn = normalize3(p)
    if (!pn) continue
    if (!u) {
      u = pn
      continue
    }
    if (Math.abs(dot3(u, pn)) > 0.85) continue
    v = pn
    break
  }
  if (!u) u = [1, 0, 0]
  if (!v) v = normalize3(cross3(normal, u)) ?? [0, 1, 0]

  // Point on plane near cell center projection
  const center: Vec3 = [0.5, 0.5, 0.5]
  const p0 = sub3(center, scale3(normal, dot3(center, normal) - d))

  const span = 0.75
  const c0 = add3(p0, add3(scale3(u, -span / 2), scale3(v, -span / 2)))
  const c1 = add3(p0, add3(scale3(u, span / 2), scale3(v, -span / 2)))
  const c2 = add3(p0, add3(scale3(u, span / 2), scale3(v, span / 2)))
  const c3 = add3(p0, add3(scale3(u, -span / 2), scale3(v, span / 2)))
  return [c0, c1, c2, c3]
}

/**
 * Face-diagonal 2-folds (common in cubic): e.g. R = [[0,-1,0],[-1,0,0],[0,0,-1]]
 * (2 ‖ [1-10]), and cyclic permutations. Axis ‖ eigenvector (+1).
 */
export function deriveFaceDiagonalTwofolds(ops: Operator[]): ScrewAxisSpec[] {
  const out: ScrewAxisSpec[] = []
  for (const op of ops) {
    const det = Math.round(det3local(op.R))
    const tr = Math.round(trace3local(op.R))
    // Proper 2-fold: det=1, tr=-1
    if (det !== 1 || tr !== -1) continue
    // Skip axis-aligned (already covered)
    if (
      matClose(op.R, TWO_A, EPS) ||
      matClose(op.R, TWO_B, EPS) ||
      matClose(op.R, TWO_C, EPS)
    ) {
      continue
    }
    const û = axisEigenvectorPlus1(op.R)
    if (!û) continue
    // Face diagonal: two |components| ≈ equal, one ≈ 0
    const a = [Math.abs(û[0]), Math.abs(û[1]), Math.abs(û[2])]
    const sorted = [...a].sort((x, y) => x - y)
    if (sorted[0]! > 0.25) continue // body diagonal-ish
    if (sorted[1]! < 0.4 || sorted[2]! < 0.4) continue
    if (Math.abs(sorted[1]! - sorted[2]!) > 0.3) continue

    const tau = dot3(op.t, û)
    const tPerp = sub3(op.t, scale3(û, tau))
    // For 180°: origin = t⊥/2
    const origin: Vec3 = [
      wrap01(tPerp[0] / 2),
      wrap01(tPerp[1] / 2),
      wrap01(tPerp[2] / 2),
    ]
    const direction: Vec3 = [
      Math.abs(û[0]) < 0.25 ? 0 : Math.sign(û[0]) || 1,
      Math.abs(û[1]) < 0.25 ? 0 : Math.sign(û[1]) || 1,
      Math.abs(û[2]) < 0.25 ? 0 : Math.sign(û[2]) || 1,
    ]
    const isScrew = nearHalf(tau)
    out.push({
      origin,
      direction,
      locus: `${fmtDir(direction)} through (${fmtFrac(origin[0])}, ${fmtFrac(origin[1])}, ${fmtFrac(origin[2])})${isScrew ? ' · 2₁' : ' · 2'}`,
      opIndex: op.index,
      primary: !out.some((a) => a.opIndex === op.index),
      kind: isScrew ? '21' : '2',
    })
  }
  return out
}

/** 4 / 4ₙ ‖ a and ‖ b (tetragonal/cubic); ‖ c stays in deriveFourfoldC. */
export function deriveFourfoldAB(ops: Operator[]): ScrewAxisSpec[] {
  const out: ScrewAxisSpec[] = []
  // R for 4 ‖ a: cycles y→z→-y… → [[1,0,0],[0,0,-1],[0,1,0]]
  const FOUR_A: Mat3 = [
    [1, 0, 0],
    [0, 0, -1],
    [0, 1, 0],
  ]
  const FOUR_A_INV: Mat3 = [
    [1, 0, 0],
    [0, 0, 1],
    [0, -1, 0],
  ]
  // 4 ‖ b: [[0,0,1],[0,1,0],[-1,0,0]]
  const FOUR_B: Mat3 = [
    [0, 0, 1],
    [0, 1, 0],
    [-1, 0, 0],
  ]
  const FOUR_B_INV: Mat3 = [
    [0, 0, -1],
    [0, 1, 0],
    [1, 0, 0],
  ]

  const tryAxis = (
    forward: Mat3,
    inverse: Mat3,
    axis: 0 | 1,
    dir: Vec3,
  ) => {
    for (const op of ops) {
      const fw = matClose(op.R, forward, EPS)
      const inv = matClose(op.R, inverse, EPS)
      if (!fw && !inv) continue
      const t = op.t
      // Fixed coords in the plane ⊥ axis
      let origin: Vec3
      let parallel: number
      if (axis === 0) {
        // ‖ a: fixed y,z from (ty - tz)/2 style for 4 about x
        // R: (x, -z, y) + t → y0 = (ty - tz)/2, z0 = (ty + tz)/2  (forward)
        const ty = t[1]
        const tz = t[2]
        const y0 = wrap01(fw ? (ty - tz) / 2 : (ty + tz) / 2)
        const z0 = wrap01(fw ? (ty + tz) / 2 : (tz - ty) / 2)
        origin = [0, y0, z0]
        parallel = t[0]
      } else {
        const tx = t[0]
        const tz = t[2]
        const x0 = wrap01(fw ? (tx + tz) / 2 : (tx - tz) / 2)
        const z0 = wrap01(fw ? (tz - tx) / 2 : (tx + tz) / 2)
        origin = [x0, 0, z0]
        parallel = t[1]
      }
      let kind: ScrewAxisSpec['kind'] = '4'
      const tp = wrap01(parallel)
      if (nearHalf(tp)) kind = '42'
      else if (Math.abs(tp - 0.25) < 0.08) kind = '41'
      else if (Math.abs(tp - 0.75) < 0.08) kind = '43'
      const axisName = axis === 0 ? 'a' : 'b'
      out.push({
        origin,
        direction: dir,
        locus:
          axis === 0
            ? `(x, ${fmtFrac(origin[1])}, ${fmtFrac(origin[2])}) · ${kind} ‖ ${axisName}`
            : `(${fmtFrac(origin[0])}, y, ${fmtFrac(origin[2])}) · ${kind} ‖ ${axisName}`,
        opIndex: op.index,
        primary: !out.some((a) => a.opIndex === op.index),
        kind,
      })
    }
  }

  tryAxis(FOUR_A, FOUR_A_INV, 0, [1, 0, 0])
  tryAxis(FOUR_B, FOUR_B_INV, 1, [0, 1, 0])
  return out
}

/**
 * Non-axis-aligned mirrors / diagonal glides (common in cubic / hex).
 * Uses eigenvector normal and GlidePlaneSpec.corners.
 */
export function deriveDiagonalGlides(ops: Operator[]): GlidePlaneSpec[] {
  const out: GlidePlaneSpec[] = []
  for (const op of ops) {
    const det = Math.round(det3local(op.R))
    const tr = Math.round(trace3local(op.R))
    if (det !== -1 || tr !== 1) continue
    // Skip axis-aligned (already in deriveAxisAlignedGlides)
    if (
      matClose(op.R, MIRROR_A, EPS) ||
      matClose(op.R, MIRROR_B, EPS) ||
      matClose(op.R, MIRROR_C, EPS)
    ) {
      continue
    }

    const n = axisEigenvectorMinus1(op.R)
    if (!n) continue

    // Plane offset: for mirror/glide, fixed set satisfies n·x = n·(t/2) for pure m;
    // more generally d = n · (t/2) when R is reflection-like.
    const d = dot3(n, scale3(op.t, 0.5))
    const glide = op.t.map((c, i) => {
      // In-plane part of t
      return c - n[i]! * dot3(op.t, n)
    }) as Vec3
    // wrap glide components lightly for classification
    const gWrap: Vec3 = [
      wrap01(glide[0]),
      wrap01(glide[1]),
      wrap01(glide[2]),
    ]

    const nontrivial = gWrap.filter((c) => !nearZero(c)).length
    const qt = gWrap.filter((c) => nearQuarter(c)).length
    let classId: GlideClass = 'mirror'
    let label = 'mirror (diagonal)'
    if (qt >= 2) {
      classId = 'd-glide'
      label = 'd-glide (diagonal)'
    } else if (nontrivial >= 2) {
      classId = 'n-glide'
      label = 'n-glide (diagonal)'
    } else if (nontrivial === 1) {
      const i = gWrap.findIndex((c) => !nearZero(c)) as 0 | 1 | 2
      const letter = i === 0 ? 'a' : i === 1 ? 'b' : 'c'
      classId = `${letter}-glide` as GlideClass
      label = `${letter}-glide (diagonal)`
    }

    const corners = planeCorners(n, d)
    out.push({
      corners,
      glide: gWrap,
      label,
      classId,
      opIndex: op.index,
      primary: !out.some((g) => g.opIndex === op.index),
      locus: `n≈(${n[0].toFixed(2)},${n[1].toFixed(2)},${n[2].toFixed(2)}) · ${label}`,
    })
  }
  return out
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
    ...deriveFaceDiagonalTwofolds(ops),
    ...deriveFourfoldC(ops),
    ...deriveFourfoldAB(ops),
    ...deriveThreefoldC(ops),
    ...deriveBodyDiagonalThreefolds(ops),
  ]
  const glides = [
    ...deriveAxisAlignedGlides(ops),
    ...deriveDiagonalGlides(ops),
  ]
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
