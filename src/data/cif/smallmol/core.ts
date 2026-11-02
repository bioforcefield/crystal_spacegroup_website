/**
 * Small-molecule / inorganic CIF structure analysis (non-PDB entries).
 *
 * Works on the asymmetric unit (as parsed — one disorder group is kept by the parser) and the
 * space-group operators. Every partner atom is an image  g·x_j  with g = (R, t + L): operator R,t
 * plus a lattice translation L. Non-identity images carry a symmetry code (roman numeral) whose
 * footnote is the operator in SHELX/publCIF style, e.g.  i: -x+1, y+1/2, -z+1/2.
 */
import { fracToCart } from '../../math'
import type { CellParams, Mat3, Vec3 } from '../../types'
import type { ExpandedStructure } from '../types'
import { ELEMENTS } from '../elementData'

export interface Sym { R: Mat3; t: Vec3 }
export interface SmAtom { idx: number; label: string; el: string; frac: Vec3; cart: Vec3; occ: number; part?: string; uIso?: number }
/** An atom image: ASU atom j under symmetry g. */
export interface Img { j: number; g: Sym; frac: Vec3; cart: Vec3 }
export interface Nb extends Img { d: number }

const I3: Mat3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
export const IDENT: Sym = { R: I3, t: [0, 0, 0] }
const mv = (R: Mat3, v: Vec3): Vec3 => [R[0][0] * v[0] + R[0][1] * v[1] + R[0][2] * v[2], R[1][0] * v[0] + R[1][1] * v[1] + R[1][2] * v[2], R[2][0] * v[0] + R[2][1] * v[1] + R[2][2] * v[2]]
const mm = (A: Mat3, B: Mat3): Mat3 => [0, 1, 2].map((i) => [0, 1, 2].map((k) => A[i]![0]! * B[0]![k]! + A[i]![1]! * B[1]![k]! + A[i]![2]! * B[2]![k]!)) as Mat3
export const applySym = (g: Sym, x: Vec3): Vec3 => { const r = mv(g.R, x); return [r[0] + g.t[0], r[1] + g.t[1], r[2] + g.t[2]] }
/** g2 ∘ g1 */
export const compose = (g2: Sym, g1: Sym): Sym => { const r = mv(g2.R, g1.t); return { R: mm(g2.R, g1.R), t: [r[0] + g2.t[0], r[1] + g2.t[1], r[2] + g2.t[2]] } }
export function invert(g: Sym): Sym {
  const A = g.R
  const det = A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0])
  const inv: Mat3 = [
    [(A[1][1] * A[2][2] - A[1][2] * A[2][1]) / det, (A[0][2] * A[2][1] - A[0][1] * A[2][2]) / det, (A[0][1] * A[1][2] - A[0][2] * A[1][1]) / det],
    [(A[1][2] * A[2][0] - A[1][0] * A[2][2]) / det, (A[0][0] * A[2][2] - A[0][2] * A[2][0]) / det, (A[0][2] * A[1][0] - A[0][0] * A[1][2]) / det],
    [(A[1][0] * A[2][1] - A[1][1] * A[2][0]) / det, (A[0][1] * A[2][0] - A[0][0] * A[2][1]) / det, (A[0][0] * A[1][1] - A[0][1] * A[1][0]) / det],
  ].map((r) => r.map((x) => Math.round(x * 1e6) / 1e6 + 0)) as Mat3
  const t = mv(inv, g.t)
  return { R: inv, t: [-t[0], -t[1], -t[2]] }
}
export const isIdent = (g: Sym) => g.R.every((r, i) => r.every((c, k) => Math.abs(c - (i === k ? 1 : 0)) < 1e-6)) && g.t.every((v) => Math.abs(v) < 1e-6)
export const symKey = (g: Sym) => `${g.R.flat().map((x) => Math.round(x)).join(',')}|${g.t.map((x) => Math.round(x * 1e4)).join(',')}`

