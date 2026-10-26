/** Space group 18 · P21212 — orthorhombic teaching demo (ITA). */

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
  twofold: { id: 'twofold', label: '2-fold ‖ c', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold', color: '#67e8f9' },
  screw: { id: 'screw', label: '2₁ screw', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide', color: '#2dd4bf' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'twofold',
  'screw',
]

export const OPERATORS: Operator[] = buildOperatorsFromTriplets([
  'x, y, z',
  '−x, −y, z',
  'x+½, −y+½, −z',
  '−x+½, y+½, −z',
]).map((op) => {
  switch (op.index) {
    case 1:
      return { ...op, seitz: '{1 | 0}' }
    case 2:
      return {
        ...op,
        label: '2-fold ‖ c',
        classId: 'twofold',
        seitz: '{2₀₀₁ | 0}',
      }
    case 3:
      return {
        ...op,
        label: '2₁ screw ‖ a',
        classId: 'screw',
        seitz: '{2₁₀₀ | ½,½,0}',
      }
    case 4:
      return {
        ...op,
        label: '2₁ screw ‖ b',
        classId: 'screw',
        seitz: '{2₀₁₀ | ½,½,0}',
      }
    default:
      return op
  }
})

export const META: SpaceGroupMeta = {
  number: 18,
  hm: 'P21212',
  system: 'orthorhombic',
  pointGroup: '222',
  lattice: 'Primitive',
  multiplicity: 4,
  blurb:
    'P21212 (~0.4% of CSD) is the Sohncke sibling of P212121 with a pure 2-fold ‖ c plus 2₁ screws ‖ a and ‖ b. All operations proper — L-marker handedness preserved. Teaching contrast with P212121 (three 2₁ axes, no pure 2-fold).',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  {
    origin: [0, 0, 0],
    direction: [0, 0, 1],
    locus: '(0, 0, z)',
    opIndex: 2,
    primary: true,
    kind: '2',
  },
  {
    origin: [0.5, 0.5, 0],
    direction: [0, 0, 1],
    locus: '(½, ½, z)',
    opIndex: 2,
    primary: false,
    kind: '2',
  },
  {
    origin: [0, 0.25, 0],
    direction: [1, 0, 0],
    locus: '(x, ¼, 0)',
    opIndex: 3,
    primary: true,
    kind: '21',
  },
  {
    origin: [0, 0.75, 0.5],
    direction: [1, 0, 0],
    locus: '(x, ¾, ½)',
    opIndex: 3,
    primary: false,
    kind: '21',
  },
  {
    origin: [0.25, 0, 0],
    direction: [0, 1, 0],
    locus: '(¼, y, 0)',
    opIndex: 4,
    primary: true,
    kind: '21',
  },
  {
    origin: [0.75, 0, 0.5],
    direction: [0, 1, 0],
    locus: '(¾, y, ½)',
    opIndex: 4,
    primary: false,
    kind: '21',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  switch (opIndex) {
    case 1:
      return null
    case 2:
      return '2-fold axis at (0, 0, z)'
    case 3:
      return '2₁ axis at (x, ¼, 0)'
    case 4:
      return '2₁ axis at (¼, y, 0)'
    default:
      return null
  }
}

export const p21212Demo: SpaceGroupDemo = {
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
  shortName: 'P21212',
}
