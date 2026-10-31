/**
 * Geometry measurements (distance / angle / IUPAC torsion) and
 * molecule-pair → symmetry-element derivation (ITA: intrinsic vs location part).
 */
import type { CellParams, Mat3, Vec3 } from '../types'
import { cartToFrac, fracToCart } from '../math'

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const norm = (a: Vec3) => Math.hypot(a[0], a[1], a[2])
const unit = (a: Vec3): Vec3 => {
  const n = norm(a)
  return n < 1e-12 ? [0, 0, 0] : scale(a, 1 / n)
}
export const vec = { sub, add, scale, dot, cross, norm, unit }

// —— Measurements ——
export function distance(a: Vec3, b: Vec3): number {
  return norm(sub(a, b))
}
/** Angle a–b–c in degrees (b = vertex). */
export function angle(a: Vec3, b: Vec3, c: Vec3): number {
  const u = sub(a, b)
  const v = sub(c, b)
  const cos = Math.max(-1, Math.min(1, dot(u, v) / (norm(u) * norm(v))))
  return (Math.acos(cos) * 180) / Math.PI
}
/** Signed torsion a–b–c–d in degrees, IUPAC (clockwise looking b→c is positive), (−180, 180]. */
export function dihedral(a: Vec3, b: Vec3, c: Vec3, d: Vec3): number {
  const b1 = sub(b, a)
  const b2 = sub(c, b)
  const b3 = sub(d, c)
  const y = norm(b2) * dot(b1, cross(b2, b3))
  const x = dot(cross(b1, b2), cross(b2, b3))
  const deg = (Math.atan2(y, x) * 180) / Math.PI
  return deg <= -180 + 1e-9 ? 180 : deg
}

// —— Seitz ops (fractional) ——
export interface SeitzOp {
  R: Mat3
  t: Vec3
}
export const matMul = (A: Mat3, B: Mat3): Mat3 =>
  [0, 1, 2].map((i) => [0, 1, 2].map((j) => A[i]![0]! * B[0]![j]! + A[i]![1]! * B[1]![j]! + A[i]![2]! * B[2]![j]!)) as Mat3
export const matVec = (A: Mat3, v: Vec3): Vec3 => [dot(A[0], v), dot(A[1], v), dot(A[2], v)]
const I3: Mat3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
const det = (A: Mat3) => dot(A[0], cross(A[1], A[2]))
export function matInv(A: Mat3): Mat3 {
  const d = det(A)
  const c0 = cross(A[1], A[2])
  const c1 = cross(A[2], A[0])
  const c2 = cross(A[0], A[1])
  // inverse = adj / det, columns are cofactor rows
  return [
    [c0[0] / d, c1[0] / d, c2[0] / d],
    [c0[1] / d, c1[1] / d, c2[1] / d],
    [c0[2] / d, c1[2] / d, c2[2] / d],
  ]
}
export function composeSeitz(g2: SeitzOp, g1: SeitzOp): SeitzOp {
  return { R: matMul(g2.R, g1.R), t: add(matVec(g2.R, g1.t), g2.t) }
}
export function invertSeitz(g: SeitzOp): SeitzOp {
  const Ri = matInv(g.R)
  return { R: Ri, t: scale(matVec(Ri, g.t), -1) }
}
/** g mapping A to B: g_B · g_A⁻¹. */
export function relatingOp(gA: SeitzOp, gB: SeitzOp): SeitzOp {
  return composeSeitz(gB, invertSeitz(gA))
}
/**
 * The full op (incl. lattice translation) that produced a drawn atom:
 * displayed frac = R·x_au + t + L, L integer.
 */
export function drawnOp(R: Mat3, t: Vec3, auFrac: Vec3, displayedFrac: Vec3): SeitzOp {
  const base = add(matVec(R, auFrac), t)
  const L = sub(displayedFrac, base).map(Math.round) as Vec3
  return { R, t: add(t, L) }
}

