/**
 * Honest animation paths for a Seitz operation (R, t) acting on the BASE
 * motif, in Cartesian scene coordinates.
 *
 * The path is a one-parameter family of affine maps P(s), s ∈ [0, 1], with
 * P(0) = identity and P(1) = the exact operation that takes the rendered BASE
 * pose to the rendered IMAGE pose (including the lattice mate chosen by the
 * placement). It is derived from the two rendered poses:
 *
 *   L = A·R_to·A⁻¹ · (A·R_from·A⁻¹)⁻¹      (Cartesian linear part)
 *   t = pos_to − L · pos_from              (Cartesian translation incl. mate)
 *
 * Decomposition (by det L and its real invariant elements):
 *  - det +1, angle 0           → straight translation (lattice / centring)
 *  - det +1, angle θ           → screw motion (Chasles): rotation by sθ about
 *                                 the real axis through p, plus s·(axial part
 *                                 of t). Rigid at every s.
 *  - det −1, trace +1 (mirror) → reflection through the real plane n·x = d:
 *                                 normal coordinate scales by (1 − 2s), the
 *                                 tangential coordinates advance by s·glide.
 *  - det −1, otherwise         → rotoinversion about its unique fixed point c:
 *                                 x ↦ c + (1 − 2s)·Rot(u, sβ)(x − c), where
 *                                 L = −Rot(u, β). For −1 (β = 0) every point
 *                                 shrinks through c and emerges inverted.
 *
 * Intermediate frames are NOT symmetry operations; improper paths pass
 * through a degenerate (zero-volume) frame at s = ½, which is unavoidable
 * for any continuous path between det +1 and det −1.
 */
import { cartesianLinear } from './math'
import type { CellParams, Mat3, Vec3 } from './types'

export type OpPathKind =
  | 'identity'
  | 'translation'
  | 'rotation'
  | 'screw'
  | 'mirror'
  | 'glide'
  | 'inversion'
  | 'rotoinversion'

export interface OpPath {
  kind: OpPathKind
  /** Exact Cartesian linear part of the relative operation. */
  L: Mat3
  /** Exact Cartesian translation of the relative operation. */
  t: Vec3
  /** Rotation angle θ (proper) or β (rotoinversion), radians, in [0, π]. */
  angle: number
  /** Unit rotation axis (proper / rotoinversion). */
  axis?: Vec3
  /** A point on the rotation axis (proper, θ > 0). */
  axisPoint?: Vec3
  /** Translation along the axis (screw part). */
  axial?: Vec3
  /** Unit mirror normal and plane offset d (plane: n·x = d). */
  normal?: Vec3
  planeOffset?: number
  /** In-plane glide vector (mirror family). */
  glide?: Vec3
  /** Fixed point (inversion / rotoinversion). */
  center?: Vec3
}

export interface Affine {
  L: Mat3
  t: Vec3
}

const EPS = 1e-7

const I3 = (): Mat3 => [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k]
const norm = (a: Vec3) => Math.hypot(a[0], a[1], a[2])
export function mulMV(M: Mat3, v: Vec3): Vec3 {
  return [
    M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
    M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
    M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2],
  ]
}
export function mulMM(A: Mat3, B: Mat3): Mat3 {
  const r = I3()
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      r[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j]
  return r
}
export function det3(m: Mat3): number {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  )
}
export function inv3(m: Mat3): Mat3 {
  const d = det3(m)
  const c = (r0: number, c0: number, r1: number, c1: number) =>
    m[r0][c0] * m[r1][c1] - m[r0][c1] * m[r1][c0]
  return [
    [c(1, 1, 2, 2) / d, -c(0, 1, 2, 2) / d, c(0, 1, 1, 2) / d],
    [-c(1, 0, 2, 2) / d, c(0, 0, 2, 2) / d, -c(0, 0, 1, 2) / d],
    [c(1, 0, 2, 1) / d, -c(0, 0, 2, 1) / d, c(0, 0, 1, 1) / d],
  ]
}

/** Rodrigues rotation matrix about unit axis u by angle a. */
export function rotAxis(u: Vec3, a: number): Mat3 {
  const c = Math.cos(a)
  const s = Math.sin(a)
  const C = 1 - c
  const [x, y, z] = u
  return [
    [c + x * x * C, x * y * C - z * s, x * z * C + y * s],
    [y * x * C + z * s, c + y * y * C, y * z * C - x * s],
    [z * x * C - y * s, z * y * C + x * s, c + z * z * C],
  ]
}

