/** Space group 205 · Pa-3 — primitive cubic (pyrite archetype; ITA). */

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
export const SEED: Vec3 = [0.07, 0.37, 0.21]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold 〈111〉', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4-fold', color: '#a5b4fc' },
  sixfold: { id: 'sixfold', label: '6-fold', color: '#818cf8' },
  screw: { id: 'screw', label: '2₁ screw', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  mirror: { id: 'mirror', label: 'mirror', color: '#facc15' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n / a-glide', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'threefold',
  'screw',
  'inversion',
  'a-glide',
]

const triplets = (
  itaJson as { groups: { number: number; triplets: string[] }[] }
).groups.find((g) => g.number === 205)!.triplets

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
  const hasHalf = t.some((c) => {
    const a = Math.abs(((c % 1) + 1) % 1)
    return Math.abs(a - 0.5) < 0.02
  })

  if (op.index === 1) return { ...op, seitz: '{1 | 0}' }
  if (det === -1 && tr === -3) {
    return {
      ...op,
      label: op.index === 13 ? 'Inversion (−1)' : 'Inversion',
      classId: 'inversion' as SymmetryClassId,
      seitz: op.index === 13 ? '{-1 | 0}' : op.seitz,
    }
  }
  // 3-fold 〈111〉: det 1, tr 0
  if (det === 1 && tr === 0) {
    return { ...op, label: '3-fold 〈111〉', classId: 'threefold' as SymmetryClassId }
  }
  // −3
  if (det === -1 && tr === 0) {
    return { ...op, label: '−3 〈111〉', classId: 'threefold' as SymmetryClassId }
  }
  // 2₁ screws: det 1, tr -1, with half translations
  if (det === 1 && tr === -1 && hasHalf) {
    return { ...op, label: '2₁ screw', classId: 'screw' as SymmetryClassId }
  }
  if (det === 1 && tr === -1) {
    return { ...op, label: '2-fold', classId: 'screw' as SymmetryClassId }
  }
  // a-glides / n-like (improper with halves)
  if (det === -1 && tr === 1 && hasHalf) {
    return { ...op, label: 'a-glide', classId: 'a-glide' as SymmetryClassId }
  }
  if (det === -1 && tr === 1) {
    return { ...op, label: 'glide / mirror', classId: 'a-glide' as SymmetryClassId }
  }
  return op
})

export const META: SpaceGroupMeta = {
  number: 205,
  hm: 'Pa-3',
  system: 'cubic',
  pointGroup: 'm-3',
  lattice: 'Primitive',
  multiplicity: 24,
  blurb:
    'Pa-3 (~CSD rank 42, <0.3%) is the pyrite archetype: primitive cubic m-3 with 3-folds 〈111〉, 2₁ screws, a-glides, and inversion — twenty-four general positions. Contrast F-centred Fm-3 (202) / Fm-3m (225).',
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
    origin: [0.25, 0, 0.25],
    direction: [0, 1, 0],
    locus: '(¼, y, ¼)',
    opIndex: 2,
    primary: true,
    kind: '21',
  },
]

const INVERSION_CENTERS: InversionCenterSpec[] = [
  { position: [0, 0, 0], primary: true, locus: '(0, 0, 0)' },
]

const GLIDE_PLANES: GlidePlaneSpec[] = [
  {
    planeValue: 0.25,
    normalAxis: 0,
    glide: [0, 0.5, 0],
    label: 'a-glide',
    classId: 'a-glide',
    opIndex: 14,
    primary: true,
    locus: 'x = ¼ · a-related glide (teaching)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  if (opIndex === 1) return null
  const op = OPERATORS.find((o) => o.index === opIndex)
  if (!op) return null
  if (op.classId === 'threefold') return '3-fold / −3 axis 〈111〉'
  if (op.classId === 'screw') return '2₁ screw axis'
  if (op.classId === 'inversion') return 'inversion centre'
  if (op.classId === 'a-glide') return 'a-glide plane'
  return op.label
}

export const FOCUS_OPS = [1, 2, 3, 4, 5, 9, 13, 14]

export const pa3Demo: SpaceGroupDemo = {
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
  shortName: 'Pa-3',
  operatorFocusIndices: FOCUS_OPS,
}
