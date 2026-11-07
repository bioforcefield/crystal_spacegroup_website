/**
 * Deterministic geometric classification of a space-group operation
 * (W, w) given in fractional coordinates of the conventional cell — the
 * standard ITA Vol. A procedure (§1.2.2): order k of W, intrinsic
 * (screw/glide) part w_g = (1/k)·Σ W^j w, location from (I − W)x = w − w_g.
 *
 * Everything is derived from the exact Seitz pair (centring translations
 * included, since each centred coset member is its own (W, w)); nothing is
 * read from stored labels, class ids or the Hermann–Mauguin symbol.
 * Screw / glide parts are reduced modulo the lattice Z³ along the element,
 * so (W, w) and (W, w + L) can differ in kind when L is not parallel to the
 * element (e.g. a mirror whose lattice copy is a real glide).
 * Directions are lattice directions [uvw]; planes are given by their locus
 * (e.g. "x, y, ¼"), never as "⊥ a" (wrong for oblique bases).
 */
import type { Mat3, Vec3 } from './types'

export type OpKind =
  | 'identity'
  | 'translation'
  | 'rotation'
  | 'screw'
  | 'inversion'
  | 'rotoinversion'
  | 'mirror'
  | 'glide'

export interface OpClassification {
  kind: OpKind
  /** Rotation order n of W (1, 2, 3, 4, 6); rotoinversions use n of −W. */
  order: number
  /** Rotation sense about `axis` ('+' counter-clockwise, '' for 2-folds). */
  sense: '' | '+' | '-'
  /** Primitive lattice direction of the axis (rotation / screw / rotoinversion). */
  axis?: Vec3
  /** Primitive reciprocal-lattice normal (hkl) of the plane (mirror / glide). */
  normal?: Vec3
  /** Unreduced intrinsic translation (fractional): actual screw/glide part of this (W, w). */
  intrinsicRaw: Vec3
  /**
   * Intrinsic translation reduced modulo the full translation lattice
   * (Z³ + centring) along the element: the screw / glide that defines the
   * element type (zero for rotations and mirrors).
   */
  intrinsic: Vec3
  /** Intrinsic part of this coset member modulo Z³ only (ITA operation symbol). */
  intrinsicZ3: Vec3
  /** Shortest group translation along the axis as a fraction of `axis` (axes only). */
  period?: number
  /** Screw index m of n_m (screw only, verified integer). */
  screwM?: number
  /** Glide letter (a, b, c, e, n, d) or 'g' for any other glide vector (element type). */
  glideLetter?: 'a' | 'b' | 'c' | 'e' | 'n' | 'd' | 'g'
  /** A point of the element (fractional). */
  point: Vec3
  /** Inversion point of a rotoinversion / inversion. */
  centre?: Vec3
  /** ITA-style locus of the element, e.g. "0, ¼, z" or "x, x, z". */
  locus: string
  /** ITA symmetry-operation symbol, e.g. "2(0,0,½) ¼, 0, z", "n(½,½,0) x, y, ¼". */
  symbol: string
  /** Short human label, e.g. "2₁ screw ‖ [001]" or "b-glide, plane x, y, ¼". */
  label: string
  /** Compact symbol for chips / swatches, e.g. "2₁", "4⁺", "c", "m", "−1". */
  short: string
}

const TOL = 1e-6
const I3: Mat3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
]

const mm = (A: Mat3, B: Mat3): Mat3 =>
  A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j])) as Mat3
const mv = (A: Mat3, v: Vec3): Vec3 => [
  A[0][0] * v[0] + A[0][1] * v[1] + A[0][2] * v[2],
  A[1][0] * v[0] + A[1][1] * v[1] + A[1][2] * v[2],
  A[2][0] * v[0] + A[2][1] * v[1] + A[2][2] * v[2],
]
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const scl = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const tr = (A: Mat3): Mat3 => [0, 1, 2].map((i) => [A[0][i], A[1][i], A[2][i]]) as Mat3
const det = (m: Mat3) =>
  m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
  m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
  m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
const near0 = (v: Vec3) => Math.abs(v[0]) < TOL && Math.abs(v[1]) < TOL && Math.abs(v[2]) < TOL
const clean = (x: number) => (Math.abs(x) < 1e-9 ? 0 : x)
const cleanV = (v: Vec3): Vec3 => [clean(v[0]), clean(v[1]), clean(v[2])]

function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a))
  b = Math.abs(Math.round(b))
  while (b) [a, b] = [b, a % b]
  return a
}

