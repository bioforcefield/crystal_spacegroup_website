/** Space group 202 · Fm-3 — cubic m-3 (no 4-fold; ITA). */

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

export const CELL: CellParams = { a: 1, b: 1, c: 1 }
export const SEED: Vec3 = [0.12, 0.19, 0.27]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / F-centring', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold 〈111〉', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4-fold', color: '#a5b4fc' },
  sixfold: { id: 'sixfold', label: '6-fold', color: '#818cf8' },
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
  'threefold',
  'screw',
  'inversion',
  'mirror',
]

const triplets = (
  itaJson as { groups: { number: number; triplets: string[] }[] }
).groups.find((g) => g.number === 202)!.triplets

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
    return {
      ...op,
      label: op.index === 13 ? 'Inversion (−1)' : 'Inversion (F-related)',
      classId: 'inversion',
      seitz: op.index === 13 ? '{-1 | 0}' : op.seitz,
    }
  }
  // 3-fold 〈111〉: det 1, tr 0
  if (det === 1 && tr === 0) {
    return { ...op, label: '3-fold 〈111〉', classId: 'threefold' }
  }
  if (det === 1 && tr === -1) {
    return { ...op, label: '2-fold', classId: 'screw' }
  }
  // mirrors (det -1, tr 1, t~0)
  if (det === -1 && tr === 1 && t.every((c) => Math.abs(c) < 1e-6)) {
    return { ...op, label: 'mirror', classId: 'mirror' }
  }
  if (det === -1 && tr === 1) {
    return { ...op, label: 'mirror (F-related)', classId: 'mirror' }
  }
  // −3: det -1, tr 0
  if (det === -1 && tr === 0) {
    return { ...op, label: '−3 〈111〉', classId: 'threefold' }
  }
  return op
})

export const META: SpaceGroupMeta = {
  number: 202,
  hm: 'Fm-3',
  system: 'cubic',
  pointGroup: 'm-3',
  lattice: 'F-centred',
  multiplicity: 96,
  blurb:
    'Fm-3 is F-centred cubic m-3: 3-folds 〈111〉, 2-folds, mirrors, and inversion — but no 4-folds (contrast Fm-3m). Teaching chips focus a shortlist of the 96 general positions.',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  {
    origin: [0, 0, 0],
    direction: [1, 1, 1],
    locus: '[111] through origin',
    opIndex: 5,
    primary: true,
    kind: '3',
  },
  {
    origin: [0, 0, 0],
    direction: [0, 0, 1],
    locus: '(0, 0, z)',
    opIndex: 2,
    primary: true,
    kind: '2',
  },
]

const INVERSION_CENTERS: InversionCenterSpec[] = [
  { position: [0, 0, 0], primary: true, locus: '(0, 0, 0)' },
  { position: [0, 0.5, 0.5], primary: false, locus: '(0, ½, ½)' },
]

const GLIDE_PLANES: GlidePlaneSpec[] = [
  {
    planeValue: 0,
    normalAxis: 2,
    glide: [0, 0, 0],
    label: 'mirror',
    classId: 'mirror',
    opIndex: 14,
    primary: true,
    locus: 'z = 0, mirror (no glide)',
  },
  {
    planeValue: 0,
    normalAxis: 0,
    glide: [0, 0, 0],
    label: 'mirror',
    classId: 'mirror',
    opIndex: 15,
    primary: true,
    locus: 'x = 0, mirror (no glide)',
  },
  {
    planeValue: 0,
    normalAxis: 1,
    glide: [0, 0, 0],
    label: 'mirror',
    classId: 'mirror',
    opIndex: 16,
    primary: false,
    locus: 'y = 0, mirror (no glide)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  if (opIndex === 1) return null
  const op = OPERATORS.find((o) => o.index === opIndex)
  if (!op) return null
  if (op.classId === 'identity' && op.t.some((c) => Math.abs(c) > 1e-6)) {
    return 'F-centring translation'
  }
  if (op.classId === 'threefold') return '3-fold / −3 along 〈111〉'
  if (op.classId === 'inversion') return 'inversion centre'
  if (op.classId === 'mirror') return 'mirror plane'
  if (op.classId === 'screw') return '2-fold axis'
  return op.label
}

export const FOCUS_OPS = [1, 2, 5, 13, 14, 15, 16, 25]

export const fm3Demo: SpaceGroupDemo = {
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
  shortName: 'Fm-3',
  operatorFocusIndices: FOCUS_OPS,
}
