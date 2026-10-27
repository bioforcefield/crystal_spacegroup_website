/** Space group 80 · I41 — body-centred tetragonal 4₁ (ITA). */

import type {
  CellParams,
  Operator,
  ScrewAxisSpec,
  SpaceGroupDemo,
  SpaceGroupMeta,
  SymmetryClass,
  SymmetryClassId,
  Vec3,
} from './types'
import { buildOperatorsFromTriplets } from './groups'

export const CELL: CellParams = { a: 1, b: 1, c: 1.5 }
export const SEED: Vec3 = [0.17, 0.23, 0.31]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4-fold', color: '#a5b4fc' },
  sixfold: { id: 'sixfold', label: '6-fold', color: '#818cf8' },
  screw: { id: 'screw', label: '4₁ screw ‖ c', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  mirror: { id: 'mirror', label: 'mirror', color: '#facc15' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = ['identity', 'screw']

const RAW = buildOperatorsFromTriplets([
  'x,y,z',
  '-y,x+1/2,z+1/4',
  '-x+1/2,-y+1/2,z+1/2',
  'y+1/2,-x,z+3/4',
  'x+1/2,y+1/2,z+1/2',
  '-y+1/2,x,z+3/4',
  '-x,-y,z',
  'y,-x+1/2,z+1/4',
])

export const OPERATORS: Operator[] = RAW.map((op) => {
  switch (op.index) {
    case 1:
      return { ...op, seitz: '{1 | 0}' }
    case 2:
      return { ...op, label: '4₁ screw ‖ c', classId: 'screw', seitz: '{4₀₀₁ | ½,0,¼}' }
    case 3:
      return { ...op, label: '2₁ screw ‖ c', classId: 'screw' }
    case 4:
      return { ...op, label: '4₁³ ‖ c', classId: 'screw' }
    case 5:
      return { ...op, label: 'I-centring', classId: 'identity' }
    case 6:
      return { ...op, label: '4₁ (I-related)', classId: 'screw' }
    case 7:
      return { ...op, label: '2 ‖ c (I)', classId: 'screw' }
    case 8:
      return { ...op, label: '4₁ (I-related)', classId: 'screw' }
    default:
      return op
  }
})

export const META: SpaceGroupMeta = {
  number: 80,
  hm: 'I41',
  system: 'tetragonal',
  pointGroup: '4',
  lattice: 'I-centred',
  multiplicity: 8,
  blurb:
    'I41 pairs the P41 4₁ with I-centring (eight general positions). Teaching bridge between P41 and I41/a (which adds −4 and an a-glide). Overlays show the primary 4₁ at (0, ½, z) and its I image.',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  { origin: [0, 0.5, 0], direction: [0, 0, 1], locus: '(0, ½, z)', opIndex: 2, primary: true, kind: '41' },
  { origin: [0.5, 0, 0], direction: [0, 0, 1], locus: '(½, 0, z)', opIndex: 6, primary: true, kind: '41' },
  { origin: [0.25, 0.25, 0], direction: [0, 0, 1], locus: '(¼, ¼, z)', opIndex: 3, primary: false, kind: '21' },
]

export function elementLocusForOp(opIndex: number): string | null {
  const map: Record<number, string | null> = {
    1: null,
    2: '4₁ axis at (0, ½, z)',
    3: '2₁ axis ‖ c',
    4: '4₁³ ‖ c',
    5: 'I-centring translation (½, ½, ½)',
    6: '4₁ axis at (½, 0, z)',
    7: '2-fold / 2₁ (I-related)',
    8: '4₁ (I-related)',
  }
  return map[opIndex] ?? null
}

export const i41Demo: SpaceGroupDemo = {
  meta: META,
  cell: CELL,
  seed: SEED,
  operators: OPERATORS,
  symmetryClasses: SYMMETRY_CLASSES,
  classLegendOrder: CLASS_LEGEND_ORDER,
  screwAxes: SCREW_AXES,
  inversionCenters: [],
  glidePlanes: [],
  elementLocusForOp,
  defaultProjection: 'c',
  primaryInversionOp: 1,
  shortName: 'I41',
}
