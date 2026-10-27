/**
 * Build a lightweight 2D sketch of the asymmetric-unit molecule(s)
 * from intact display coordinates + covalent bonds (no SMILES required).
 *
 * Organic/molecular crystals → PCA projection of the BASE (op 1) atoms.
 * Extended / ionic lattices → honest “no discrete molecule” result + formula.
 */

import { elementColor } from './operatorColors'
import type { ExpandedStructure, SymmetryBond, SymmetryCopyAtom } from './types'

/** Elements typical of discrete molecular crystals (teaching organic/organometallic). */
const MOLECULAR_ELEMENTS = new Set([
  'H',
  'C',
  'N',
  'O',
  'F',
  'P',
  'S',
  'Cl',
  'Br',
  'I',
  'B',
  'Si',
  'Se',
  'As',
  'Te',
])

/** Soft cap — beyond this a stick sketch is unreadable at panel size. */
export const ASU_DIAGRAM_MAX_ATOMS = 72

export type AsuDiagramKind = 'molecule' | 'extended' | 'empty' | 'too-large'

export interface AsuDiagramAtom {
  /** Local index in this diagram. */
  id: number
  element: string
  label: string
  x: number
  y: number
  /** CPK-ish fill from operatorColors.elementColor */
  color: string
}

export interface AsuDiagramBond {
  a: number
  b: number
}

export interface AsuDiagramModel {
  kind: AsuDiagramKind
  /** Short reason for non-molecule kinds (shown in UI). */
  reason?: string
  atoms: AsuDiagramAtom[]
  bonds: AsuDiagramBond[]
  /** SVG viewBox: minX minY width height */
  viewBox: { minX: number; minY: number; width: number; height: number }
  formula?: string
  /** SMILES from CIF metadata when present (not used for layout). */
  smiles?: string
  /** Intact molecule count among BASE (op 1) atoms. */
  moleculeCount: number
  atomCount: number
  nonHCount: number
  /** Accessible one-line description. */
  altText: string
}

export interface AsuDiagramSkipReason {
  kind: Exclude<AsuDiagramKind, 'molecule'>
  reason: string
}

function isH(el: string): boolean {
  return el === 'H' || el === 'D' || el === 'T'
}

/**
 * Decide whether BASE atoms look like discrete molecule(s) worth sketching.
 * Pure heuristic for teaching UI — not a crystallographic classifier.
 */
export function classifyAsuForDiagram(
  atoms: Pick<SymmetryCopyAtom, 'element'>[],
  bonds: { a: number; b: number }[],
): AsuDiagramSkipReason | { kind: 'molecule' } {
  if (atoms.length === 0) {
    return { kind: 'empty', reason: 'No asymmetric-unit atoms to sketch.' }
  }
  if (atoms.length > ASU_DIAGRAM_MAX_ATOMS) {
    return {
      kind: 'too-large',
      reason: `ASU has ${atoms.length} atoms — too large for a readable 2D sketch.`,
    }
  }

  const nonH = atoms.filter((a) => !isH(a.element))
  const molecularFrac =
    atoms.filter((a) => MOLECULAR_ELEMENTS.has(a.element)).length /
    atoms.length

  const degree = new Array(atoms.length).fill(0)
  for (const b of bonds) {
    if (b.a >= 0 && b.a < atoms.length) degree[b.a]!++
    if (b.b >= 0 && b.b < atoms.length) degree[b.b]!++
  }
  const maxDeg = degree.length ? Math.max(...degree) : 0
  const meanDeg =
    atoms.length === 0
      ? 0
      : degree.reduce((s, d) => s + d, 0) / atoms.length

  // No covalent bonds → ions / metals / H-only / bad radii match
  if (bonds.length === 0 && nonH.length >= 1) {
    return {
      kind: 'extended',
      reason:
        'No discrete covalent molecule in the ASU (ionic, metallic, or highly disconnected). Showing formula only.',
    }
  }

  // Framework / oxide / alloy: low molecular fraction or metal-like high coordination
  if (molecularFrac < 0.45) {
    return {
      kind: 'extended',
      reason:
        'ASU looks like an extended / inorganic lattice, not a discrete molecule. Showing formula only.',
    }
  }
  if (maxDeg >= 5 && molecularFrac < 0.9) {
    return {
      kind: 'extended',
      reason:
        'High coordination suggests an extended lattice. Showing formula only.',
    }
  }
  // Dense network (e.g. diamond-like) among many non-H
  if (nonH.length >= 4 && meanDeg >= 3.6 && molecularFrac < 0.95) {
    return {
      kind: 'extended',
      reason:
        'Highly connected network — not a discrete molecular ASU. Showing formula only.',
    }
  }

  return { kind: 'molecule' }
}

