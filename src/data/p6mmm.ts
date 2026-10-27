/** Space group 191 · P6/mmm — hexagonal highest symmetry (ITA). */

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

export const CELL: CellParams = { a: 1, b: 1, c: 1.5, gammaDeg: 120 }
export const SEED: Vec3 = [0.17, 0.23, 0.31]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold ‖ c', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4-fold', color: '#a5b4fc' },
  sixfold: { id: 'sixfold', label: '6-fold', color: '#818cf8' },
  screw: { id: 'screw', label: '6-fold / 2-fold ‖ c', color: '#a78bfa' },
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
  'threefold',
  'inversion',
  'mirror',
]

const triplets = (
  itaJson as { groups: { number: number; triplets: string[] }[] }
).groups.find((g) => g.number === 191)!.triplets

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
  if (op.index === 1) return { ...op, seitz: '{1 | 0}' }
  if (det === -1 && tr === -3) {
    return { ...op, label: 'Inversion (−1)', classId: 'inversion', seitz: '{-1 | 0}' }
  }
  if (det === 1 && tr === 2) {
    return { ...op, label: '6-fold ‖ c', classId: 'screw' }
  }
  if (det === 1 && tr === 0) {
    return { ...op, label: '3-fold ‖ c', classId: 'threefold' }
  }
  if (det === 1 && tr === -1) {
    return { ...op, label: '2-fold', classId: 'screw' }
  }
  if (det === -1 && tr === 1) {
    return { ...op, label: 'mirror', classId: 'mirror' }
  }
  if (det === -1 && (tr === 0 || tr === -2)) {
    return { ...op, label: '−6 / −3', classId: 'threefold' }
  }
  return op
})

export const META: SpaceGroupMeta = {
  number: 191,
  hm: 'P6/mmm',
  system: 'hexagonal',
  pointGroup: '6/mmm',
  lattice: 'Primitive',
  multiplicity: 24,
  blurb:
    'P6/mmm is the highest-symmetry hexagonal teaching group: pure 6-folds ‖ c (no screw), 3-folds, mirrors, and inversion. Teaching cell uses γ = 120°. Contrast with P6₃/mmc (HCP) which replaces 6 with 6₃.',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  { origin: [0, 0, 0], direction: [0, 0, 1], locus: '(0, 0, z)', opIndex: 2, primary: true, kind: '6' },
  { origin: [0, 0, 0], direction: [0, 0, 1], locus: '(0, 0, z) · 3-fold', opIndex: 3, primary: true, kind: '3' },
  { origin: [0, 0, 0], direction: [0, 0, 1], locus: '(0, 0, z) · 2-fold', opIndex: 4, primary: false, kind: '2' },
]

const INVERSION_CENTERS: InversionCenterSpec[] = [
  { position: [0, 0, 0], primary: true, locus: '(0, 0, 0)' },
  { position: [0, 0, 0.5], primary: false, locus: '(0, 0, ½)' },
]

const GLIDE_PLANES: GlidePlaneSpec[] = [
  {
    planeValue: 0,
    normalAxis: 2,
    glide: [0, 0, 0],
    label: 'mirror',
    classId: 'mirror',
    opIndex: 16,
    primary: true,
    locus: 'z = 0, horizontal mirror',
  },
  {
    planeValue: 0,
    normalAxis: 1,
    glide: [0, 0, 0],
    label: 'mirror',
    classId: 'mirror',
    opIndex: 22,
    primary: true,
    locus: 'y = 0 · vertical mirror (teaching)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  if (opIndex === 1) return null
  const op = OPERATORS.find((o) => o.index === opIndex)
  if (!op) return null
  if (op.label.includes('6-fold')) return '6-fold axis ‖ c'
  if (op.classId === 'threefold') return '3-fold axis ‖ c'
  if (op.classId === 'inversion') return 'inversion centre'
  if (op.classId === 'mirror') return 'mirror plane'
  return op.label
}

export const FOCUS_OPS = [1, 2, 3, 4, 13, 16, 20, 22]

export const p6mmmDemo: SpaceGroupDemo = {
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
  primaryInversionOp: 13,
  shortName: 'P6/mmm',
  operatorFocusIndices: FOCUS_OPS,
}
