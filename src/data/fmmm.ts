/** Space group 69 · Fmmm — F-centred orthorhombic mmm (ITA). */

import type {
  CellParams,
  GlidePlaneSpec,
  InversionCenterSpec,
  Operator,
  ScrewAxisSpec,
  SpaceGroupDemo,
  SpaceGroupMeta,
  SymmetryClass,
  SymmetryClassId,
  Vec3,
} from './types'
import { buildOperatorsFromTriplets } from './groups'
import itaJson from './itaSpaceGroups.json'

export const CELL: CellParams = { a: 1, b: 1.2, c: 1.4 }
export const SEED: Vec3 = [0.17, 0.23, 0.31]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / F-centring', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4-fold', color: '#a5b4fc' },
  screw: { id: 'screw', label: '2-fold', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  mirror: { id: 'mirror', label: 'mirror', color: '#facc15' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'screw',
  'inversion',
  'mirror',
]

const triplets = (
  itaJson as { groups: { number: number; triplets: string[] }[] }
).groups.find((g) => g.number === 69)!.triplets

function det3(R: number[][]): number {
  return (
    R[0][0] * (R[1][1] * R[2][2] - R[1][2] * R[2][1]) -
    R[0][1] * (R[1][0] * R[2][2] - R[1][2] * R[2][0]) +
    R[0][2] * (R[1][0] * R[2][1] - R[1][1] * R[2][0])
  )
}
function tr3(R: number[][]): number {
  return R[0][0] + R[1][1] + R[2][2]
}

export const OPERATORS: Operator[] = buildOperatorsFromTriplets(triplets).map((op) => {
  const det = Math.round(det3(op.R))
  const tr = Math.round(tr3(op.R))
  const t = op.t
  if (op.index === 1) return { ...op, seitz: '{1 | 0}' }
  if (det === 1 && tr === 3 && t.some((c) => Math.abs(c) > 1e-6)) {
    return { ...op, label: 'F-centring', classId: 'identity' }
  }
  if (det === -1 && tr === -3) {
    return { ...op, label: 'Inversion (−1)', classId: 'inversion' }
  }
  if (det === 1 && tr === -1) {
    return { ...op, label: '2-fold', classId: 'screw' }
  }
  if (det === -1 && tr === 1 && t.every((c) => Math.abs(c) < 1e-6)) {
    return { ...op, label: 'mirror', classId: 'mirror' }
  }
  if (det === -1 && tr === 1) {
    return { ...op, label: 'mirror (F-related)', classId: 'mirror' }
  }
  return op
})

export const META: SpaceGroupMeta = {
  number: 69,
  hm: 'Fmmm',
  system: 'orthorhombic',
  pointGroup: 'mmm',
  lattice: 'F-centred',
  multiplicity: 32,
  blurb:
    'Fmmm is F-centred orthorhombic mmm: face-centring plus 2-folds, pure mirrors, and inversion — teaching companion to Pmmm / Cmmm with a fuller lattice.',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  { origin: [0, 0, 0], direction: [0, 0, 1], locus: '(0, 0, z)', opIndex: 2, primary: true, kind: '2' },
  { origin: [0, 0, 0], direction: [1, 0, 0], locus: '(x, 0, 0)', opIndex: 3, primary: true, kind: '2' },
  { origin: [0, 0, 0], direction: [0, 1, 0], locus: '(0, y, 0)', opIndex: 4, primary: true, kind: '2' },
]

const INVERSION_CENTERS: InversionCenterSpec[] = [
  { position: [0, 0, 0], primary: true, locus: '(0, 0, 0)' },
  { position: [0, 0.5, 0.5], primary: false, locus: '(0, ½, ½)' },
]

const GLIDE_PLANES: GlidePlaneSpec[] = [
  { planeValue: 0, normalAxis: 2, glide: [0, 0, 0], label: 'mirror', classId: 'mirror', opIndex: 6, primary: true, locus: 'z = 0, mirror' },
  { planeValue: 0, normalAxis: 0, glide: [0, 0, 0], label: 'mirror', classId: 'mirror', opIndex: 7, primary: true, locus: 'x = 0, mirror' },
  { planeValue: 0, normalAxis: 1, glide: [0, 0, 0], label: 'mirror', classId: 'mirror', opIndex: 8, primary: true, locus: 'y = 0, mirror' },
]

export function elementLocusForOp(opIndex: number): string | null {
  if (opIndex === 1) return null
  const op = OPERATORS.find((o) => o.index === opIndex)
  if (!op) return null
  if (op.classId === 'identity' && op.t.some((c) => Math.abs(c) > 1e-6)) return 'F-centring translation'
  if (op.classId === 'screw') return '2-fold axis'
  if (op.classId === 'inversion') return 'inversion centre'
  if (op.classId === 'mirror') return 'mirror plane'
  return op.label
}

export const FOCUS_OPS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export const fmmmDemo: SpaceGroupDemo = {
  meta: META,
  cell: CELL,
  seed: SEED,
  operators: OPERATORS,
  symmetryClasses: SYMMETRY_CLASSES,
  classLegendOrder: CLASS_LEGEND_ORDER,
  screwAxes: SCREW_AXES,
  inversionCenters: INVERSION_CENTERS,
  glidePlanes: GLIDE_PLANES,
  elementLocusForOp,
  defaultProjection: 'c',
  primaryInversionOp: 5,
  shortName: 'Fmmm',
  operatorFocusIndices: FOCUS_OPS,
}
