/**
 * Geometric intermolecular H-bond / short-contact detection across symmetry ops.
 *
 * Conservative teaching criteria (not a full hydrogen-placement refinement):
 *   donor D ∈ {N,O,F} bonded to H (covalent within same molecule)
 *   acceptor A ∈ {N,O,F,S,Cl} on a different molecule
 *   H···A ≤ 2.5 Å, D···A ≤ 3.5 Å, ∠D–H···A ≥ 120°
 *
 * Prefers cross-operator contacts; falls back to same-op intermolecular.
 * Caps the result list for large cells.
 */

import type { Vec3 } from '../types'
import { covalentRadius } from './molecules'
import type {
  ExpandedStructure,
  HBondContact,
  SymmetryBond,
  SymmetryCopyAtom,
} from './types'

export type { HBondContact }

const DONORS = new Set(['N', 'O', 'F'])
const ACCEPTORS = new Set(['N', 'O', 'F', 'S', 'Cl'])

function dist(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

function angleAtH(d: Vec3, h: Vec3, a: Vec3): number {
  const v1: Vec3 = [d[0] - h[0], d[1] - h[1], d[2] - h[2]]
  const v2: Vec3 = [a[0] - h[0], a[1] - h[1], a[2] - h[2]]
  const n1 = Math.hypot(v1[0], v1[1], v1[2])
  const n2 = Math.hypot(v2[0], v2[1], v2[2])
  if (n1 < 1e-8 || n2 < 1e-8) return 0
  const c = (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) / (n1 * n2)
  return (Math.acos(Math.min(1, Math.max(-1, c))) * 180) / Math.PI
}

function neighborsOf(
  atomIndex: number,
  bonds: SymmetryBond[],
): number[] {
  const out: number[] = []
  for (const b of bonds) {
    if (b.a === atomIndex) out.push(b.b)
    else if (b.b === atomIndex) out.push(b.a)
  }
  return out
}

export interface FindHBondsOptions {
  maxHA?: number
  maxDA?: number
  minAngle?: number
  /** Hard cap on returned contacts (keeps phone/WebGL sane). */
  maxContacts?: number
  /** Only keep contacts that cross operators when any exist. */
  preferCrossOp?: boolean
}

/**
 * Find plausible H-bonds using already-assembled display coordinates.
 */
export function findHBonds(
  structure: ExpandedStructure,
  opts: FindHBondsOptions = {},
): HBondContact[] {
  const maxHA = opts.maxHA ?? 2.5
  const maxDA = opts.maxDA ?? 3.5
  const minAngle = opts.minAngle ?? 120
  const maxContacts = opts.maxContacts ?? 180
  const preferCrossOp = opts.preferCrossOp !== false

  const { atoms, bonds } = structure
  if (atoms.length > 2500) {
    // Very large cells: skip (performance)
    return []
  }

  // Donor–H pairs from covalent bonds within a molecule
  const donorHs: Array<{ d: number; h: number }> = []
  for (let i = 0; i < atoms.length; i++) {
    const a = atoms[i]!
    if (!DONORS.has(a.element)) continue
    for (const j of neighborsOf(i, bonds)) {
      const h = atoms[j]!
      if (h.element !== 'H') continue
      if (h.moleculeId !== a.moleculeId) continue
      // Sanity: D–H covalent length
      const dh = dist(a.displayCartesian, h.displayCartesian)
      const maxCov =
        (covalentRadius(a.element) + covalentRadius('H')) * 1.35
      if (dh <= maxCov) donorHs.push({ d: i, h: j })
    }
  }

  if (!donorHs.length) return []

  // Acceptor indices
  const acceptors: number[] = []
  for (let i = 0; i < atoms.length; i++) {
    if (ACCEPTORS.has(atoms[i]!.element)) acceptors.push(i)
  }

  const all: HBondContact[] = []
  for (const { d, h } of donorHs) {
    const D = atoms[d]!
    const H = atoms[h]!
    const dCart = D.displayCartesian
    const hCart = H.displayCartesian
    for (const ai of acceptors) {
      if (ai === d || ai === h) continue
      const A = atoms[ai]!
      if (A.moleculeId === D.moleculeId) continue
      const aCart = A.displayCartesian
      const ha = dist(hCart, aCart)
      if (ha > maxHA) continue
      const da = dist(dCart, aCart)
      if (da > maxDA) continue
      const ang = angleAtH(dCart, hCart, aCart)
      if (ang < minAngle) continue
      all.push({
        donor: d,
        hydrogen: h,
        acceptor: ai,
        donorOp: D.opIndex,
        acceptorOp: A.opIndex,
        donorMolecule: D.moleculeId,
        acceptorMolecule: A.moleculeId,
        distHA: ha,
        distDA: da,
        angleDeg: ang,
        crossOp: D.opIndex !== A.opIndex,
      })
    }
  }

  // Prefer shorter H···A
  all.sort((a, b) => a.distHA - b.distHA || b.angleDeg - a.angleDeg)

  let picked = all
  if (preferCrossOp && all.some((c) => c.crossOp)) {
    const cross = all.filter((c) => c.crossOp)
    // Keep a few same-op intermolecular if room
    const same = all.filter((c) => !c.crossOp)
    picked = [...cross, ...same]
  }

  // Deduplicate by unordered (H, A) pair
  const seen = new Set<string>()
  const unique: HBondContact[] = []
  for (const c of picked) {
    const key = c.hydrogen < c.acceptor
      ? `${c.hydrogen}:${c.acceptor}`
      : `${c.acceptor}:${c.hydrogen}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(c)
    if (unique.length >= maxContacts) break
  }
  return unique
}

/** Molecule ids that participate in any H-bond with the given molecule. */
export function hbondPartnerMolecules(
  contacts: HBondContact[],
  moleculeId: number,
): Set<number> {
  const out = new Set<number>()
  out.add(moleculeId)
  for (const c of contacts) {
    if (c.donorMolecule === moleculeId) out.add(c.acceptorMolecule)
    if (c.acceptorMolecule === moleculeId) out.add(c.donorMolecule)
  }
  return out
}

/** AU (op 1) molecule ids — used for “link partners of AU”. */
export function asymmetricMoleculeIds(atoms: SymmetryCopyAtom[]): number[] {
  const ids = new Set<number>()
  for (const a of atoms) {
    if (a.opIndex === 1 && a.moleculeId >= 0) ids.add(a.moleculeId)
  }
  return [...ids].sort((a, b) => a - b)
}
