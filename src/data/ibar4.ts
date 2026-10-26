/** Space group 82 · I-4 — body-centred tetragonal (ITA). */

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

export const CELL: CellParams = { a: 1, b: 1, c: 1.4 }
export const SEED: Vec3 = [0.17, 0.23, 0.31]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold ‖ c', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '−4 ‖ c', color: '#a5b4fc' },
  screw: { id: 'screw', label: 'screw', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'twofold',
  'fourfold',
]

const RAW = buildOperatorsFromTriplets([
  'x,y,z',
  'y,-x,-z',
  '-x,-y,z',
  '-y,x,-z',
  'x+1/2,y+1/2,z+1/2',
  'y+1/2,-x+1/2,-z+1/2',
  '-x+1/2,-y+1/2,z+1/2',
  '-y+1/2,x+1/2,-z+1/2',
])

export const OPERATORS: Operator[] = RAW.map((op) => {
  switch (op.index) {
    case 1:
      return { ...op, seitz: '{1 | 0}' }
    case 2:
      return { ...op, label: '−4 ‖ c', classId: 'fourfold', seitz: '{-4₀₀₁ | 0}' }
    case 3:
      return { ...op, label: '2-fold ‖ c', classId: 'twofold', seitz: '{2₀₀₁ | 0}' }
    case 4:
      return { ...op, label: '−4³ ‖ c', classId: 'fourfold', seitz: '{-4₀₀₁³ | 0}' }
    case 5:
      return { ...op, label: 'I-centring', classId: 'identity', seitz: '{1 | ½,½,½}' }
    case 6:
    case 8:
      return { ...op, label: '−4 ‖ c (I)', classId: 'fourfold' }
    case 7:
      return { ...op, label: '2-fold ‖ c (I)', classId: 'twofold' }
    default:
      return op
  }
})

export const META: SpaceGroupMeta = {
  number: 82,
  hm: 'I-4',
  system: 'tetragonal',
  pointGroup: '-4',
  lattice: 'I-centred',
  multiplicity: 8,
  blurb:
    'I-4 (~0.13% of CSD) is body-centred tetragonal with −4 axes ‖ c and a pure 2-fold ‖ c — no screws or glides. Teaching companion to I41/a (adds 4₁ + a-glide + inversion). Cell: a = b, elongated c.',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  { origin: [0, 0, 0], direction: [0, 0, 1], locus: '(0, 0, z)', opIndex: 2, primary: true, kind: 'bar4' },
  { origin: [0.5, 0.5, 0], direction: [0, 0, 1], locus: '(½, ½, z)', opIndex: 6, primary: false, kind: 'bar4' },
  { origin: [0, 0, 0], direction: [0, 0, 1], locus: '(0, 0, z)', opIndex: 3, primary: true, kind: '2' },
  { origin: [0.5, 0.5, 0], direction: [0, 0, 1], locus: '(½, ½, z)', opIndex: 7, primary: false, kind: '2' },
]

export function elementLocusForOp(opIndex: number): string | null {
  const map: Record<number, string | null> = {
    1: null,
    2: '−4 axis at (0, 0, z)',
    3: '2-fold axis at (0, 0, z)',
    4: '−4 axis at (0, 0, z)',
    5: 'I-centring translation (½, ½, ½)',
  }
  return map[opIndex] ?? OPERATORS.find((o) => o.index === opIndex)?.label ?? null
}

export const ibar4Demo: SpaceGroupDemo = {
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
  shortName: 'I-4',
}