/** Primitive integer vector, first non-zero component positive. */
function primitive(v: Vec3): Vec3 {
  const r = v.map((x) => Math.round(x)) as Vec3
  const g = gcd(gcd(r[0], r[1]), r[2]) || 1
  let p = r.map((x) => x / g) as Vec3
  const first = p.find((x) => x !== 0) ?? 1
  if (first < 0) p = scl(p, -1)
  return cleanV(p)
}

/** Integer null vector of an integer rank-2 matrix (cross of independent rows). */
function nullVector(M: Mat3): Vec3 {
  const rows = M as Vec3[]
  let best: Vec3 = [0, 0, 1]
  let bestN = 0
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++) {
      const c = cross(rows[i], rows[j])
      const n = Math.abs(c[0]) + Math.abs(c[1]) + Math.abs(c[2])
      if (n > bestN + TOL) {
        bestN = n
        best = c
      }
    }
  return primitive(best)
}

/** Least-squares solve of a stacked system (rows × 3) via normal equations. */
function lsq(rows: Vec3[], rhs: number[]): Vec3 {
  const N: Mat3 = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ]
  const b: Vec3 = [0, 0, 0]
  rows.forEach((r, k) => {
    for (let i = 0; i < 3; i++) {
      b[i] += r[i] * rhs[k]
      for (let j = 0; j < 3; j++) N[i][j] += r[i] * r[j]
    }
  })
  const d = det(N)
  const c = (r0: number, c0: number, r1: number, c1: number) => N[r0][c0] * N[r1][c1] - N[r0][c1] * N[r1][c0]
  const inv: Mat3 = [
    [c(1, 1, 2, 2) / d, -c(0, 1, 2, 2) / d, c(0, 1, 1, 2) / d],
    [-c(1, 0, 2, 2) / d, c(0, 0, 2, 2) / d, -c(0, 0, 1, 2) / d],
    [c(1, 0, 2, 1) / d, -c(0, 0, 2, 1) / d, c(0, 0, 1, 1) / d],
  ]
  return cleanV(mv(inv, b))
}

const UNICODE_FRAC: Record<string, string> = {
  '1/2': '½', '1/3': '⅓', '2/3': '⅔', '1/4': '¼', '3/4': '¾', '1/6': '⅙', '5/6': '⅚',
  '1/8': '⅛', '3/8': '⅜', '5/8': '⅝', '7/8': '⅞',
}

/** Exact-looking rational formatting (denominators ≤ 24). */
export function fmtFrac(x: number): string {
  if (Math.abs(x) < 1e-9) return '0'
  for (let q = 1; q <= 24; q++) {
    const p = Math.round(x * q)
    if (Math.abs(x * q - p) < 1e-6) {
      const g = gcd(p, q)
      const P = p / g
      const Q = q / g
      if (Q === 1) return String(P).replace('-', '−')
      const key = `${Math.abs(P)}/${Q}`
      const s = UNICODE_FRAC[key] ?? key
      return P < 0 ? `−${s}` : s
    }
  }
  return x.toFixed(4).replace('-', '−')
}

export function fmtVec(v: Vec3): string {
  return `(${v.map(fmtFrac).join(',')})`
}

const LETTERS = ['x', 'y', 'z'] as const

/** "c + r·L" with L a coordinate letter. */
function affineTerm(c: number, r: number, L: string): string {
  const parts: string[] = []
  if (Math.abs(r) > TOL) {
    const coef = Math.abs(r - 1) < TOL ? '' : Math.abs(r + 1) < TOL ? '−' : fmtFrac(r)
    parts.push(`${coef}${L}`)
  }
  if (Math.abs(c) > TOL || parts.length === 0) {
    const f = fmtFrac(c)
    if (parts.length === 0) parts.push(f)
    else parts.push(c < 0 ? `−${f.replace('−', '')}` : `+${f}`)
  }
  return parts.join('')
}

/** Locus of a line p + λu, ITA style (e.g. "x, x, 0", "¼, 0, z"). */
function lineLocus(p: Vec3, u: Vec3): string {
  // Parameter letter: the last coordinate with u_k ≠ 0 gets its own letter.
  // Parameter: the coordinate with the smallest non-zero |u_k| (integer ratios).
  let k = -1
  for (let i = 0; i < 3; i++) if (Math.abs(u[i]) > TOL && (k < 0 || Math.abs(u[i]) < Math.abs(u[k]) - TOL)) k = i
  const L = LETTERS[k]
  return [0, 1, 2]
    .map((i) => {
      if (i === k) return L
      const r = u[i] / u[k]
      return affineTerm(p[i] - r * p[k], r, L)
    })
    .join(', ')
}

