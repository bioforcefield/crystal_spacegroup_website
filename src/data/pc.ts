/** Space group 7 · Pc — monoclinic, unique axis b, cell choice 1 (ITA). */

import type {
  CellParams,
  GlidePlaneSpec,
  Operator,
  SpaceGroupDemo,
  SpaceGroupMeta,
  SymmetryClass,
  SymmetryClassId,
  Vec3,
} from './types'
import { buildOperatorsFromTriplets } from './groups'

export const CELL: CellParams = { a: 1, b: 1.15, c: 1.35, betaDeg: 110 }
export const SEED: Vec3 = [0.18, 0.22, 0.31]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold ‖ b', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4-fold', color: '#a5b4fc' },
  screw: { id: 'screw', label: '2₁ screw ‖ b', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  'a-glide': { id: 'a-glide', label: 'a-glide ⊥ b', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide ⊥ b', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide ⊥ b', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = ['identity', 'c-glide']

export const OPERATORS: Operator[] = buildOperatorsFromTriplets([
  'x, y, z',
  'x, −y, z+½',
]).map((op) => {
  if (op.classId === 'identity') return { ...op, seitz: '{1 | 0}' }
  if (op.classId === 'c-glide') {
    return { ...op, label: 'c-glide ⊥ b', seitz: '{m₀₁₀ | 0,0,½}' }
  }
  return op
})

export const META: SpaceGroupMeta = {
  number: 7,
  hm: 'Pc',
  system: 'monoclinic',
  pointGroup: 'm',
  lattice: 'Primitive',
  multiplicity: 2,
  blurb:
    'Pc is a common polar monoclinic group (~0.5% of CSD). Unique axis b: a single c-glide ⊥ b and no 2-fold or inversion (point group m). Teaching contrast with centrosymmetric P2/c and with Cc (C-centred). Cell uses β ≈ 110°.',
}

const GLIDE_PLANES: GlidePlaneSpec[] = [
  {
    planeValue: 0,
    normalAxis: 1,
    glide: [0, 0, 0.5],
    label: 'c-glide',
    classId: 'c-glide',
    opIndex: 2,
    primary: true,
    locus: 'y = 0, glide (0, 0, ½)',
  },
  {
    planeValue: 0.5,
    normalAxis: 1,
    glide: [0, 0, 0.5],
    label: 'c-glide',
    classId: 'c-glide',
    opIndex: 2,
    primary: false,
    locus: 'y = ½, glide (0, 0, ½)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  switch (opIndex) {
    case 1:
      return null
    case 2:
      return 'c-glide plane y = 0 · glide (0, 0, ½)'
    default:
      return null
  }
}

export const pcDemo: SpaceGroupDemo = {
  meta: META,
  cell: CELL,
  seed: SEED,
  operators: OPERATORS,
  symmetryClasses: SYMMETRY_CLASSES,
  classLegendOrder: CLASS_LEGEND_ORDER,
  screwAxes: [],
  inversionCenters: [],
  glidePlanes: GLIDE_PLANES,
  elementLocusForOp,
  defaultProjection: 'b',
  primaryInversionOp: 1,
  shortName: 'Pc',
}
