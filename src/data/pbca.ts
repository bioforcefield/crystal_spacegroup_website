/** Space group 61 · Pbca — interactive teaching demo (ITA conventional). */

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
import {
  applyOperator,
  fracToCart,
  isImproper,
} from './math'
import type { GeneralPoint } from './types'

export type {
  Vec3,
  CellParams,
  SymmetryClassId,
  SymmetryClass,
  Operator,
  SpaceGroupMeta,
  Mat3,
  GeneralPoint,
  SpaceGroupDemo,
} from './types'

export {
  det3,
  isImproper,
  properBasis,
  wrap01,
  applyOperator,
  applyOperatorRaw,
  addFrac,
  fracToCart,
  colorByHeight,
} from './math'

/** Teaching orthorhombic proportions (not a physical crystal). */
export const CELL: CellParams = { a: 1, b: 1.2, c: 1.5 }

/** Seed point in the asymmetric unit (fractional coordinates). */
export const SEED: Vec3 = [0.22, 0.15, 0.3]

/** Teaching palette — one distinct color per class shown in the legend. */
export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold', color: '#c4b5fd' },
  screw: { id: 'screw', label: '2₁ screw', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide', color: '#2dd4bf' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'screw',
  'inversion',
  'a-glide',
  'b-glide',
  'c-glide',
]