/** Locus of a plane h·x = d, ITA style (e.g. "x, y, ¼", "x, x, z"). */
function planeLocus(h: Vec3, d: number): string {
  // Solve for the last coordinate with h_k ≠ 0 in terms of the others.
  let k = 2
  while (k >= 0 && Math.abs(h[k]) < TOL) k--
  // Express the solved coordinate with the letter of the first other free coordinate when only one couples.
  const others = [0, 1, 2].filter((i) => i !== k)
  const coupled = others.filter((i) => Math.abs(h[i]) > TOL)
  if (coupled.length === 0) {
    return [0, 1, 2].map((i) => (i === k ? fmtFrac(d / h[k]) : LETTERS[i])).join(', ')
  }
  if (coupled.length === 1) {
    const j = coupled[0]
    // x_k = (d − h_j x_j)/h_k  → parameterise both by letter of j
    const r = -h[j] / h[k]
    const c = d / h[k]
    return [0, 1, 2]
      .map((i) => (i === k ? affineTerm(c, r, LETTERS[j]) : LETTERS[i]))
      .join(', ')
  }
  // Fully general plane: write the equation.
  const terms = [0, 1, 2]
    .filter((i) => Math.abs(h[i]) > TOL)
    .map((i, n) => {
      const c = h[i]
      const s = Math.abs(c - 1) < TOL ? '' : Math.abs(c + 1) < TOL ? '−' : fmtFrac(c)
      return `${n > 0 && c > 0 ? '+' : ''}${s}${LETTERS[i]}`
    })
    .join('')
  return `${terms} = ${fmtFrac(d)}`
}

function rotationOrder(W: Mat3): number {
  const t = W[0][0] + W[1][1] + W[2][2]
  const d = det(W)
  const tp = Math.round(t * d) // trace of the proper part
  return { 3: 1, [-1]: 2, 0: 3, 1: 4, 2: 6 }[tp] ?? 1
}

/** Sense of the proper rotation P about u: sign of det[u, x, Px]. */
function senseOf(P: Mat3, u: Vec3, n: number): '' | '+' | '-' {
  if (n <= 2) return ''
  const cands: Vec3[] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ]
  let best = 0
  for (const x of cands) {
    const d = det(tr([u, x, mv(P, x)] as Mat3))
    if (Math.abs(d) > Math.abs(best)) best = d
  }
  return best > 0 ? '+' : '-'
}

const SUB = '₀₁₂₃₄₅₆₇₈₉'
const SUP: Record<string, string> = { '+': '⁺', '-': '⁻', '': '' }
const dirName = (u: Vec3) => {
  const key = u.join(',')
  if (key === '1,0,0') return 'a'
  if (key === '0,1,0') return 'b'
  if (key === '0,0,1') return 'c'
  return `[${u.map((x) => (x < 0 ? `${-x}̄` : String(x))).join('')}]`
}

/** In-plane Z³ mesh (v1, v2) of the plane with primitive normal h, axis vectors preferred. */
const meshCache = new Map<string, [Vec3, Vec3]>()
function planeLatticeBasis(h: Vec3): [Vec3, Vec3] {
  const ck = h.join(',')
  const hit = meshCache.get(ck)
  if (hit) return hit
  const r = planeLatticeBasisRaw(h)
  meshCache.set(ck, r)
  return r
}
function planeLatticeBasisRaw(h: Vec3): [Vec3, Vec3] {
  const uniq = new Map<string, Vec3>()
  for (let i = -2; i <= 2; i++)
    for (let j = -2; j <= 2; j++)
      for (let k = -2; k <= 2; k++) {
        const v: Vec3 = [i, j, k]
        if ((!i && !j && !k) || Math.abs(dot(h, v)) > TOL) continue
        const p = primitive(v)
        uniq.set(p.join(','), p)
      }
  const nnz = (v: Vec3) => v.filter((x) => x !== 0).length
  const cands = [...uniq.values()].sort((p, q) => nnz(p) - nnz(q) || dot(p, p) - dot(q, q))
  for (const a of cands)
    for (const b of cands) {
      const c = cross(a, b)
      if (near0(sub(c, h)) || near0(add(c, h))) return [a, b]
    }
  throw new Error('no in-plane lattice basis')
}

/**
 * Group translation lattice restricted to a plane (h·v = 0): Z³ plus the
 * centring vectors. Returns a reduced 2D basis and a membership test.
 */