function frac(v: number): string {
  if (Math.abs(v) < 1e-6) return ''
  const s = v < 0 ? '-' : '+'
  const a = Math.abs(v)
  for (let d = 1; d <= 12; d++) { const n = Math.round(a * d); if (Math.abs(a * d - n) < 1e-4 * d) return `${s}${d === 1 ? n : `${n}/${d}`}` }
  return `${s}${a.toFixed(4)}`
}
/** SHELX/publCIF style operator: "-x+1, y+1/2, -z+1/2". */
export function symText(g: Sym): string {
  const xyz = ['x', 'y', 'z']
  return g.R.map((row, i) => {
    let s = ''
    row.forEach((c, k) => {
      if (Math.abs(c) < 1e-6) return
      const sign = c < 0 ? '-' : s ? '+' : ''
      s += `${sign}${Math.abs(Math.abs(c) - 1) < 1e-6 ? '' : Math.abs(c)}${xyz[k]}`
    })
    return (s || '0') + frac(g.t[i]!)
  }).join(', ')
}
const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx']
/** Assigns roman-numeral codes to distinct non-identity operators in order of first use. */
export class SymCodes {
  private map = new Map<string, { code: string; g: Sym }>()
  code(g: Sym): string {
    if (isIdent(g)) return ''
    const k = symKey(g)
    let e = this.map.get(k)
    if (!e) { const n = this.map.size; e = { code: ROMAN[n] ?? `s${n + 1}`, g }; this.map.set(k, e) }
    return e.code
  }
  list(): { code: string; op: string }[] { return [...this.map.values()].map((e) => ({ code: e.code, op: symText(e.g) })) }
}

export const elData = (el: string) => ELEMENTS[el] ?? ELEMENTS[el[0]!.toUpperCase() + el.slice(1).toLowerCase()]
export const rCov = (el: string) => elData(el)?.rc ?? 1.5
export const rVdw = (el: string) => elData(el)?.rv
/** CSD-style bond rule: d < r1 + r2 + 0.4 Å (Cordero 2008 covalent radii). */
export const BOND_TOL = 0.4
const S_BLOCK = new Set(['Li', 'Na', 'K', 'Rb', 'Cs', 'Fr', 'Be', 'Mg', 'Ca', 'Sr', 'Ba', 'Ra'])
/**
 * CSD-style bond rule: d < r1 + r2 + 0.4 Å (Cordero 2008 covalent radii); H···H never bonded.
 * Metal–metal pairs: no tolerance (d < r1 + r2), and never between two s-block metals — otherwise the
 * large alkali radii (K 2.03 Å) turn every cation–cation separation in an ionic salt into a "bond".
 */
