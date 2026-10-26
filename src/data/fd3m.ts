/** Space group 227 · Fd-3m — cubic diamond (ITA Fd-3m:1). */

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
  fourfold: { id: 'fourfold', label: '4-fold / 4₁', color: '#a5b4fc' },
  screw: { id: 'screw', label: 'screw / 2₁', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  mirror: { id: 'mirror', label: 'mirror', color: '#facc15' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide / mirror', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'fourfold',
  'threefold',
  'screw',
  'inversion',
  'd-glide',
]

const triplets = (
  itaJson as { groups: { number: number; triplets: string[] }[] }
).groups.find((g) => g.number === 227)!.triplets

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

const RAW = buildOperatorsFromTriplets(triplets)

/** Teaching polish: classify by det/trace; flag diamond glides. */
export const OPERATORS: Operator[] = RAW.map((op) => {
  const det = Math.round(det3(op.R))
  const tr = Math.round(tr3(op.R))
  const t = op.t
  const qt = t.filter((c) => {
    const a = Math.abs(c)
    return Math.abs(a - 0.25) < 0.02 || Math.abs(a - 0.75) < 0.02
  }).length

  if (op.index === 1) return { ...op, seitz: '{1 | 0}' }
  if (det === 1 && tr === 3 && t.some((c) => Math.abs(c) > 1e-6)) {
    return { ...op, label: 'F-centring', classId: 'identity' as SymmetryClassId }
  }
  if (det === -1 && tr === -3) {
    return {
      ...op,
      label: op.index === 25 ? 'Inversion (−1)' : 'Inversion (F-related)',
      classId: 'inversion' as SymmetryClassId,
    }
  }
  if (det === 1 && tr === 0) {
    return { ...op, label: '3-fold 〈111〉', classId: 'threefold' as SymmetryClassId }
  }
  if (det === 1 && tr === 1) {
    return { ...op, label: '4₁ / 4-fold', classId: 'fourfold' as SymmetryClassId }
  }
  if (det === -1 && qt >= 2) {
    return { ...op, label: 'd-glide', classId: 'd-glide' as SymmetryClassId }
  }
  if (det === 1 && tr === -1) {
    return { ...op, label: '2-fold / 2₁', classId: 'screw' as SymmetryClassId }
  }
  return op
})

export const META: SpaceGroupMeta = {
  number: 227,
  hm: 'Fd-3m',
  system: 'cubic',
  pointGroup: 'm-3m',
  lattice: 'F-centred',
  multiplicity: 192,
  blurb:
    'Fd-3m (origin choice 1) is the diamond / spinel archetype: F-centring, 3-folds 〈111〉, 4₁ screws, diamond (d) glides, and inversion at (⅛,⅛,⅛). Teaching cell is cubic; operator chips focus a shortlist — expand for all 192 general positions.',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  {
    origin: [0, 0, 0],
    direction: [1, 1, 1],
    locus: '[111] through (0,0,0)',
    opIndex: 9,
    primary: true,
    kind: '3',
  },
  {
    origin: [0, 0.25, 0],
    direction: [0, 0, 1],
    locus: '(0, ¼, z)',
    opIndex: 2,
    primary: true,
    kind: '41',
  },
]

const INVERSION_CENTERS: InversionCenterSpec[] = [
  { position: [0.125, 0.125, 0.125], primary: true, locus: '(⅛, ⅛, ⅛)' },
  { position: [0.125, 0.375, 0.375], primary: false, locus: '(⅛, ⅜, ⅜)' },
  { position: [0.375, 0.125, 0.375], primary: false, locus: '(⅜, ⅛, ⅜)' },
  { position: [0.375, 0.375, 0.125], primary: false, locus: '(⅜, ⅜, ⅛)' },
]

const GLIDE_PLANES: GlidePlaneSpec[] = [
  {
    planeValue: 0.125,
    normalAxis: 0,
    glide: [0, 0.25, 0.25],
    label: 'd-glide',
    classId: 'd-glide',
    opIndex: 29,
    primary: true,
    locus: 'x = ⅛ · glide (0, ¼, ¼)',
  },
  {
    planeValue: 0.125,
    normalAxis: 1,
    glide: [0.25, 0, 0.25],
    label: 'd-glide',
    classId: 'd-glide',
    opIndex: 29,
    primary: false,
    locus: 'y = ⅛ · glide (¼, 0, ¼)',
  },
  {
    planeValue: 0.125,
    normalAxis: 2,
    glide: [0.25, 0.25, 0],
    label: 'd-glide',
    classId: 'd-glide',
    opIndex: 27,
    primary: true,
    locus: 'z = ⅛ · glide (¼, ¼, 0)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  if (opIndex === 1) return null
  const op = OPERATORS.find((o) => o.index === opIndex)
  if (!op) return null
  if (op.classId === 'identity' && op.t.some((c) => Math.abs(c) > 1e-6)) {
    return 'F-centring translation'
  }
  if (op.classId === 'threefold') return '3-fold axis along 〈111〉'
  if (op.classId === 'fourfold') return '4₁ / 4-fold axis'
  if (op.classId === 'inversion') return 'inversion near (⅛, ⅛, ⅛)'
  if (op.classId === 'd-glide') return 'diamond glide plane'
  return op.label
}

/** Short teaching list for chips / panel; expand for all 192. */
export const FOCUS_OPS = [1, 2, 3, 5, 9, 25, 27, 29, 31]

export const fd3mDemo: SpaceGroupDemo = {
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
  primaryInversionOp: 25,
  shortName: 'Fd-3m',
  operatorFocusIndices: FOCUS_OPS,
}