type PlaneLattice = { b1: Vec3; b2: Vec3; contains: (v: Vec3) => boolean }
const latCache = new Map<string, PlaneLattice>()
function inPlaneLattice(h: Vec3, centring: readonly Vec3[]): PlaneLattice {
  const ck = `${h.join(',')}|${centring.map((c) => c.join(',')).join(';')}`
  let hit = latCache.get(ck)
  if (!hit) {
    hit = inPlaneLatticeRaw(h, centring)
    latCache.set(ck, hit)
  }
  return hit
}
function inPlaneLatticeRaw(h: Vec3, centring: readonly Vec3[]): PlaneLattice {
  const cands: Vec3[] = []
  for (const c of [[0, 0, 0] as Vec3, ...centring])
    for (let i = -2; i <= 2; i++)
      for (let j = -2; j <= 2; j++)
        for (let k = -2; k <= 2; k++) {
          const v = cleanV(add(c, [i, j, k]))
          if (near0(v) || Math.abs(dot(h, v)) > TOL) continue
          cands.push(v)
        }
  cands.sort((p, q) => dot(p, p) - dot(q, q))
  const coeffs = (v: Vec3, b1: Vec3, b2: Vec3): [number, number] => {
    const G11 = dot(b1, b1), G12 = dot(b1, b2), G22 = dot(b2, b2)
    const r1 = dot(v, b1), r2 = dot(v, b2)
    const D = G11 * G22 - G12 * G12
    return [(r1 * G22 - r2 * G12) / D, (r2 * G11 - r1 * G12) / D]
  }
  const isInt = (x: number) => Math.abs(x - Math.round(x)) < 1e-6
  const b1 = cands[0]
  for (const b2 of cands) {
    if (near0(cross(b1, b2))) continue
    if (cands.every((v) => coeffs(v, b1, b2).every(isInt))) {
      const contains = (v: Vec3) => {
        if (Math.abs(dot(h, v)) > TOL) return false
        const [p, q] = coeffs(v, b1, b2)
        return isInt(p) && isInt(q) && near0(sub(v, add(scl(b1, Math.round(p)), scl(b2, Math.round(q)))))
      }
      return { b1, b2, contains }
    }
  }
  throw new Error('no in-plane group lattice basis')
}

/**
 * Shortest group translation along the primitive lattice direction u, as a
 * fraction P ∈ (0, 1] of u (P = ½ for I along ⟨111⟩, F along ⟨110⟩ …).
 */
const periodCache = new Map<string, number>()
export function axisPeriod(u: Vec3, centring: readonly Vec3[]): number {
  const ck = `${u.join(',')}|${centring.map((c) => c.join(',')).join(';')}`
  const hit = periodCache.get(ck)
  if (hit !== undefined) return hit
  const r = axisPeriodRaw(u, centring)
  periodCache.set(ck, r)
  return r
}
function axisPeriodRaw(u: Vec3, centring: readonly Vec3[]): number {
  let P = 1
  for (const c of centring)
    for (let i = -2; i <= 2; i++)
      for (let j = -2; j <= 2; j++)
        for (let k = -2; k <= 2; k++) {
          const v = add(c, [i, j, k])
          if (!near0(cross(v, u))) continue
          const lam = dot(v, u) / dot(u, u)
          if (lam > TOL && lam < P - TOL) P = lam
        }
  return P
}

const isHalf = (x: number) => Math.abs(Math.abs(x) - 0.5) < TOL
const isQuarter = (x: number) => Math.abs(Math.abs(x) - 0.25) < TOL || Math.abs(Math.abs(x) - 0.75) < TOL
const nnzOf = (v: Vec3) => v.filter((x) => Math.abs(x) > TOL).length

/** Nicest representative: fewest non-zero components, smallest, non-negative first. */
function pickRep(reps: Vec3[]): Vec3 {
  const key = (v: Vec3) => [
    nnzOf(v),
    v.reduce((s, x) => s + Math.abs(x), 0),
    v.filter((x) => x < -TOL).length,
    -v[0], -v[1], -v[2],
  ]
  return [...reps].sort((p, q) => {
    const a = key(p), b = key(q)
    for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > TOL) return a[i] - b[i]
    return 0
  })[0]
}

type GlideLetter = NonNullable<OpClassification['glideLetter']>