export const OPERATORS: Operator[] = [
  {
    index: 1,
    triplet: 'x, y, z',
    label: 'Identity',
    classId: 'identity',
    R: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    t: [0, 0, 0],
    seitz: '{1 | 0}',
  },
  {
    index: 2,
    triplet: '−x+½, −y, z+½',
    label: '2₁ screw ‖ c',
    classId: 'screw',
    R: [
      [-1, 0, 0],
      [0, -1, 0],
      [0, 0, 1],
    ],
    t: [0.5, 0, 0.5],
    seitz: '{2₀₀₁ | ½,0,½}',
  },
  {
    index: 3,
    triplet: '−x, y+½, −z+½',
    label: '2₁ screw ‖ b',
    classId: 'screw',
    R: [
      [-1, 0, 0],
      [0, 1, 0],
      [0, 0, -1],
    ],
    t: [0, 0.5, 0.5],
    seitz: '{2₀₁₀ | 0,½,½}',
  },
  {
    index: 4,
    triplet: 'x+½, −y+½, −z',
    label: '2₁ screw ‖ a',
    classId: 'screw',
    R: [
      [1, 0, 0],
      [0, -1, 0],
      [0, 0, -1],
    ],
    t: [0.5, 0.5, 0],
    seitz: '{2₁₀₀ | ½,½,0}',
  },
  {
    index: 5,
    triplet: '−x, −y, −z',
    label: 'Inversion (−1)',
    classId: 'inversion',
    R: [
      [-1, 0, 0],
      [0, -1, 0],
      [0, 0, -1],
    ],
    t: [0, 0, 0],
    seitz: '{-1 | 0}',
  },
  {
    index: 6,
    triplet: 'x+½, y, −z+½',
    label: 'a-glide ⊥ c',
    classId: 'a-glide',
    R: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, -1],
    ],
    t: [0.5, 0, 0.5],
    seitz: '{m₀₀₁ | ½,0,½}',
  },
  {
    index: 7,
    triplet: 'x, −y+½, z+½',
    label: 'c-glide ⊥ b',
    classId: 'c-glide',
    R: [
      [1, 0, 0],
      [0, -1, 0],
      [0, 0, 1],
    ],
    t: [0, 0.5, 0.5],
    seitz: '{m₀₁₀ | 0,½,½}',
  },
  {
    index: 8,
    triplet: '−x+½, y+½, z',
    label: 'b-glide ⊥ a',
    classId: 'b-glide',
    R: [
      [-1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    t: [0.5, 0.5, 0],
    seitz: '{m₁₀₀ | ½,½,0}',
  },
]

export const META: SpaceGroupMeta = {
  number: 61,
  hm: 'Pbca',
  system: 'orthorhombic',
  pointGroup: 'mmm',
  lattice: 'primitive (P)',
  multiplicity: 8,
  blurb:
    'Pbca is centrosymmetric orthorhombic: a b-glide ⊥ a, a c-glide ⊥ b, and an a-glide ⊥ c. Those three glides generate eight general positions (and three 2₁ screws + an inversion). Each site shows a chiral L-marker so screws twist it and glides/inversion flip its handedness.',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  {
    origin: [0.25, 0, 0],
    direction: [0, 0, 1],
    locus: '(¼, 0, z)',
    opIndex: 2,
    primary: true,
    kind: '21',
  },
  {
    origin: [0.75, 0.5, 0],
    direction: [0, 0, 1],
    locus: '(¾, ½, z)',
    opIndex: 2,
    primary: false,
    kind: '21',
  },
  {
    origin: [0, 0, 0.25],
    direction: [0, 1, 0],
    locus: '(0, y, ¼)',
    opIndex: 3,
    primary: true,
    kind: '21',
  },
  {
    origin: [0.5, 0, 0.75],
    direction: [0, 1, 0],
    locus: '(½, y, ¾)',
    opIndex: 3,
    primary: false,
    kind: '21',
  },
  {
    origin: [0, 0.25, 0],
    direction: [1, 0, 0],
    locus: '(x, ¼, 0)',
    opIndex: 4,
    primary: true,
    kind: '21',
  },
  {
    origin: [0, 0.75, 0.5],
    direction: [1, 0, 0],
    locus: '(x, ¾, ½)',
    opIndex: 4,
    primary: false,
    kind: '21',
  },
]

const INVERSION_CENTERS: InversionCenterSpec[] = (
  [
    [0, 0, 0],
    [0.5, 0, 0],
    [0, 0.5, 0],
    [0, 0, 0.5],
    [0.5, 0.5, 0],
    [0.5, 0, 0.5],
    [0, 0.5, 0.5],
    [0.5, 0.5, 0.5],
  ] as Vec3[]
).map((position) => {
  const primary =
    position[0] === 0 && position[1] === 0 && position[2] === 0
  const fmt = (v: number) => (v === 0 ? '0' : v === 0.5 ? '½' : String(v))
  return {
    position,
    primary,
    locus: `(${fmt(position[0])}, ${fmt(position[1])}, ${fmt(position[2])})`,
  }
})

const GLIDE_PLANES: GlidePlaneSpec[] = [
  {
    planeValue: 0.25,
    normalAxis: 2,
    glide: [0.5, 0, 0],
    label: 'a-glide',
    classId: 'a-glide',
    opIndex: 6,
    primary: true,
    locus: 'z = ¼, glide (½, 0, 0)',
  },
  {
    planeValue: 0.75,
    normalAxis: 2,
    glide: [0.5, 0, 0],
    label: 'a-glide',
    classId: 'a-glide',
    opIndex: 6,
    primary: false,
    locus: 'z = ¾, glide (½, 0, 0)',
  },
  {
    planeValue: 0.25,
    normalAxis: 1,
    glide: [0, 0, 0.5],
    label: 'c-glide',
    classId: 'c-glide',
    opIndex: 7,
    primary: true,
    locus: 'y = ¼, glide (0, 0, ½)',
  },
  {
    planeValue: 0.75,
    normalAxis: 1,
    glide: [0, 0, 0.5],
    label: 'c-glide',
    classId: 'c-glide',
    opIndex: 7,
    primary: false,
    locus: 'y = ¾, glide (0, 0, ½)',
  },
  {
    planeValue: 0.25,
    normalAxis: 0,
    glide: [0, 0.5, 0],
    label: 'b-glide',
    classId: 'b-glide',
    opIndex: 8,
    primary: true,
    locus: 'x = ¼, glide (0, ½, 0)',
  },
  {
    planeValue: 0.75,
    normalAxis: 0,
    glide: [0, 0.5, 0],
    label: 'b-glide',
    classId: 'b-glide',
    opIndex: 8,
    primary: false,
    locus: 'x = ¾, glide (0, ½, 0)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  switch (opIndex) {
    case 1:
      return null
    case 2:
      return '2₁ axis at (¼, 0, z)'
    case 3:
      return '2₁ axis at (0, y, ¼)'
    case 4:
      return '2₁ axis at (x, ¼, 0)'
    case 5:
      return 'inversion at (0, 0, 0) · others at 0/½'
    case 6:
      return 'a-glide plane z = ¼ · glide (½, 0, 0)'
    case 7:
      return 'c-glide plane y = ¼ · glide (0, 0, ½)'
    case 8:
      return 'b-glide plane x = ¼ · glide (0, ½, 0)'
    default:
      return null
  }
}

/** Backward-compat wrappers used by older call sites. */
export function classColor(classId: SymmetryClassId): string {
  return SYMMETRY_CLASSES[classId].color
}

export function operatorClass(op: Operator): SymmetryClass {
  return SYMMETRY_CLASSES[op.classId]
}

export function generalPositions(
  seed: Vec3 = SEED,
  cell: CellParams = CELL,
): GeneralPoint[] {
  return OPERATORS.map((op) => {
    const fractional = applyOperator(op, seed)
    return {
      index: op.index,
      fractional,
      cartesian: fracToCart(fractional, cell),
      operator: op,
      improper: isImproper(op.R),
      classId: op.classId,
      classColor: classColor(op.classId),
    }
  })
}

export const pbcaDemo: SpaceGroupDemo = {
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
  primaryInversionOp: 5,
  shortName: 'Pbca',
}
