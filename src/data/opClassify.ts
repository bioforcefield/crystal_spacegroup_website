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
  /** Intrinsic translation reduced modulo lattice vectors along the element. */
  intrinsic: Vec3
  /** Screw index m of n_m (screw only, verified integer). */
  screwM?: number
  /** Glide letter (a, b, c, n, d) or 'g' for any other glide vector. */
  glideLetter?: 'a' | 'b' | 'c' | 'n' | 'd' | 'g'
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

/** In-plane lattice basis (v1, v2) of the plane with primitive normal h. */
function planeLatticeBasis(W: Mat3, h: Vec3): [Vec3, Vec3] {
  const cands: Vec3[] = []
  for (let i = -2; i <= 2; i++)
    for (let j = -2; j <= 2; j++)
      for (let k = -2; k <= 2; k++) {
        if (!i && !j && !k) continue
        const v: Vec3 = [i, j, k]
        if (near0(sub(mv(W, v), v))) cands.push(v)
      }
  const nnz = (v: Vec3) => v.filter((x) => x !== 0).length
  // Prefer axis vectors, then short ones; first non-zero component positive.
  const uniq = new Map<string, Vec3>()
  for (const v of cands) {
    const p = primitive(v)
    if (near0(sub(p, scl(v, 1 / (gcd(gcd(v[0], v[1]), v[2]) || 1))))) uniq.set(p.join(','), p)
  }
  cands.length = 0
  cands.push(...uniq.values())
  cands.sort((p, q) => nnz(p) - nnz(q) || dot(p, p) - dot(q, q))
  for (const a of cands)
    for (const b of cands) {
      const c = cross(a, b)
      if (near0(sub(c, h)) || near0(add(c, h))) return [a, b]
    }
  throw new Error('no in-plane lattice basis')
}

/** Reduce t (lying in the plane spanned by v1, v2) to coefficients in [0, 1). */
function reduceInPlane(t: Vec3, v1: Vec3, v2: Vec3): Vec3 {
  const G11 = dot(v1, v1), G12 = dot(v1, v2), G22 = dot(v2, v2)
  const r1 = dot(t, v1), r2 = dot(t, v2)
  const D = G11 * G22 - G12 * G12
  let a = (r1 * G22 - r2 * G12) / D
  let b = (r2 * G11 - r1 * G12) / D
  a = a - Math.floor(a + 1e-9)
  b = b - Math.floor(b + 1e-9)
  return cleanV(add(scl(v1, a), scl(v2, b)))
}

/**
 * Glide letter from the reduced glide vector g and the plane's lattice mesh
 * (v1, v2): a/b/c = ½ of a basis axis; n = ½ of the mesh diagonal (v1 + v2);
 * d = components all ¼ / ¾ (diamond); anything else is a general glide 'g'
 * (e.g. ½[110] on a plane x, x, z).
 */
function glideLetter(g: Vec3, v1: Vec3, v2: Vec3): OpClassification['glideLetter'] {
  const nz = g.map((x) => Math.abs(x)).filter((x) => x > TOL)
  const is = (x: number, v: number) => Math.abs(x - v) < TOL
  if (nz.length === 1 && is(nz[0], 0.5)) return (['a', 'b', 'c'] as const)[g.findIndex((x) => Math.abs(x) > TOL)]
  const diag = scl(add(v1, v2), 0.5)
  const diag2 = scl(sub(v1, v2), 0.5)
  const sameMod = (a: Vec3, b: Vec3) => a.every((x, i) => Math.abs(x - b[i] - Math.round(x - b[i])) < TOL)
  if (sameMod(g, diag) || sameMod(g, diag2)) return 'n'
  if (nz.length >= 2 && nz.every((x) => is(x, 0.25) || is(x, 0.75))) return 'd'
  return 'g'
}