/**
 * Glide letter of the in-plane vector g modulo the translation lattice T of
 * the plane (ITA Table 2.1.2.1):
 *  - a / b / c: some representative is ½ of a cell axis; two such → e (double glide);
 *  - n: g ≡ ½(v1 + v2) for the plane's conventional Z³ mesh (v1, v2) and a
 *    representative is half a face / body diagonal (components 0, ±½ only),
 *    so ½[120] + ½c on a hexagonal plane is 'g', not 'n';
 *  - d: a representative with every non-zero component ±¼ / ±¾;
 *  - otherwise a general glide 'g' (e.g. ½[110] on the plane x, x, z).
 * Returns null when g is a lattice vector (a mirror).
 */
function glideOf(
  g: Vec3,
  h: Vec3,
  lat: { b1: Vec3; b2: Vec3; contains: (v: Vec3) => boolean },
): { letter: GlideLetter; rep: Vec3 } | null {
  if (lat.contains(g)) return null
  // Bring g into the fundamental mesh of (b1, b2) first so large coset
  // members (w + n with big n) still have small representatives.
  const g11 = dot(lat.b1, lat.b1), g12 = dot(lat.b1, lat.b2), g22 = dot(lat.b2, lat.b2)
  const det = g11 * g22 - g12 * g12
  const r1 = dot(g, lat.b1), r2 = dot(g, lat.b2)
  const al = (g22 * r1 - g12 * r2) / det
  const be = (g11 * r2 - g12 * r1) / det
  g = cleanV(sub(g, add(scl(lat.b1, Math.floor(al + TOL)), scl(lat.b2, Math.floor(be + TOL)))))
  const reps: Vec3[] = []
  for (let i = -4; i <= 4; i++)
    for (let j = -4; j <= 4; j++) {
      const r = cleanV(add(g, add(scl(lat.b1, i), scl(lat.b2, j))))
      if (r.every((x) => Math.abs(x) <= 1 + TOL)) reps.push(r)
    }
  const axes = [0, 1, 2].filter((i) => reps.some((r) => isHalf(r[i]) && nnzOf(r) === 1))
  if (axes.length >= 2) {
    const e: Vec3 = [0, 0, 0]
    e[axes[0]] = 0.5
    return { letter: 'e', rep: e }
  }
  if (axes.length === 1) {
    const e: Vec3 = [0, 0, 0]
    e[axes[0]] = 0.5
    return { letter: (['a', 'b', 'c'] as const)[axes[0]], rep: e }
  }
  const [v1, v2] = planeLatticeBasis(h)
  const halfDiag = scl(add(v1, v2), 0.5)
  const diagReps = reps.filter((r) => nnzOf(r) >= 2 && r.every((x) => Math.abs(x) < TOL || isHalf(x)))
  if (lat.contains(sub(g, halfDiag)) && diagReps.length) return { letter: 'n', rep: pickRep(diagReps) }
  const dReps = reps.filter((r) => nnzOf(r) >= 2 && r.every((x) => Math.abs(x) < TOL || isQuarter(x)))
  if (dReps.length) return { letter: 'd', rep: pickRep(dReps) }
  return { letter: 'g', rep: pickRep(reps) }
}

const BAR = '\u0304'
/** Rotoinversion / inversion symbol with an overbar, e.g. "4̄⁻", "1̄". */
const barred = (n: number, sense: '' | '+' | '-' = '') => `${n}${BAR}${SUP[sense]}`

const reduceZ3 = (v: Vec3): Vec3 => cleanV(v.map((x) => x - Math.floor(x + 1e-9)) as Vec3)

/** Translation part of the group lattice: centring vectors of the listed operators. */
export function centringOf(ops: readonly { R: Mat3; t: Vec3 }[]): Vec3[] {
  const out: Vec3[] = []
  for (const o of ops) {
    if (!o.R.every((r, i) => r.every((x, j) => x === (i === j ? 1 : 0)))) continue
    const t = reduceZ3(o.t)
    if (!near0(t) && !out.some((c) => near0(sub(c, t)))) out.push(t)
  }
  return out
}

/**
 * Classify (W, w). `centring` lists the group's centring translations
 * (fractional, mod 1); the element type (screw vs rotation, glide letter,
 * mirror vs glide) is reduced modulo the full translation lattice Z³ +
 * centring, while `symbol` keeps the ITA operation symbol of this coset
 * member (its own intrinsic vector modulo Z³).
 */
