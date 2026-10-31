/** Turn atom picks into measurements, symmetry codes and a molecule-pair relation. */
import type { AtomPick } from './atomInfo'
import type { ExpandedStructure } from './types'
import type { Vec3 } from '../types'
import { cartToFrac, fracToCart } from '../math'
import {
  angle,
  classifyOp,
  dihedral,
  distance,
  drawnOp,
  isIdentityOp,
  relatingOp,
  romanCode,
  superscript,
  tripletOf,
  type SeitzOp,
  type SymmetryElementInfo,
} from './measure'

export interface ResolvedAtom {
  pick: AtomPick
  label: string
  element: string
  cart: Vec3
  op: SeitzOp
  triplet: string
  moleculeKey: string
}

export function resolvePick(s: ExpandedStructure, positions: Vec3[], pick: AtomPick): ResolvedAtom | null {
  const a = s.atoms[pick.ai]
  const p = positions[pick.ai]
  if (!a || !p) return null
  const d = fracToCart(pick.t, s.cell)
  const cart: Vec3 = [p[0] + d[0], p[1] + d[1], p[2] + d[2]]
  const o = s.operators.find((x) => x.index === a.opIndex)
  const au = s.asymmetric[a.auIndex]
  const op = o && au ? drawnOp(o.R, o.t, au.fractional, cartToFrac(cart, s.cell)) : { R: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] as SeitzOp['R'], t: [0, 0, 0] as Vec3 }
  return {
    pick,
    label: a.label,
    element: a.element,
    cart,
    op,
    triplet: tripletOf(op),
    moleculeKey: `${a.moleculeId}|${pick.t.join(',')}`,
  }
}

/** Global symmetry-code table: triplet → roman code (identity gets none). */
export class SymCodes {
  codes = new Map<string, string>()
  code(r: ResolvedAtom): string {
    if (isIdentityOp(r.op)) return ''
    let c = this.codes.get(r.triplet)
    if (!c) {
      c = romanCode(this.codes.size)
      this.codes.set(r.triplet, c)
    }
    return c
  }
  name(r: ResolvedAtom): string {
    const c = this.code(r)
    return c ? `${r.label}${superscript(c)}` : r.label
  }
  footnotes(): string[] {
    return [...this.codes].map(([t, c]) => `${c}: ${t}`)
  }
}

export interface Measurement {
  kind: 'distance' | 'angle' | 'torsion'
  value: number
  text: string
  names: string[]
  atoms: ResolvedAtom[]
}

export function measureOf(atoms: ResolvedAtom[], codes: SymCodes): Measurement | null {
  const names = atoms.map((a) => codes.name(a))
  const p = atoms.map((a) => a.cart)
  const join = names.join('–')
  if (atoms.length === 2) {
    const v = distance(p[0]!, p[1]!)
    return { kind: 'distance', value: v, text: `${join}  ${v.toFixed(3)} Å`, names, atoms }
  }
  if (atoms.length === 3) {
    const v = angle(p[0]!, p[1]!, p[2]!)
    return { kind: 'angle', value: v, text: `${join}  ${v.toFixed(2)}°`, names, atoms }
  }
  if (atoms.length === 4) {
    const v = dihedral(p[0]!, p[1]!, p[2]!, p[3]!)
    return { kind: 'torsion', value: v, text: `${join}  ${v >= 0 ? '+' : ''}${v.toFixed(2)}°`, names, atoms }
  }
  return null
}

export interface MoleculeRelation {
  op: SeitzOp
  triplet: string
  element: SymmetryElementInfo
  /** Cartesian centroids of the two molecules. */
  centroidA: Vec3
  centroidB: Vec3
  note?: string
}

function centroid(s: ExpandedStructure, positions: Vec3[], key: string): Vec3 {
  const [mid, ts] = key.split('|')
  const t = ts!.split(',').map(Number) as Vec3
  const d = fracToCart(t, s.cell)
  let n = 0
  const c: Vec3 = [0, 0, 0]
  s.atoms.forEach((a, i) => {
    if (String(a.moleculeId) !== mid) return
    const p = positions[i]!
    c[0] += p[0] + d[0]
    c[1] += p[1] + d[1]
    c[2] += p[2] + d[2]
    n++
  })
  return n ? [c[0] / n, c[1] / n, c[2] / n] : [0, 0, 0]
}

/**
 * Relation between the molecules of the first two picks on different molecules.
 * Uses the same AU atom on both molecules so per-atom unwrap shifts cancel.
 */
export function relateMolecules(
  s: ExpandedStructure,
  positions: Vec3[],
  atoms: ResolvedAtom[],
): MoleculeRelation | null {
  const a = atoms[0]
  const b = atoms.find((x) => x.moleculeKey !== a?.moleculeKey)
  if (!a || !b) return null
  const auA = s.atoms[a.pick.ai]!.auIndex
  const molB = s.atoms[b.pick.ai]!.moleculeId
  const twinIdx = s.atoms.findIndex((x) => x.moleculeId === molB && x.auIndex === auA)
  const cA = centroid(s, positions, a.moleculeKey)
  const cB = centroid(s, positions, b.moleculeKey)
  if (twinIdx < 0) {
    // try the other way round: B's AU atom inside molecule A
    const molA = s.atoms[a.pick.ai]!.moleculeId
    const auB = s.atoms[b.pick.ai]!.auIndex
    const twinA = s.atoms.findIndex((x) => x.moleculeId === molA && x.auIndex === auB)
    if (twinA >= 0) {
      const ta = resolvePick(s, positions, { ai: twinA, t: a.pick.t })!
      const g = relatingOp(ta.op, b.op)
      return { op: g, triplet: tripletOf(g), element: classifyOp(g, s.cell), centroidA: cA, centroidB: cB }
    }
    const g = relatingOp(a.op, b.op)
    return {
      op: g,
      triplet: tripletOf(g),
      element: classifyOp(g, s.cell),
      centroidA: cA,
      centroidB: cB,
      note: 'These molecules come from different asymmetric-unit molecules (Z′ > 1); the op below maps the picked atoms’ generating ops only and is not a symmetry of the pair.',
    }
  }
  const twin = resolvePick(s, positions, { ai: twinIdx, t: b.pick.t })!
  const g = relatingOp(a.op, twin.op)
  return { op: g, triplet: tripletOf(g), element: classifyOp(g, s.cell), centroidA: cA, centroidB: cB }
}
