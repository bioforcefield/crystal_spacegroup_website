/** Space group 92 · P41212 — tetragonal Sohncke (ITA). */

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
  twofold: { id: 'twofold', label: '2-fold ⊥ c', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4-fold', color: '#a5b4fc' },
  sixfold: { id: 'sixfold', label: '6-fold', color: '#818cf8' },
  screw: { id: 'screw', label: '4₁ / 2₁ ‖ c,a,b', color: '#a78bfa' },
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
  'screw',
  'twofold',
]

const RAW = buildOperatorsFromTriplets([
  'x,y,z',
  '-y+1/2,x+1/2,z+1/4',
  '-x,-y,z+1/2',
  'y+1/2,-x+1/2,z+3/4',
  'x+1/2,-y+1/2,-z+3/4',
  '-y,-x,-z+1/2',
  '-x+1/2,y+1/2,-z+1/4',
  'y,x,-z',
])

export const OPERATORS: Operator[] = RAW.map((op) => {
  switch (op.index) {
    case 1:
      return { ...op, seitz: '{1 | 0}' }
    case 2:
      return { ...op, label: '4₁ screw ‖ c', classId: 'screw', seitz: '{4₀₀₁ | ½,½,¼}' }
    case 3:
      return { ...op, label: '2₁ screw ‖ c', classId: 'screw', seitz: '{2₀₀₁ | 0,0,½}' }
    case 4:
      return { ...op, label: '4₁³ screw ‖ c', classId: 'screw', seitz: '{4₀₀₁³ | ½,½,¾}' }
    case 5:
      return { ...op, label: '2₁ screw ‖ a', classId: 'screw' }
    case 6:
      return { ...op, label: '2-fold ⊥ c (diag)', classId: 'twofold' }
    case 7:
      return { ...op, label: '2₁ screw ‖ b', classId: 'screw' }
    case 8:
      return { ...op, label: '2-fold ⊥ c (diag)', classId: 'twofold' }
    default:
      return op
  }
})

export const META: SpaceGroupMeta = {
  number: 92,
  hm: 'P41212',
  system: 'tetragonal',
  pointGroup: '422',
  lattice: 'Primitive',
  multiplicity: 8,
  blurb:
    'P41212 (~0.19% of CSD) is a chiral tetragonal Sohncke group: 4₁ ‖ c with 2₁ screws in the basal plane and diagonal 2-folds. Enantiomorph of P43212 (96). All operations proper — ideal for teaching 4₁ screws.',
}

/** 4₁ axis: for −y+½,x+½,z+¼ → x0+y0=½, −x0+y0=½ → y0=½, x0=0 → (0,½,z)? 
 *  x'=−y+1/2, y'=x+1/2 → x0+y0=1/2, −x0+y0=1/2 → 2y0=1 → y0=1/2, x0=0.
 */
const SCREW_AXES: ScrewAxisSpec[] = [
  { origin: [0, 0.5, 0], direction: [0, 0, 1], locus: '(0, ½, z)', opIndex: 2, primary: true, kind: '41' },
  { origin: [0.5, 0, 0], direction: [0, 0, 1], locus: '(½, 0, z)', opIndex: 2, primary: false, kind: '41' },
  { origin: [0, 0, 0], direction: [0, 0, 1], locus: '(0, 0, z)', opIndex: 3, primary: true, kind: '21' },
  { origin: [0.5, 0.5, 0], direction: [0, 0, 1], locus: '(½, ½, z)', opIndex: 3, primary: false, kind: '21' },
  { origin: [0.25, 0.25, 0], direction: [1, 0, 0], locus: '(x, ¼, ~)', opIndex: 5, primary: true, kind: '21' },
  { origin: [0.25, 0, 0], direction: [0, 1, 0], locus: '(¼, y, ~)', opIndex: 7, primary: true, kind: '21' },
]

export function elementLocusForOp(opIndex: number): string | null {
  const map: Record<number, string | null> = {
    1: null,
    2: '4₁ axis at (0, ½, z)',
    3: '2₁ axis at (0, 0, z)',
    4: '4₁³ axis ‖ c',
    5: '2₁ axis ‖ a',
    6: '2-fold (diagonal)',
    7: '2₁ axis ‖ b',
    8: '2-fold (diagonal)',
  }
  return map[opIndex] ?? null
}

export const p41212Demo: SpaceGroupDemo = {
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
  shortName: 'P41212',
}