export function classifySeitz(W: Mat3, w: Vec3, centring: readonly Vec3[] = []): OpClassification {
  const d = det(W)
  const n = rotationOrder(W)
  const proper = d > 0
  // Intrinsic part: (1/k) Σ_{j<k} W^j w, k = order of W (2n for −3 etc.).
  let k = n
  if (!proper) k = n % 2 === 0 ? n : 2 * n
  let sum: Vec3 = [0, 0, 0]
  let P: Mat3 = I3
  for (let j = 0; j < k; j++) {
    sum = add(sum, mv(P, w))
    P = mm(W, P)
  }
  const intrinsicRaw = cleanV(scl(sum, 1 / k))
  const locT = sub(w, intrinsicRaw)
  const IW = [0, 1, 2].map((i) => [0, 1, 2].map((j) => (i === j ? 1 : 0) - W[i][j])) as Mat3
  const inLattice = (v: Vec3) => [[0, 0, 0] as Vec3, ...centring].some((c) => sub(v, c).every((x) => Math.abs(x - Math.round(x)) < 1e-6))

  if (proper && n === 1) {
    const red = reduceZ3(w)
    if (near0(red)) {
      return { kind: 'identity', order: 1, sense: '', intrinsicRaw: w, intrinsic: red, intrinsicZ3: red, point: [0, 0, 0], locus: '', symbol: '1', label: 'identity', short: '1' }
    }
    const tv = fmtVec(w)
    const centr = inLattice(w)
    return { kind: 'translation', order: 1, sense: '', intrinsicRaw: w, intrinsic: red, intrinsicZ3: red, point: [0, 0, 0], locus: '', symbol: `t${fmtVec(red)}`, label: `${centr ? 'centring translation' : 'translation'} ${tv}`, short: 't' }
  }

  if (proper) {
    const u = nullVector(IW)
    const sense = senseOf(W, u, n)
    const lam = dot(intrinsicRaw, u) / dot(u, u)
    const lamZ3 = clean(lam - Math.floor(lam + 1e-9))
    const intrinsicZ3 = cleanV(scl(u, lamZ3))
    const period = axisPeriod(u, centring)
    let lamRed = clean(lam - period * Math.floor(lam / period + 1e-9))
    if (Math.abs(lamRed - period) < 1e-9) lamRed = 0
    const intrinsic = cleanV(scl(u, lamRed))
    const kAxis = [0, 1, 2].reduce((b, i) => (Math.abs(u[i]) > Math.abs(u[b]) ? i : b), 0)
    const ek: Vec3 = [0, 0, 0]
    ek[kAxis] = 1
    const point = lsq([...(IW as Vec3[]), ek], [...locT, 0])
    const locus = lineLocus(point, u)
    const screw = Math.abs(lamRed) > TOL
    const supS = SUP[sense]
    const symVec = near0(intrinsicZ3) ? '' : fmtVec(intrinsicZ3)
    if (!screw) {
      return {
        kind: 'rotation', order: n, sense, axis: u, period, intrinsicRaw, intrinsic, intrinsicZ3, point, locus,
        symbol: `${n}${supS}${symVec} ${locus}`,
        label: `${n}-fold rotation${sense ? ` (${n}${supS})` : ''} ‖ ${dirName(u)}`,
        short: `${n}${supS}`,
      }
    }
    // n_m: translation m/n of the axis period along the direction about which the turn is positive.
    const mRaw = ((sense === '-' ? period - lamRed : lamRed) / period) * n
    const m = Math.round(mRaw)
    const verified = Math.abs(mRaw - m) < 1e-6 && m > 0 && m < n
    const sym = verified ? `${n}${SUB[m]}` : `${n}`
    return {
      kind: 'screw', order: n, sense, axis: u, period, intrinsicRaw, intrinsic, intrinsicZ3, point, locus,
      screwM: verified ? m : undefined,
      symbol: `${n}${supS}${symVec} ${locus}`,
      label: verified ? `${sym} screw ‖ ${dirName(u)}` : `screw (${n}-fold + ${fmtVec(intrinsic)}) ‖ ${dirName(u)}`,
      short: sym,
    }
  }

  // Improper.
  if (n === 1) {
    // −1: inversion through w/2
    const centre = cleanV(scl(w, 0.5))
    const p = fmtVec(centre).slice(1, -1).split(',').join(', ')
    return { kind: 'inversion', order: 1, sense: '', centre, intrinsicRaw: [0, 0, 0], intrinsic: [0, 0, 0], intrinsicZ3: [0, 0, 0], point: centre, locus: p, symbol: `${barred(1)} ${p}`, label: `inversion centre ${barred(1)} at ${p}`, short: barred(1) }
  }
  if (n === 2) {
    // Reflection: normal h with Wᵀh = −h.
    const WT1 = tr(W).map((r, i) => r.map((x, j) => x + (i === j ? 1 : 0))) as Mat3
    const h = nullVector(WT1)
    const dist = dot(h, locT) / 2 // plane: h·x = h·(w − w_g)/2
    const kAxis = [0, 1, 2].reduce((b, i) => (Math.abs(h[i]) > Math.abs(h[b]) ? i : b), 0)
    const point: Vec3 = [0, 0, 0]
    point[kAxis] = dist / h[kAxis]
    const locus = planeLocus(h, dist)
    // ITA operation symbol: this coset member's glide modulo Z³ only.
    const z3 = glideOf(intrinsicRaw, h, inPlaneLattice(h, []))
    const symbol = !z3
      ? `m ${locus}`
      : `${z3.letter}${'abc'.includes(z3.letter) ? '' : fmtVec(z3.rep)} ${locus}`
    const intrinsicZ3 = z3 ? z3.rep : ([0, 0, 0] as Vec3)
    // Element type: modulo the full translation lattice (centring included).
    const el = glideOf(intrinsicRaw, h, inPlaneLattice(h, centring))
    if (!el) {
      return { kind: 'mirror', order: 2, sense: '', normal: h, intrinsicRaw, intrinsic: [0, 0, 0], intrinsicZ3, point: cleanV(point), locus, symbol, label: `mirror, plane ${locus}`, short: 'm' }
    }
    const L = el.letter
    const name = L === 'g' ? 'glide' : L === 'e' ? 'e-glide (double glide)' : `${L}-glide`
    return {
      kind: 'glide', order: 2, sense: '', normal: h, intrinsicRaw, intrinsic: el.rep, intrinsicZ3, glideLetter: L, point: cleanV(point), locus,
      symbol,
      label: `${name}, plane ${locus}, glide ${fmtVec(el.rep)}`,
      short: L,
    }
  }
  // Rotoinversion −3, −4, −6: unique fixed point, axis = null space of W + I.
  const Q = W.map((r) => r.map((x) => -x)) as Mat3
  const IQ = [0, 1, 2].map((i) => [0, 1, 2].map((j) => (i === j ? 1 : 0) - Q[i][j])) as Mat3
  const u = nullVector(IQ)
  const sense = senseOf(Q, u, n)
  const centre = lsq(IW as Vec3[], w)
  const locus = lineLocus(centre, u)
  const p = fmtVec(centre).slice(1, -1).split(',').join(', ')
  return {
    kind: 'rotoinversion', order: n, sense, axis: u, centre, intrinsicRaw: [0, 0, 0], intrinsic: [0, 0, 0], intrinsicZ3: [0, 0, 0], point: centre, locus,
    symbol: `${barred(n, sense)} ${locus}; ${p}`,
    label: `${barred(n, sense)} rotoinversion ‖ ${dirName(u)}, centre ${p}`,
    short: barred(n, sense),
  }
}