/** Covariance PCA: return top-2 orthonormal axes for 3D points (column vectors). */
export function pcaAxes2(
  points: [number, number, number][],
): [[number, number, number], [number, number, number]] {
  const n = points.length
  if (n === 0) {
    return [
      [1, 0, 0],
      [0, 1, 0],
    ]
  }
  const mean: [number, number, number] = [0, 0, 0]
  for (const p of points) {
    mean[0] += p[0]
    mean[1] += p[1]
    mean[2] += p[2]
  }
  mean[0] /= n
  mean[1] /= n
  mean[2] /= n

  // Covariance (symmetric 3×3)
  let c00 = 0,
    c01 = 0,
    c02 = 0,
    c11 = 0,
    c12 = 0,
    c22 = 0
  for (const p of points) {
    const x = p[0] - mean[0]
    const y = p[1] - mean[1]
    const z = p[2] - mean[2]
    c00 += x * x
    c01 += x * y
    c02 += x * z
    c11 += y * y
    c12 += y * z
    c22 += z * z
  }
  const inv = 1 / Math.max(1, n - 1)
  c00 *= inv
  c01 *= inv
  c02 *= inv
  c11 *= inv
  c12 *= inv
  c22 *= inv

  const mul = (v: [number, number, number]): [number, number, number] => [
    c00 * v[0] + c01 * v[1] + c02 * v[2],
    c01 * v[0] + c11 * v[1] + c12 * v[2],
    c02 * v[0] + c12 * v[1] + c22 * v[2],
  ]
  const norm = (v: [number, number, number]): [number, number, number] => {
    const L = Math.hypot(v[0], v[1], v[2]) || 1
    return [v[0] / L, v[1] / L, v[2] / L]
  }
  const dot = (a: [number, number, number], b: [number, number, number]) =>
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  const sub = (
    a: [number, number, number],
    b: [number, number, number],
    s: number,
  ): [number, number, number] => [
    a[0] - s * b[0],
    a[1] - s * b[1],
    a[2] - s * b[2],
  ]

  // Power iteration for first principal axis
  let e1: [number, number, number] = [1, 0.3, 0.1]
  for (let i = 0; i < 24; i++) e1 = norm(mul(e1))
  // Deflate + second axis
  let e2: [number, number, number] = norm([0.2, 1, 0.4])
  e2 = norm(sub(e2, e1, dot(e2, e1)))
  for (let i = 0; i < 24; i++) {
    let w = mul(e2)
    w = sub(w, e1, dot(w, e1))
    e2 = norm(w)
  }

  // Degenerate (colinear / single atom): fall back to standard axes
  if (!Number.isFinite(e1[0]) || !Number.isFinite(e2[0])) {
    return [
      [1, 0, 0],
      [0, 1, 0],
    ]
  }
  if (Math.abs(dot(e1, e2)) > 0.2) {
    e2 = norm(sub([0, 1, 0], e1, e1[1]))
    if (Math.hypot(e2[0], e2[1], e2[2]) < 1e-6) {
      e2 = norm(sub([0, 0, 1], e1, e1[2]))
    }
  }
  return [e1, e2]
}

export function projectPoints2D(
  points: [number, number, number][],
  axes?: [[number, number, number], [number, number, number]],
): { x: number; y: number }[] {
  const [e1, e2] = axes ?? pcaAxes2(points)
  const mean: [number, number, number] = [0, 0, 0]
  for (const p of points) {
    mean[0] += p[0]
    mean[1] += p[1]
    mean[2] += p[2]
  }
  if (points.length) {
    mean[0] /= points.length
    mean[1] /= points.length
    mean[2] /= points.length
  }
  return points.map((p) => {
    const dx = p[0] - mean[0]
    const dy = p[1] - mean[1]
    const dz = p[2] - mean[2]
    return {
      x: dx * e1[0] + dy * e1[1] + dz * e1[2],
      y: dx * e2[0] + dy * e2[1] + dz * e2[2],
    }
  })
}

function emptyModel(
  kind: Exclude<AsuDiagramKind, 'molecule'>,
  reason: string,
  extras: Partial<AsuDiagramModel> = {},
): AsuDiagramModel {
  const formula = extras.formula
  const smiles = extras.smiles
  const atomCount = extras.atomCount ?? 0
  const nonHCount = extras.nonHCount ?? 0
  const moleculeCount = extras.moleculeCount ?? 0
  const altBits = [
    kind === 'empty'
      ? 'No asymmetric-unit 2D diagram'
      : kind === 'too-large'
        ? 'Asymmetric-unit 2D diagram omitted — structure too large'
        : 'No discrete-molecule 2D diagram for this asymmetric unit',
  ]
  if (formula) altBits.push(`formula ${formula}`)
  if (smiles) altBits.push(`SMILES ${smiles}`)
  return {
    kind,
    reason,
    atoms: [],
    bonds: [],
    viewBox: { minX: 0, minY: 0, width: 1, height: 1 },
    formula,
    smiles,
    moleculeCount,
    atomCount,
    nonHCount,
    altText: altBits.join('. ') + '.',
  }
}