export function classifySeitz(W: Mat3, w: Vec3): OpClassification {
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

  if (proper && n === 1) {
    const red = cleanV(w.map((x) => x - Math.floor(x + 1e-9)) as Vec3)
    if (near0(red)) {
      return { kind: 'identity', order: 1, sense: '', intrinsicRaw: w, intrinsic: red, point: [0, 0, 0], locus: '', symbol: '1', label: 'identity', short: '1' }
    }
    const tv = fmtVec(w)
    return { kind: 'translation', order: 1, sense: '', intrinsicRaw: w, intrinsic: red, point: [0, 0, 0], locus: '', symbol: `t${tv}`, label: `translation ${tv}`, short: 't' }
  }

  if (proper) {
    const u = nullVector(IW)
    const sense = senseOf(W, u, n)
    const lam = dot(intrinsicRaw, u) / dot(u, u)
    const lamRed = clean(lam - Math.floor(lam + 1e-9))
    const intrinsic = cleanV(scl(u, lamRed))
    const kAxis = [0, 1, 2].reduce((b, i) => (Math.abs(u[i]) > Math.abs(u[b]) ? i : b), 0)
    const ek: Vec3 = [0, 0, 0]
    ek[kAxis] = 1
    const point = lsq([...(IW as Vec3[]), ek], [...locT, 0])
    const locus = lineLocus(point, u)
    const screw = !near0(intrinsic)
    const supS = SUP[sense]
    if (!screw) {
      return {
        kind: 'rotation', order: n, sense, axis: u, intrinsicRaw, intrinsic, point, locus,
        symbol: `${n}${supS} ${locus}`,
        label: `${n}-fold rotation${sense ? ` (${n}${supS})` : ''} ‖ ${dirName(u)}`,
        short: `${n}${supS}`,
      }
    }
    // n_m: translation m/n along the direction about which the turn is positive.
    const mRaw = sense === '-' ? (1 - lamRed) * n : lamRed * n
    const m = Math.round(mRaw)
    const verified = Math.abs(mRaw - m) < 1e-6 && m > 0 && m < n
    const sym = verified ? `${n}${SUB[m]}` : `${n}`
    return {
      kind: 'screw', order: n, sense, axis: u, intrinsicRaw, intrinsic, point, locus,
      screwM: verified ? m : undefined,
      symbol: `${n}${supS}${fmtVec(intrinsic)} ${locus}`,
      label: verified ? `${sym} screw ‖ ${dirName(u)}` : `screw (${n}-fold + ${fmtVec(intrinsic)}) ‖ ${dirName(u)}`,
      short: sym,
    }
  }

  // Improper.
  if (n === 1) {
    // −1: inversion through w/2
    const centre = cleanV(scl(w, 0.5))
    const p = fmtVec(centre).slice(1, -1).split(',').join(', ')
    return { kind: 'inversion', order: 1, sense: '', centre, intrinsicRaw: [0, 0, 0], intrinsic: [0, 0, 0], point: centre, locus: p, symbol: `1̄ ${p}`, label: `inversion centre at ${p}`, short: '1̄' }
  }
  if (n === 2) {
    // Reflection: normal h with Wᵀh = −h; in-plane lattice for glide reduction.
    const WT1 = tr(W).map((r, i) => r.map((x, j) => x + (i === j ? 1 : 0))) as Mat3
    const h = nullVector(WT1)
    const [v1, v2] = planeLatticeBasis(W, h)
    const g = reduceInPlane(intrinsicRaw, v1, v2)
    const dist = dot(h, locT) / 2 // plane: h·x = h·(w − w_g)/2
    const kAxis = [0, 1, 2].reduce((b, i) => (Math.abs(h[i]) > Math.abs(h[b]) ? i : b), 0)
    const point: Vec3 = [0, 0, 0]
    point[kAxis] = dist / h[kAxis]
    const locus = planeLocus(h, dist)
    if (near0(g)) {
      return { kind: 'mirror', order: 2, sense: '', normal: h, intrinsicRaw, intrinsic: g, point: cleanV(point), locus, symbol: `m ${locus}`, label: `mirror, plane ${locus}`, short: 'm' }
    }
    const letter = glideLetter(g, v1, v2)!
    const showVec = !(letter === 'a' || letter === 'b' || letter === 'c')
    return {
      kind: 'glide', order: 2, sense: '', normal: h, intrinsicRaw, intrinsic: g, glideLetter: letter, point: cleanV(point), locus,
      symbol: `${letter}${showVec ? fmtVec(g) : ''} ${locus}`,
      label: `${letter === 'g' ? 'glide' : `${letter}-glide`}, plane ${locus}, glide ${fmtVec(g)}`,
      short: letter,
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
    kind: 'rotoinversion', order: n, sense, axis: u, centre, intrinsicRaw: [0, 0, 0], intrinsic: [0, 0, 0], point: centre, locus,
    symbol: `${n}̄${SUP[sense]} ${locus}; ${p}`,
    label: `−${n}${SUP[sense]} rotoinversion ‖ ${dirName(u)}, centre ${p}`,
    short: `${n}̄${SUP[sense]}`,
  }
}

/** Fractional lattice translation L of the shown copy: image = W·base + w + L. */
export function shownLatticeShift(W: Mat3, w: Vec3, baseFrac: Vec3, imageFrac: Vec3): Vec3 {
  const raw = add(mv(W, baseFrac), w)
  return cleanV(sub(imageFrac, raw).map((x) => Math.round(x)) as Vec3)
}

/**
 * Plain-language description of the drawn ghost path for the shown copy
 * (W, w + L), from its unreduced intrinsic part — matches opPath exactly.
 */
export function describeMotion(c: OpClassification): string {
  const adv = fmtVec(c.intrinsicRaw)
  const angle = c.order ? Math.round(360 / c.order) : 0
  switch (c.kind) {
    case 'identity':
      return 'No motion (identity).'
    case 'translation':
      return `Ghost translates by ${fmtVec(c.intrinsicRaw)}.`
    case 'rotation':
    case 'screw': {
      const along = near0(c.intrinsicRaw) ? '' : ` while advancing ${adv} along it`
      const lattice = c.kind === 'rotation' && !near0(c.intrinsicRaw) ? ' (a whole lattice vector, so the element is still a plain rotation)' : ''
      return `Ghost turns ${angle}° about the axis ${c.locus}${along}${lattice}.`
    }
    case 'mirror':
    case 'glide': {
      const slide = near0(c.intrinsicRaw) ? '' : ` while sliding ${adv} in the plane`
      const lattice = c.kind === 'mirror' && !near0(c.intrinsicRaw) ? ' (a lattice vector, so the element is still a mirror)' : ''
      return `Ghost flattens onto the plane ${c.locus} and emerges reflected${slide}${lattice}.`
    }
    case 'inversion':
      return `Ghost shrinks through the centre ${c.locus} and emerges inverted.`
    case 'rotoinversion':
      return `Ghost turns ${angle}° about the axis ${c.locus} while shrinking through ${fmtVec(c.centre!)} and emerges inverted.`
  }
}
