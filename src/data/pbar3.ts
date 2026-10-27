/** Space group 147 · P-3 — primitive trigonal (ITA). */

import type {
  CellParams,
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

export const CELL: CellParams = { a: 1, b: 1, c: 1.4, gammaDeg: 120 }
export const SEED: Vec3 = [0.17, 0.23, 0.31]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3 / −3 ‖ c', color: '#67e8f9' },
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

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'threefold',
  'inversion',
]

const RAW = buildOperatorsFromTriplets([
  'x,y,z',
  '-y,x-y,z',
  '-x+y,-x,z',
  '-x,-y,-z',
  'y,-x+y,-z',
  'x-y,x,-z',
])

export const OPERATORS: Operator[] = RAW.map((op) => {
  switch (op.index) {
    case 1:
      return { ...op, seitz: '{1 | 0}' }
    case 2:
    case 3:
      return { ...op, label: '3-fold ‖ c', classId: 'threefold' }
    case 4:
      return { ...op, label: 'Inversion (−1)', classId: 'inversion', seitz: '{-1 | 0}' }
    case 5:
    case 6:
      return { ...op, label: '−3 ‖ c', classId: 'threefold' }
    default:
      return op
  }
})

export const META: SpaceGroupMeta = {
  number: 147,
  hm: 'P-3',
  system: 'trigonal',
  pointGroup: '-3',
  lattice: 'Primitive',
  multiplicity: 6,
  blurb:
    'P-3 is the primitive trigonal −3 group: 3 / −3 ‖ c plus inversion — the R-free cousin of R-3. Teaching cell a = b, γ = 120°. Six general positions.',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  { origin: [0, 0, 0], direction: [0, 0, 1], locus: '(0, 0, z)', opIndex: 2, primary: true, kind: '3' },
]

const INVERSION_CENTERS: InversionCenterSpec[] = [
  { position: [0, 0, 0], primary: true, locus: '(0, 0, 0)' },
  { position: [0, 0, 0.5], primary: false, locus: '(0, 0, ½)' },
]

export function elementLocusForOp(opIndex: number): string | null {
  if (opIndex === 1) return null
  if (opIndex === 2 || opIndex === 3) return '3-fold axis at (0, 0, z)'
  if (opIndex === 4) return 'inversion at (0, 0, 0)'
  if (opIndex === 5 || opIndex === 6) return '−3 axis at (0, 0, z)'
  return null
}

export const pbar3Demo: SpaceGroupDemo = {
  meta: META,
  cell: CELL,
  seed: SEED,
  operators: OPERATORS,
  symmetryClasses: SYMMETRY_CLASSES,
  classLegendOrder: CLASS_LEGEND_ORDER,
  screwAxes: SCREW_AXES,
  inversionCenters: INVERSION_CENTERS,
  glidePlanes: [],
  elementLocusForOp,
  defaultProjection: 'c',
  primaryInversionOp: 4,
  shortName: 'P-3',
}
