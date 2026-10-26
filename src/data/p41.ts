/** Space group 76 · P41 — tetragonal Sohncke 4₁ (ITA). */

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
  screw: { id: 'screw', label: '4₁ screw', color: '#a78bfa' },
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
  '-y,x,z+1/4',
  '-x,-y,z+1/2',
  'y,-x,z+3/4',
])

export const OPERATORS: Operator[] = RAW.map((op) => {
  switch (op.index) {
    case 1:
      return { ...op, seitz: '{1 | 0}' }
    case 2:
      return { ...op, label: '4₁ screw ‖ c', classId: 'screw', seitz: '{4₀₀₁ | 0,0,¼}' }
    case 3:
      return { ...op, label: '2₁ screw ‖ c', classId: 'screw', seitz: '{2₀₀₁ | 0,0,½}' }
    case 4:
      return { ...op, label: '4₁³ / reverse', classId: 'screw' }
    default:
      return op
  }
})

export const META: SpaceGroupMeta = {
  number: 76,
  hm: 'P41',
  system: 'tetragonal',
  pointGroup: '4',
  lattice: 'Primitive',
  multiplicity: 4,
  blurb:
    'P41 is the simplest tetragonal 4₁ teaching group: a single right-handed 4₁ screw ‖ c (and its 2₁ / 4₁³ powers). No mirrors, glides, or inversion — polar Sohncke. Pair with I41 (body-centred) and P41212 for richer basal screws.',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  { origin: [0, 0, 0], direction: [0, 0, 1], locus: '(0, 0, z)', opIndex: 2, primary: true, kind: '41' },
  { origin: [0, 0, 0], direction: [0, 0, 1], locus: '(0, 0, z) · 2₁', opIndex: 3, primary: false, kind: '21' },
]

export function elementLocusForOp(opIndex: number): string | null {
  if (opIndex === 1) return null
  if (opIndex === 2) return '4₁ axis at (0, 0, z)'
  if (opIndex === 3) return '2₁ axis at (0, 0, z) (4₁²)'
  if (opIndex === 4) return '4₁³ at (0, 0, z)'
  return null
}

export const p41Demo: SpaceGroupDemo = {
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
  shortName: 'P41',
}