/**
 * Build a 2D ASU diagram model from an expanded CIF structure.
 * Uses BASE operator (opIndex === 1) display coordinates + covalent bonds.
 */
export function buildAsuDiagram(structure: ExpandedStructure): AsuDiagramModel {
  const formula = structure.metadata?.formula
  const smiles = structure.metadata?.smiles
  const indexMap = new Map<number, number>() // global atom index → local
  const globals: number[] = []
  for (let i = 0; i < structure.atoms.length; i++) {
    if (structure.atoms[i]!.opIndex === 1) {
      indexMap.set(i, globals.length)
      globals.push(i)
    }
  }
  const atoms = globals.map((gi) => structure.atoms[gi]!)
  const localBonds: { a: number; b: number }[] = []
  for (const b of structure.bonds) {
    if (b.opIndex !== 1) continue
    const la = indexMap.get(b.a)
    const lb = indexMap.get(b.b)
    if (la == null || lb == null) continue
    localBonds.push({ a: la, b: lb })
  }

  const molIds = new Set(atoms.map((a) => a.moleculeId).filter((m) => m >= 0))
  const moleculeCount = molIds.size
  const nonHCount = atoms.filter((a) => !isH(a.element)).length
  const baseExtras = {
    formula,
    smiles,
    atomCount: atoms.length,
    nonHCount,
    moleculeCount,
  }

  const cls = classifyAsuForDiagram(atoms, localBonds)
  if (cls.kind !== 'molecule') {
    return emptyModel(cls.kind, cls.reason, baseExtras)
  }

  const pts = atoms.map(
    (a) =>
      [
        a.displayCartesian[0],
        a.displayCartesian[1],
        a.displayCartesian[2],
      ] as [number, number, number],
  )
  const projected = projectPoints2D(pts)

  // Prefer non-H centroid slightly “above” overall centroid (cosmetic).
  const heavy = projected
    .map((p, i) => ({ p, el: atoms[i]!.element }))
    .filter((x) => !isH(x.el))
  if (heavy.length) {
    const meanAllY =
      projected.reduce((s, p) => s + p.y, 0) / projected.length
    const meanHeavyY =
      heavy.reduce((s, x) => s + x.p.y, 0) / heavy.length
    if (meanHeavyY < meanAllY - 1e-6) {
      for (const p of projected) p.y = -p.y
    }
  }

  // SVG y grows down — flip chemical +y into screen -y.
  const pad = 0.55
  const diagramAtoms: AsuDiagramAtom[] = projected.map((p, i) => {
    const el = atoms[i]!.element
    return {
      id: i,
      element: el,
      label: atoms[i]!.label,
      x: p.x,
      y: -p.y,
      color: elementColor(el),
    }
  })

  let sMinX = Infinity
  let sMinY = Infinity
  let sMaxX = -Infinity
  let sMaxY = -Infinity
  for (const a of diagramAtoms) {
    sMinX = Math.min(sMinX, a.x)
    sMinY = Math.min(sMinY, a.y)
    sMaxX = Math.max(sMaxX, a.x)
    sMaxY = Math.max(sMaxY, a.y)
  }
  if (!Number.isFinite(sMinX)) {
    sMinX = sMinY = 0
    sMaxX = sMaxY = 1
  }
  const vb = {
    minX: sMinX - pad,
    minY: sMinY - pad,
    width: Math.max(sMaxX - sMinX, 0.5) + pad * 2,
    height: Math.max(sMaxY - sMinY, 0.5) + pad * 2,
  }

  const alt = [
    'Asymmetric-unit 2D sketch',
    formula ? `formula ${formula}` : null,
    `${atoms.length} atoms`,
    moleculeCount
      ? `${moleculeCount} intact molecule${moleculeCount === 1 ? '' : 's'}`
      : null,
    smiles ? `SMILES ${smiles}` : null,
  ]
    .filter(Boolean)
    .join('. ')

  return {
    kind: 'molecule',
    atoms: diagramAtoms,
    bonds: localBonds.map((b) => ({ a: b.a, b: b.b })),
    viewBox: vb,
    formula,
    smiles,
    moleculeCount,
    atomCount: atoms.length,
    nonHCount,
    altText: alt + '.',
  }
}

/** Bond list typed re-export helper for tests. */
export function baseOpBonds(bonds: SymmetryBond[], opIndex = 1): SymmetryBond[] {
  return bonds.filter((b) => b.opIndex === opIndex)
}