/**
 * Fractional lattice translation L of the shown copy: image = W·base + w + L.
 * Returns null when the residual is not a lattice vector (the image is not
 * this operation's mate of base).
 */
export function shownLatticeShift(W: Mat3, w: Vec3, baseFrac: Vec3, imageFrac: Vec3): Vec3 | null {
  const raw = add(mv(W, baseFrac), w)
  const r = sub(imageFrac, raw)
  const L = cleanV(r.map((x) => Math.round(x)) as Vec3)
  return near0(sub(r, L)) ? L : null
}

const TURN_WORD: Record<number, string> = { 2: 'half-turn', 3: 'third-turn', 4: 'quarter-turn', 6: 'sixth-turn' }

/** Signed turn about the listed axis direction, e.g. "quarter-turn (−90°, 4⁻)". */
function turnText(c: OpClassification, sym: string): string {
  const deg = Math.round(360 / c.order)
  if (c.order === 2) return `half-turn (180°${sym ? `, ${sym}` : ''})`
  const sign = c.sense === '-' ? '−' : '+'
  return `${TURN_WORD[c.order] ?? `${deg}° turn`} (${sign}${deg}°, ${sym})`
}

export interface MotionText {
  /** Plain-language sentence (no coordinates) for the visible caption. */
  plain: string
  /** One-sentence description of the drawn ghost path with loci / vectors. */
  lead: string
  /** Extra precise notes (lattice advances, helix hand vs the axis's nominal hand). */
  notes: string[]
  /** Hand of the drawn helical path (screw-like motions with n > 2). */
  pathHand?: 'right' | 'left'
}

/**
 * Plain-language description of the drawn ghost path for the shown copy
 * (W, w + L), from its unreduced intrinsic part — matches opPath exactly:
 * the ghost turns by the smallest angle in the copy's own sense about its
 * axis and advances by the full (unreduced) axial part.
 */