/** Axis–angle of a proper rotation Q, angle in [0, π]. */
export function axisAngle(Q: Mat3): { axis: Vec3; angle: number } {
  const tr = Q[0][0] + Q[1][1] + Q[2][2]
  const angle = Math.acos(Math.min(1, Math.max(-1, (tr - 1) / 2)))
  if (angle < 1e-6) return { axis: [0, 0, 1], angle: 0 }
  if (Math.PI - angle > 1e-4) {
    const v: Vec3 = [Q[2][1] - Q[1][2], Q[0][2] - Q[2][0], Q[1][0] - Q[0][1]]
    const n = norm(v)
    if (n > 1e-9) return { axis: scale(v, 1 / n), angle }
  }
  // θ ≈ π: (Q + I)/2 = u uᵀ — take the strongest column.
  const B: Mat3 = [
    [(Q[0][0] + 1) / 2, (Q[0][1] + Q[1][0]) / 4, (Q[0][2] + Q[2][0]) / 4],
    [(Q[1][0] + Q[0][1]) / 4, (Q[1][1] + 1) / 2, (Q[1][2] + Q[2][1]) / 4],
    [(Q[2][0] + Q[0][2]) / 4, (Q[2][1] + Q[1][2]) / 4, (Q[2][2] + 1) / 2],
  ]
  return { axis: strongestUnitColumn(B), angle }
}

function strongestUnitColumn(B: Mat3): Vec3 {
  let best: Vec3 = [0, 0, 1]
  let bestN = -1
  for (let j = 0; j < 3; j++) {
    const col: Vec3 = [B[0][j], B[1][j], B[2][j]]
    const n = norm(col)
    if (n > bestN) {
      bestN = n
      best = col
    }
  }
  return bestN > 1e-12 ? scale(best, 1 / bestN) : [0, 0, 1]
}

/**
 * Build the path for the relative operation between two rendered poses.
 * `fromR`/`toR` are fractional linear parts (as on the operators); positions
 * are Cartesian scene positions of the motif centres.
 */
export function buildOpPath(
  fromPos: Vec3,
  fromR: Mat3,
  toPos: Vec3,
  toR: Mat3,
  cell: CellParams,
): OpPath {
  const Lf = cartesianLinear(fromR, cell)
  const Lt = cartesianLinear(toR, cell)
  const L = mulMM(Lt, inv3(Lf))
  const t = sub(toPos, mulMV(L, fromPos))
  return decompose(L, t)
}

/** Classify and decompose an exact Cartesian isometry x ↦ Lx + t. */
export function decompose(L: Mat3, t: Vec3): OpPath {
  const d = det3(L)
  const tr = L[0][0] + L[1][1] + L[2][2]
  if (d > 0) {
    const { axis, angle } = axisAngle(L)
    if (angle < 1e-6) {
      return { kind: norm(t) < EPS ? 'identity' : 'translation', L, t, angle: 0 }
    }
    const axial = scale(axis, dot(t, axis))
    const perp = sub(t, axial)
    // (I − L + u uᵀ) p = t⊥  → p ⟂ u, (I − L)p = t⊥
    const M = I3()
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) M[i][j] = M[i][j] - L[i][j] + axis[i] * axis[j]
    const axisPoint = mulMV(inv3(M), perp)
    return {
      kind: norm(axial) < EPS ? 'rotation' : 'screw',
      L,
      t,
      angle,
      axis,
      axisPoint,
      axial,
    }
  }
  if (Math.abs(tr - 1) < 1e-5) {
    // Reflection: (I − L)/2 = n nᵀ.
    const B: Mat3 = I3()
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) B[i][j] = ((i === j ? 1 : 0) - L[i][j]) / 2
    const normal = strongestUnitColumn(B)
    const tn = dot(t, normal)
    const glide = sub(t, scale(normal, tn))
    return {
      kind: norm(glide) < EPS ? 'mirror' : 'glide',
      L,
      t,
      angle: Math.PI,
      normal,
      planeOffset: tn / 2,
      glide,
    }
  }
  // Rotoinversion (incl. −1): L = −Q, Q proper; unique fixed point c.
  const Q = L.map((r) => r.map((v) => -v)) as Mat3
  const { axis, angle } = axisAngle(Q)
  const IL = I3()
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) IL[i][j] -= L[i][j]
  const center = mulMV(inv3(IL), t)
  return {
    kind: angle < 1e-6 ? 'inversion' : 'rotoinversion',
    L,
    t,
    angle,
    axis: angle < 1e-6 ? undefined : axis,
    center,
  }
}

