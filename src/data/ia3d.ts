/** Space group 230 · Ia-3d — cubic I (garnet archetype, ITA). */

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
  identity: { id: 'identity', label: 'self / I-centring', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold 〈111〉', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4₁ / 4-fold', color: '#a5b4fc' },
  sixfold: { id: 'sixfold', label: '6-fold', color: '#818cf8' },
  screw: { id: 'screw', label: '2₁ / screw', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  mirror: { id: 'mirror', label: 'mirror', color: '#facc15' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c / n-glide', color: '#fb923c' },
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
  'c-glide',
]

const triplets = (
  itaJson as { groups: { number: number; triplets: string[] }[] }
).groups.find((g) => g.number === 230)!.triplets

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
    return { ...op, label: 'I-centring', classId: 'identity' as SymmetryClassId }
  }
  if (det === -1 && tr === -3) {
    return {
      ...op,
      label: 'Inversion (−1)',
      classId: 'inversion' as SymmetryClassId,
    }
  }
  if (det === 1 && tr === 0) {
    return { ...op, label: '3-fold 〈111〉', classId: 'threefold' as SymmetryClassId }
  }
  if (det === 1 && tr === 1) {
    return { ...op, label: '4₁ screw', classId: 'fourfold' as SymmetryClassId }
  }
  if (det === -1 && qt >= 2) {
    return { ...op, label: 'd-glide', classId: 'd-glide' as SymmetryClassId }
  }
  if (det === 1 && tr === -1) {
    return { ...op, label: '2-fold / 2₁', classId: 'screw' as SymmetryClassId }
  }
  if (det === -1 && tr === 1) {
    return { ...op, label: 'c / n-glide', classId: 'c-glide' as SymmetryClassId }
  }
  return op
})

export const META: SpaceGroupMeta = {
  number: 230,
  hm: 'Ia-3d',
  system: 'cubic',
  pointGroup: 'm-3m',
  lattice: 'I-centred',
  multiplicity: 96,
  blurb:
    'Ia-3d is the garnet space group: I-centring, 4₁ screws, 3-folds 〈111〉, diamond glides, and inversion. Ninety-six general positions — teaching chips focus a shortlist (same pattern as Fd-3m / Fm-3m).',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  {
    origin: [0, 0.25, 0],
    direction: [0, 0, 1],
    locus: '(0, ¼, z)',
    opIndex: 2,
    primary: true,
    kind: '41',
  },
  {
    origin: [0, 0, 0],
    direction: [1, 1, 1],
    locus: '[111] through origin',
    opIndex: 9,
    primary: true,
    kind: '3',
  },
]

/** Inversion for −x+½,−y+½,−z+½ style ops → (¼,¼,¼); sample ITA Ia-3d inversions. */
const INVERSION_CENTERS: InversionCenterSpec[] = [
  { position: [0, 0, 0], primary: true, locus: '(0, 0, 0)' },
  { position: [0.5, 0.5, 0.5], primary: false, locus: '(½, ½, ½)' },
]

const GLIDE_PLANES: GlidePlaneSpec[] = [
  {
    planeValue: 0.125,
    normalAxis: 0,
    glide: [0, 0.25, 0.25],
    label: 'd-glide',
    classId: 'd-glide',
    opIndex: 26,
    primary: true,
    locus: 'x = ⅛ · diamond glide (teaching)',
  },
  {
    planeValue: 0.125,
    normalAxis: 2,
    glide: [0.25, 0.25, 0],
    label: 'd-glide',
    classId: 'd-glide',
    opIndex: 26,
    primary: false,
    locus: 'z = ⅛ · diamond glide (teaching)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  if (opIndex === 1) return null
  const op = OPERATORS.find((o) => o.index === opIndex)
  if (!op) return null
  if (op.classId === 'identity' && op.t.some((c) => Math.abs(c) > 1e-6)) {
    return 'I-centring translation'
  }
  if (op.classId === 'threefold') return '3-fold axis along 〈111〉'
  if (op.classId === 'fourfold') return '4₁ screw axis'
  if (op.classId === 'inversion') return 'inversion centre'
  if (op.classId === 'd-glide') return 'diamond glide plane'
  return op.label
}

export const FOCUS_OPS = [1, 2, 3, 5, 9, 25, 26, 30]

export const ia3dDemo: SpaceGroupDemo = {
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
  shortName: 'Ia-3d',
  operatorFocusIndices: FOCUS_OPS,
}