function describeMotionDetail(c: OpClassification): Omit<MotionText, 'plain'> {
  const adv = fmtVec(c.intrinsicRaw)
  const notes: string[] = []
  switch (c.kind) {
    case 'identity':
      return { lead: 'No motion (identity).', notes }
    case 'translation':
      return { lead: `Motion shown: the ghost slides straight by ${fmtVec(c.intrinsicRaw)}.`, notes }
    case 'rotation':
    case 'screw': {
      const sym = `${c.order}${SUP[c.sense]}`
      const moving = !near0(c.intrinsicRaw)
      let lead = `Motion shown: a ${turnText(c, c.order === 2 ? '' : sym)} about the axis ${c.locus}`
      let pathHand: MotionText['pathHand']
      if (moving) {
        lead += ` while advancing ${adv}`
        if (c.order > 2) {
          const lam = dot(c.intrinsicRaw, c.axis!)
          const turn = c.sense === '-' ? -1 : 1
          pathHand = turn * lam > 0 ? 'right' : 'left'
          lead += `: a ${pathHand}-handed helical path`
        }
      }
      lead += '.'
      if (c.kind === 'rotation' && moving) {
        notes.push(`The advance ${adv} is a lattice translation, so the element is a plain ${c.order}-fold rotation axis.`)
      }
      if (c.kind === 'screw' && c.screwM && c.order > 2 && pathHand) {
        const m = c.screwM
        const sym2 = `${c.order}${SUB[m]}`
        const nominal = 2 * m === c.order ? null : 2 * m < c.order ? 'right' : 'left'
        if (!nominal) {
          notes.push(`A ${sym2} axis has no hand (its ${c.order}⁺ and ${c.order}⁻ screws advance by the same amount); this copy follows a ${pathHand}-handed path.`)
        } else if (nominal !== pathHand) {
          notes.push(`The element is a ${sym2} axis, which is ${nominal}-handed (${c.order}⁺ with ${fmtFrac(m / c.order)} of the axis period); this copy reaches its mate along the ${pathHand}-handed path of the same axis.`)
        } else {
          notes.push(`The element is a ${sym2} axis, which is ${nominal}-handed, like this path.`)
        }
      }
      return { lead, notes, pathHand }
    }
    case 'mirror':
    case 'glide': {
      const moving = !near0(c.intrinsicRaw)
      const lead = `Motion shown: the ghost flattens onto the plane ${c.locus} and emerges reflected${moving ? ` while sliding ${adv} in the plane` : ''}.`
      if (c.kind === 'mirror' && moving) notes.push(`The slide ${adv} is a lattice translation, so the plane is a mirror.`)
      return { lead, notes }
    }
    case 'inversion':
      return { lead: `Motion shown: the ghost shrinks through the centre ${c.locus} and emerges inverted.`, notes }
    case 'rotoinversion':
      return {
        lead: `Motion shown: a ${turnText(c, barred(c.order, c.sense))} about the axis ${c.locus} while shrinking through ${fmtVec(c.centre!)}; the ghost emerges inverted.`,
        notes,
      }
  }
}

export function describeMotion(c: OpClassification): MotionText {
  const d = describeMotionDetail(c)
  return { ...d, plain: plainMotion(c, d.pathHand) }
}

/** Caption sentence without coordinates: what moves, how, and the sense. */
function plainMotion(c: OpClassification, hand?: 'right' | 'left'): string {
  const moving = !near0(c.intrinsicRaw)
  switch (c.kind) {
    case 'identity':
      return 'No motion (identity).'
    case 'translation':
      return 'Motion shown: the ghost slides straight to its copy (a lattice translation).'
    case 'rotation':
    case 'screw': {
      const turn = turnText(c, c.order === 2 ? '' : `${c.order}${SUP[c.sense]}`)
      if (!moving) return `Motion shown: a ${turn} about the highlighted axis.`
      return `Motion shown: a ${turn} about the highlighted axis while advancing along it${hand ? ` (${hand}-handed helix)` : ''}.`
    }
    case 'mirror':
    case 'glide':
      return `Motion shown: the ghost flattens onto the highlighted plane and emerges reflected${moving ? ', sliding along the plane' : ''}.`
    case 'inversion':
      return 'Motion shown: the ghost shrinks through the highlighted centre and emerges inverted.'
    case 'rotoinversion':
      return `Motion shown: a ${turnText(c, barred(c.order, c.sense))} about the highlighted axis while shrinking through its centre; the ghost emerges inverted.`
  }
}
