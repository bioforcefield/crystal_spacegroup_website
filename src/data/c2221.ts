/** Space group 20 · C2221 — C-centred orthorhombic Sohncke (ITA). */

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

export const CELL: CellParams = { a: 1, b: 1.2, c: 1.4 }
export const SEED: Vec3 = [0.22, 0.15, 0.3]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold ‖ a,b', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4-fold', color: '#a5b4fc' },
  screw: { id: 'screw', label: '2₁ screw ‖ a,b,c', color: '#a78bfa' },
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
  'twofold',
  'screw',
]

const RAW = buildOperatorsFromTriplets([
  'x,y,z',
  '-x,-y,z+1/2',
  'x,-y,-z',
  '-x,y,-z+1/2',
  'x+1/2,y+1/2,z',
  '-x+1/2,-y+1/2,z+1/2',
  'x+1/2,-y+1/2,-z',
  '-x+1/2,y+1/2,-z+1/2',
])

export const OPERATORS: Operator[] = RAW.map((op) => {
  switch (op.index) {
    case 1:
      return { ...op, seitz: '{1 | 0}' }
    case 2:
      return { ...op, label: '2₁ screw ‖ c', classId: 'screw', seitz: '{2₀₀₁ | 0,0,½}' }
    case 3:
      return { ...op, label: '2-fold ‖ a', classId: 'twofold', seitz: '{2₁₀₀ | 0}' }
    case 4:
      return { ...op, label: '2-fold ‖ b', classId: 'twofold', seitz: '{2₀₁₀ | 0,0,½}' }
    case 5:
      return { ...op, label: 'C-centring', classId: 'identity', seitz: '{1 | ½,½,0}' }
    case 6:
      return { ...op, label: '2₁ screw ‖ c (C)', classId: 'screw' }
    case 7:
      return { ...op, label: '2₁ screw ‖ a', classId: 'screw' }
    case 8:
      return { ...op, label: '2₁ screw ‖ b', classId: 'screw' }
    default:
      return op
  }
})

export const META: SpaceGroupMeta = {
  number: 20,
  hm: 'C2221',
  system: 'orthorhombic',
  pointGroup: '222',
  lattice: 'C-centred',
  multiplicity: 8,
  blurb:
    'C2221 (~0.2% of CSD) is a C-centred Sohncke orthorhombic group: 2₁ ‖ c with pure 2-folds ‖ a and ‖ b, plus C-centring that generates further 2₁ axes. All operations proper — L-marker handedness preserved.',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  { origin: [0, 0, 0], direction: [0, 0, 1], locus: '(0, 0, z)', opIndex: 2, primary: true, kind: '21' },
  { origin: [0.5, 0.5, 0], direction: [0, 0, 1], locus: '(½, ½, z)', opIndex: 6, primary: false, kind: '21' },
  { origin: [0, 0, 0], direction: [1, 0, 0], locus: '(x, 0, 0)', opIndex: 3, primary: true, kind: '2' },
  { origin: [0, 0.5, 0.5], direction: [1, 0, 0], locus: '(x, ½, ½)', opIndex: 7, primary: false, kind: '21' },
  { origin: [0, 0, 0.25], direction: [0, 1, 0], locus: '(0, y, ¼)', opIndex: 4, primary: true, kind: '2' },
  { origin: [0.5, 0, 0.25], direction: [0, 1, 0], locus: '(½, y, ¼)', opIndex: 8, primary: false, kind: '21' },
]

export function elementLocusForOp(opIndex: number): string | null {
  const map: Record<number, string | null> = {
    1: null,
    2: '2₁ axis at (0, 0, z)',
    3: '2-fold axis at (x, 0, 0)',
    4: '2-fold axis at (0, y, ¼)',
    5: 'C-centring translation (½, ½, 0)',
    6: '2₁ axis at (½, ½, z)',
    7: '2₁ axis ‖ a (C-related)',
    8: '2₁ axis ‖ b (C-related)',
  }
  return map[opIndex] ?? null
}

export const c2221Demo: SpaceGroupDemo = {
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
  shortName: 'C2221',
}
