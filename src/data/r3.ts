/** Space group 146 · R3 — trigonal, hexagonal setting (ITA R 3:H). */

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

export const CELL: CellParams = { a: 1, b: 1, c: 1.5, gammaDeg: 120 }
export const SEED: Vec3 = [0.17, 0.23, 0.31]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold ‖ c', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4-fold', color: '#a5b4fc' },
  sixfold: { id: 'sixfold', label: '6-fold', color: '#818cf8' },
  screw: { id: 'screw', label: 'screw', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  mirror: { id: 'mirror', label: 'mirror', color: '#facc15' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = ['identity', 'threefold']

const RAW = buildOperatorsFromTriplets([
  'x,y,z',
  '-y,x-y,z',
  '-x+y,-x,z',
  'x+2/3,y+1/3,z+1/3',
  '-y+2/3,x-y+1/3,z+1/3',
  '-x+y+2/3,-x+1/3,z+1/3',
  'x+1/3,y+2/3,z+2/3',
  '-y+1/3,x-y+2/3,z+2/3',
  '-x+y+1/3,-x+2/3,z+2/3',
])

export const OPERATORS: Operator[] = RAW.map((op) => {
  if (op.index === 1) return { ...op, seitz: '{1 | 0}' }
  if (op.classId === 'identity' && op.t.some((c) => Math.abs(c) > 1e-6)) {
    return { ...op, label: 'R-centring' }
  }
  if (op.classId === 'threefold') {
    return { ...op, label: '3-fold ‖ c' }
  }
  return op
})

export const META: SpaceGroupMeta = {
  number: 146,
  hm: 'R3',
  system: 'trigonal',
  pointGroup: '3',
  lattice: 'Rhombohedral (hexagonal axes)',
  multiplicity: 9,
  blurb:
    'R3 (~0.15% of CSD) is the Sohncke trigonal sibling of R-3: a 3-fold ‖ c and R-centring only — no inversion. Teaching cell uses a = b, γ = 120° (hexagonal setting). Contrast with centrosymmetric R-3 (148).',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  { origin: [0, 0, 0], direction: [0, 0, 1], locus: '(0, 0, z)', opIndex: 2, primary: true, kind: '3' },
  { origin: [2 / 3, 1 / 3, 0], direction: [0, 0, 1], locus: '(⅔, ⅓, z)', opIndex: 5, primary: true, kind: '3' },
  { origin: [1 / 3, 2 / 3, 0], direction: [0, 0, 1], locus: '(⅓, ⅔, z)', opIndex: 8, primary: true, kind: '3' },
]

export function elementLocusForOp(opIndex: number): string | null {
  if (opIndex === 1) return null
  if ([2, 3].includes(opIndex)) return '3-fold axis at (0, 0, z)'
  if ([4, 7].includes(opIndex)) return 'R-centring translation'
  if ([5, 6].includes(opIndex)) return '3-fold axis at (⅔, ⅓, z)'
  if ([8, 9].includes(opIndex)) return '3-fold axis at (⅓, ⅔, z)'
  return null
}

export const r3Demo: SpaceGroupDemo = {
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
  shortName: 'R3',
}