/**
 * Exact affine map at parameter s ∈ [0, 1]. `collapseFloor` (≥ 0) keeps the
 * collapsing factor (1 − 2s) at least that far from zero (sign preserved) so a
 * renderer never receives a singular matrix; tests use 0 for the exact path.
 */
export function pathAffine(path: OpPath, sIn: number, collapseFloor = 0): Affine {
  const s = Math.min(1, Math.max(0, sIn))
  if (s >= 1) return { L: path.L.map((r) => [...r]) as Mat3, t: [...path.t] as Vec3 }
  const f0 = 1 - 2 * s
  const f =
    Math.abs(f0) >= collapseFloor ? f0 : (f0 < 0 ? -1 : 1) * collapseFloor
  switch (path.kind) {
    case 'identity':
    case 'translation':
      return { L: I3(), t: scale(path.t, s) }
    case 'rotation':
    case 'screw': {
      const Ls = rotAxis(path.axis!, s * path.angle)
      const p = path.axisPoint!
      const ts = add(sub(p, mulMV(Ls, p)), scale(path.axial!, s))
      return { L: Ls, t: ts }
    }
    case 'mirror':
    case 'glide': {
      const n = path.normal!
      const Ls = I3()
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) Ls[i][j] += (f - 1) * n[i] * n[j]
      // x ↦ x + (f − 1) n (n·x − d) + s·glide
      const ts = add(scale(n, -(f - 1) * path.planeOffset!), scale(path.glide!, s))
      return { L: Ls, t: ts }
    }
    case 'inversion':
    case 'rotoinversion': {
      const R = path.axis ? rotAxis(path.axis, s * path.angle) : I3()
      const Ls = R.map((r) => r.map((v) => v * f)) as Mat3
      const c = path.center!
      return { L: Ls, t: sub(c, mulMV(Ls, c)) }
    }
  }
}

export function applyAffine(a: Affine, x: Vec3): Vec3 {
  return add(mulMV(a.L, x), a.t)
}

/** Smooth ease-in-out on [0, 1] (unchanged from the previous ghost). */
export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

/** Renderer floor for the collapse factor (never a singular matrix). */
export const RENDER_COLLAPSE_FLOOR = 0.02

/**
 * Column-major 4×4 (three.js Matrix4.elements order) for the ghost at
 * eased parameter s: P(s) ∘ T(fromPos) ∘ L_from.
 */
export function ghostMatrixElements(
  path: OpPath,
  s: number,
  fromPos: Vec3,
  fromLinear: Mat3,
  collapseFloor = RENDER_COLLAPSE_FLOOR,
): number[] {
  const a = pathAffine(path, s, collapseFloor)
  const M = mulMM(a.L, fromLinear)
  const p = applyAffine(a, fromPos)
  return [
    M[0][0], M[1][0], M[2][0], 0,
    M[0][1], M[1][1], M[2][1], 0,
    M[0][2], M[1][2], M[2][2], 0,
    p[0], p[1], p[2], 1,
  ]
}

/** Short human description of the drawn path (for captions / a11y). */
export function describeOpPath(path: OpPath): string {
  const deg = Math.round((path.angle * 180) / Math.PI)
  switch (path.kind) {
    case 'identity':
      return 'Identity: no motion.'
    case 'translation':
      return 'Straight translation by a lattice or centring vector.'
    case 'rotation':
      return `Rotates ${deg}° about the axis.`
    case 'screw':
      return `Rotates ${deg}° about the axis while advancing along it (screw).`
    case 'mirror':
      return 'Reflects through the mirror plane: flattens onto it, then emerges mirrored.'
    case 'glide':
      return 'Reflects through the glide plane while sliding along it.'
    case 'inversion':
      return 'Shrinks through the inversion centre and emerges inverted.'
    case 'rotoinversion':
      return `Turns ${deg}° about the axis while shrinking through the centre on it, emerging inverted (rotoinversion).`
  }
}