export const isBonded = (a: string, b: string, d: number) => {
  if (d <= 0.5 || (a === 'H' && b === 'H')) return false
  if (isMetal(a) && isMetal(b)) return !(S_BLOCK.has(a) && S_BLOCK.has(b)) && d < rCov(a) + rCov(b)
  return d < rCov(a) + rCov(b) + BOND_TOL
}
const NONMETALS = new Set(['H', 'He', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Si', 'P', 'S', 'Cl', 'Ar', 'Ge', 'As', 'Se', 'Br', 'Kr', 'Sb', 'Te', 'I', 'Xe', 'At', 'Rn'])
export const isMetal = (el: string) => !NONMETALS.has(el) && !!elData(el)

export function cellVolume(c: CellParams): number {
  const a = fracToCart([1, 0, 0], c), b = fracToCart([0, 1, 0], c), cc = fracToCart([0, 0, 1], c)
  return Math.abs(a[0] * (b[1] * cc[2] - b[2] * cc[1]) - a[1] * (b[0] * cc[2] - b[2] * cc[0]) + a[2] * (b[0] * cc[1] - b[1] * cc[0]))
}
export const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
export function angleAt(a: Vec3, b: Vec3, c: Vec3) {
  const u: Vec3 = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], v: Vec3 = [c[0] - b[0], c[1] - b[1], c[2] - b[2]]
  const cs = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (Math.hypot(...u) * Math.hypot(...v))
  return (Math.acos(Math.max(-1, Math.min(1, cs))) * 180) / Math.PI
}
export function torsion(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3) {
  const s = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
  const cr = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  const dt = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  const b1 = s(p1, p0), b2 = s(p2, p1), b3 = s(p3, p2)
  const n1 = cr(b1, b2), n2 = cr(b2, b3)
  const y = Math.hypot(...b2) * dt(b1, n2), x = dt(n1, n2)
  const deg = (Math.atan2(y, x) * 180) / Math.PI
  return deg <= -180 + 1e-9 ? 180 : deg
}

export interface Context {
  cell: CellParams
  atoms: SmAtom[]
  ops: Sym[]
  /** Neighbours (images) of each ASU atom within the search radius, sorted by distance. */
  nb: Nb[][]
  cutoff: number
  /** True when the per-pair lattice search was reduced to the nearest image (very large ASU × ops). */
  reduced: boolean
}

/** Labels: CIF _atom_site_label when present and unique, else element + ASU index (e.g. C3). */
export function smAtoms(s: ExpandedStructure, hasLabelColumn: boolean): SmAtom[] {
  const seen = new Map<string, number>()
  for (const a of s.asymmetric) seen.set(a.label, (seen.get(a.label) ?? 0) + 1)
  return s.asymmetric.map((a, i) => {
    const el = a.element
    let label = hasLabelColumn ? a.label : `${el}${i + 1}`
    if (hasLabelColumn && (seen.get(a.label) ?? 0) > 1) label = `${a.label}#${i + 1}`
    return { idx: i, label, el, frac: a.fractional, cart: fracToCart(a.fractional, s.cell), occ: a.occupancy ?? 1, part: a.altloc, uIso: a.uIso }
  })
}

export function buildContext(s: ExpandedStructure, atoms: SmAtom[], cutoff = 4.0): Context {
  const ops: Sym[] = s.operators.map((o) => ({ R: o.R, t: o.t }))
  if (!ops.length) ops.push(IDENT)
  const n = atoms.length
  const reduced = n * n * ops.length * 27 > 3e7
  const nb: Nb[][] = atoms.map(() => [])
  const shifts: Vec3[] = []
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) shifts.push([a, b, c])
  for (let i = 0; i < n; i++) {
    const xi = atoms[i]!.frac, ci = atoms[i]!.cart
    const seen = new Set<string>()
    for (let j = 0; j < n; j++) {
      for (const op of ops) {
        const y = applySym(op, atoms[j]!.frac)
        const L0: Vec3 = [Math.round(xi[0] - y[0]), Math.round(xi[1] - y[1]), Math.round(xi[2] - y[2])]
        for (const sh of reduced ? [[0, 0, 0] as Vec3] : shifts) {
          const L: Vec3 = [L0[0] + sh[0], L0[1] + sh[1], L0[2] + sh[2]]
          const f: Vec3 = [y[0] + L[0], y[1] + L[1], y[2] + L[2]]
          const c = fracToCart(f, s.cell)
          const d = dist(ci, c)
          if (d > cutoff || d < 0.1) continue
          const k = `${j}|${f.map((v) => Math.round(v * 1000)).join(',')}`
          if (seen.has(k)) continue // same image reached by a different operator (special position)
          seen.add(k)
          nb[i]!.push({ j, g: { R: op.R, t: [op.t[0] + L[0], op.t[1] + L[1], op.t[2] + L[2]] }, frac: f, cart: c, d })
        }
      }
    }
    // Prefer identity images first among equal positions; then sort by distance.
    nb[i]!.sort((p, q) => p.d - q.d)
  }
  return { cell: s.cell, atoms, ops, nb, cutoff, reduced }
}

/** Image of ASU atom j under g. */
export function image(ctx: Context, j: number, g: Sym): Img {
  const f = applySym(g, ctx.atoms[j]!.frac)
  return { j, g, frac: f, cart: fracToCart(f, ctx.cell) }
}
/** Disorder: atoms of different PART / altloc groups are never bonded or compared. */
export const sameAssembly = (a: SmAtom, b: SmAtom) => {
  if (!a.part || !b.part || a.part === b.part) return true
  const [aa, ag] = a.part.includes(':') ? a.part.split(':') : ['', a.part]
  const [ba, bg] = b.part.includes(':') ? b.part.split(':') : ['', b.part]
  return aa !== ba || ag === bg // different assemblies coexist
}