// —— Formatting ——
export function fmtFrac(v: number, maxDen = 12): string {
  if (Math.abs(v) < 1e-6) return '0'
  for (let d = 1; d <= maxDen; d++) {
    const n = Math.round(v * d)
    if (Math.abs(v * d - n) < 1e-4 * d) return d === 1 ? `${n}` : `${n}/${d}`
  }
  return v.toFixed(4)
}
/** CIF-style triplet, e.g. "-x,1/2+y,1/2-z". */
export function tripletOf(g: SeitzOp): string {
  const xyz = ['x', 'y', 'z']
  return g.R.map((row, i) => {
    let s = ''
    const tv = g.t[i]!
    if (Math.abs(tv) > 1e-6) s += fmtFrac(tv)
    row.forEach((c, j) => {
      if (Math.abs(c) < 1e-6) return
      const sign = c < 0 ? '-' : s ? '+' : ''
      const mag = Math.abs(Math.abs(c) - 1) < 1e-6 ? '' : fmtFrac(Math.abs(c))
      s += `${sign}${mag}${xyz[j]}`
    })
    return s || '0'
  }).join(',')
}
export const isIdentityOp = (g: SeitzOp) =>
  g.R.every((r, i) => r.every((c, j) => Math.abs(c - (i === j ? 1 : 0)) < 1e-6)) &&
  g.t.every((v) => Math.abs(v) < 1e-6)
const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii']
export const romanCode = (k: number) => ROMAN[k] ?? `${k + 1}`
const SUP: Record<string, string> = { i: 'ⁱ', v: 'ᵛ', x: 'ˣ' }
export const superscript = (code: string) => code.split('').map((c) => SUP[c] ?? c).join('')

// —— Classification ——
export type OpKind =
  | 'identity'
  | 'translation'
  | 'inversion'
  | 'rotation'
  | 'screw'
  | 'mirror'
  | 'glide'
  | 'rotoinversion'

export interface SymmetryElementInfo {
  kind: OpKind
  /** Hermann–Mauguin-like symbol: 1, t, -1, 2, 2₁, 3₁, m, c, n, -4 … */
  symbol: string
  order: number
  /** Intrinsic (screw/glide) translation, fractional. */
  intrinsic: Vec3
  /** Fixed point (inversion/rotoinversion centre, or one point on the axis/plane). */
  point: Vec3 | null
  /** Axis direction [uvw] (rotation, screw, rotoinversion). */
  axis: Vec3 | null
  /** Plane (hkl) and constant: h x + k y + l z = c (mirror/glide). */
  plane: { hkl: Vec3; c: number } | null
  pointCart: Vec3 | null
  axisCart: Vec3 | null
  normalCart: Vec3 | null
  /** Human text lines. */
  lines: string[]
}

function integerize(v: Vec3): Vec3 {
  const m = Math.max(...v.map(Math.abs))
  if (m < 1e-9) return [0, 0, 0]
  const u = scale(v, 1 / m)
  for (let k = 1; k <= 12; k++) {
    const w = scale(u, k)
    if (w.every((x) => Math.abs(x - Math.round(x)) < 1e-4)) return w.map((x) => Math.round(x) + 0) as Vec3
  }
  return u
}
/** Null vector of a rank-2 3×3 matrix. */
function nullVec(A: Mat3): Vec3 {
  let best: Vec3 = [0, 0, 0]
  for (const [i, j] of [[0, 1], [0, 2], [1, 2]] as const) {
    const c = cross(A[i]!, A[j]!)
    if (norm(c) > norm(best)) best = c
  }
  return best
}
/** Solve A x = b (possibly singular, consistent); free variables set to 0. */
export function solveLinear(A: Mat3, b: Vec3): Vec3 | null {
  const M = A.map((r, i) => [...r, b[i]!])
  const pivCols: number[] = []
  let row = 0
  for (let col = 0; col < 3 && row < 3; col++) {
    let p = row
    for (let r = row + 1; r < 3; r++) if (Math.abs(M[r]![col]!) > Math.abs(M[p]![col]!)) p = r
    if (Math.abs(M[p]![col]!) < 1e-9) continue
    ;[M[row], M[p]] = [M[p]!, M[row]!]
    const pv = M[row]![col]!
    for (let k = 0; k < 4; k++) M[row]![k]! /= pv
    for (let r = 0; r < 3; r++) {
      if (r === row) continue
      const f = M[r]![col]!
      for (let k = 0; k < 4; k++) M[r]![k]! -= f * M[row]![k]!
    }
    pivCols.push(col)
    row++
  }
  for (let r = row; r < 3; r++) if (Math.abs(M[r]![3]!) > 1e-6) return null
  const x: Vec3 = [0, 0, 0]
  pivCols.forEach((c, r) => (x[c] = M[r]![3]!))
  return x
}
const clean = (v: Vec3): Vec3 => v.map((x) => (Math.abs(x) < 1e-9 ? 0 : x)) as Vec3
const fmtV = (v: Vec3) => `(${v.map((x) => fmtFrac(x)).join(', ')})`
const fmtC = (v: Vec3) => `(${v.map((x) => (Math.abs(x) < 5e-4 ? 0 : x).toFixed(3)).join(', ')}) Å`
const fmtUvw = (v: Vec3) => `[${v.map((x) => fmtFrac(x)).join(' ')}]`
const SUB = '₀₁₂₃₄₅₆₇₈₉'

function planeEquation(hkl: Vec3, c: number): string {
  const xyz = ['x', 'y', 'z']
  let s = ''
  hkl.forEach((h, i) => {
    if (Math.abs(h) < 1e-9) return
    const sign = h < 0 ? (s ? ' − ' : '−') : s ? ' + ' : ''
    const mag = Math.abs(Math.abs(h) - 1) < 1e-9 ? '' : fmtFrac(Math.abs(h))
    s += `${sign}${mag}${xyz[i]}`
  })
  return `${s} = ${fmtFrac(c)}`
}
function axisEquation(p: Vec3, d: Vec3): string | null {
  const nz = d.map((x) => Math.abs(x) > 1e-9)
  if (nz.filter(Boolean).length !== 1) return null
  const xyz = ['x', 'y', 'z']
  return xyz.map((v, i) => (nz[i] ? v : fmtFrac(p[i]!))).join(', ')
}

export function classifyOp(g: SeitzOp, cell: CellParams): SymmetryElementInfo {
  const W = g.R
  const w = g.t
  const d = Math.round(det(W))
  const tr = Math.round(W[0][0] + W[1][1] + W[2][2])
  const proper = d === 1
  const order = proper
    ? ({ 3: 1, [-1]: 2, 0: 3, 1: 4, 2: 6 } as Record<number, number>)[tr] ?? 1
    : ({ [-3]: 2, 1: 2, 0: 6, [-1]: 4, [-2]: 6 } as Record<number, number>)[tr] ?? 2
  // intrinsic part (1/n) Σ W^k w
  let Wk: Mat3 = I3
  let sum: Vec3 = [0, 0, 0]
  for (let k = 0; k < order; k++) {
    sum = add(sum, matVec(Wk, w))
    Wk = matMul(W, Wk)
  }
  let intrinsic = clean(scale(sum, 1 / order))
  const IminusW = I3.map((r, i) => r.map((c, j) => c - W[i]![j]!)) as Mat3
  const toCart = (f: Vec3) => fracToCart(f, cell)
  const base = {
    order,
    intrinsic,
    point: null as Vec3 | null,
    axis: null as Vec3 | null,
    plane: null as { hkl: Vec3; c: number } | null,
    pointCart: null as Vec3 | null,
    axisCart: null as Vec3 | null,
    normalCart: null as Vec3 | null,
  }
  if (proper && order === 1) {
    const isId = w.every((x) => Math.abs(x) < 1e-6)
    return {
      ...base,
      intrinsic: clean(w),
      kind: isId ? 'identity' : 'translation',
      symbol: isId ? '1' : 't',
      lines: isId
        ? ['Identity — same molecule']
        : [`Pure lattice translation t = ${fmtV(w)}`, `|t| = ${norm(toCart(w)).toFixed(3)} Å`],
    }
  }
  const wl = sub(w, intrinsic)
  const fixed = solveLinear(IminusW, wl) ?? [0, 0, 0]
  const point = clean(fixed)
  const pointCart = toCart(point)
  if (!proper && order === 2 && tr === -3) {
    return {
      ...base,
      intrinsic: [0, 0, 0],
      kind: 'inversion',
      symbol: '-1',
      point,
      pointCart,
      lines: [`Inversion centre ‾1 at ${fmtV(point)}`, `Cartesian ${fmtC(pointCart)}`],
    }
  }
  if (proper) {
    let axis = integerize(nullVec(I3.map((r, i) => r.map((c, j) => W[i]![j]! - c)) as Mat3))
    if (order === 2) {
      const f = axis.find((x) => Math.abs(x) > 1e-9) ?? 1
      if (f < 0) axis = scale(axis, -1)
    } else {
      // orient so the rotation is counter-clockwise (right-handed) about +axis
      const v: Vec3 = Math.abs(axis[0]) < 0.5 * norm(axis) ? [1, 0, 0] : [0, 1, 0]
      const u = toCart(v)
      const Wu = toCart(matVec(W, v))
      if (dot(cross(u, Wu), toCart(axis)) < 0) axis = scale(axis, -1)
    }
    axis = clean(axis)
    const axisCart = unit(toCart(axis))
    let ratio = dot(intrinsic, axis) / dot(axis, axis)
    const k = ((Math.round(ratio * order) % order) + order) % order
    ratio = k / order
    const screw = k !== 0
    // keep intrinsic as given (may include a lattice repeat along the axis)
    const symbol = screw ? `${order}${SUB[k]}` : `${order}`
    const eq = axisEquation(point, axis)
    return {
      ...base,
      kind: screw ? 'screw' : 'rotation',
      symbol,
      point,
      pointCart,
      axis,
      axisCart,
      lines: [
        `${screw ? 'Screw axis' : `${order}-fold rotation axis`} ${symbol} along ${fmtUvw(axis)}`,
        `through ${fmtV(point)}${eq ? ` — line ${eq}` : ''}`,
        ...(screw ? [`screw translation ${fmtV(intrinsic)} (${k}/${order} of [${axis.join(' ')}], ${norm(toCart(intrinsic)).toFixed(3)} Å)`] : []),
        `Cartesian point ${fmtC(pointCart)}, direction (${axisCart.map((x) => x.toFixed(3)).join(', ')})`,
      ],
    }
  }
  if (order === 2) {
    // mirror / glide: plane is {x : (I−W)x = w_l}; take a nonzero row
    const rows = IminusW.map((r, i) => ({ r, c: wl[i]! })).sort((a, b) => norm(b.r) - norm(a.r))
    const top = rows[0]!
    const hklRaw = top.r
    const hkl = integerize(hklRaw)
    const f = norm(hkl) / norm(hklRaw)
    const sign = Math.sign(dot(hkl, hklRaw)) || 1
    const c = top.c * f * sign
    const Minv = matInv([0, 1, 2].map((i) => [toCart([1, 0, 0])[i]!, toCart([0, 1, 0])[i]!, toCart([0, 0, 1])[i]!]) as Mat3)
    const normalCart = unit(matVec([[Minv[0][0], Minv[1][0], Minv[2][0]], [Minv[0][1], Minv[1][1], Minv[2][1]], [Minv[0][2], Minv[1][2], Minv[2][2]]], hkl))
    // reduce glide vector modulo lattice (keep it in (−1/2, 1/2])
    intrinsic = clean(intrinsic.map((x) => x - Math.round(x - 1e-9)) as Vec3)
    const glide = intrinsic.some((x) => Math.abs(x) > 1e-6)
    const nz = intrinsic.map((x) => Math.abs(x) > 1e-6)
    const nn = nz.filter(Boolean).length
    const quarter = intrinsic.some((x) => Math.abs(Math.abs(x) - 0.25) < 1e-6)
    const letter = !glide ? 'm' : quarter ? 'd' : nn === 1 ? ['a', 'b', 'c'][nz.indexOf(true)]! : nn === 2 ? 'n' : 'g'
    return {
      ...base,
      intrinsic,
      kind: glide ? 'glide' : 'mirror',
      symbol: letter,
      point,
      pointCart,
      plane: { hkl, c },
      normalCart,
      lines: [
        `${glide ? `${letter}-glide plane` : 'Mirror plane m'} ${planeEquation(hkl, c)}  (normal (${hkl.join(' ')}))`,
        ...(glide ? [`glide vector ${fmtV(intrinsic)} (${norm(toCart(intrinsic)).toFixed(3)} Å)`] : []),
        `Cartesian point ${fmtC(pointCart)}, normal (${normalCart.map((x) => x.toFixed(3)).join(', ')})`,
      ],
    }
  }
  // rotoinversion −3, −4, −6
  const negW = W.map((r) => r.map((x) => -x)) as Mat3
  const axis = integerize(nullVec(I3.map((r, i) => r.map((c, j) => negW[i]![j]! - c)) as Mat3))
  const center = clean(solveLinear(IminusW, w) ?? point)
  const axisCart = unit(toCart(axis))
  const centerCart = toCart(center)
  return {
    ...base,
    intrinsic: [0, 0, 0],
    kind: 'rotoinversion',
    symbol: `-${order === 4 ? 4 : tr === 0 ? 3 : 6}`,
    point: center,
    pointCart: centerCart,
    axis,
    axisCart,
    lines: [
      `Rotoinversion ‾${order === 4 ? 4 : tr === 0 ? 3 : 6} along ${fmtUvw(axis)}`,
      `inversion point ${fmtV(center)} — Cartesian ${fmtC(centerCart)}`,
    ],
  }
}

/** Fractional of a Cartesian position. */
export const toFrac = (p: Vec3, cell: CellParams) => cartToFrac(p, cell)
