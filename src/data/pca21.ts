/** Space group 29 · Pca2₁ — polar orthorhombic teaching demo (ITA conventional). */

import type {
  CellParams,
  GlidePlaneSpec,
  Operator,
  ScrewAxisSpec,
  SpaceGroupDemo,
  SpaceGroupMeta,
  SymmetryClass,
  SymmetryClassId,
  Vec3,
} from './types'

/** Teaching orthorhombic proportions (not a physical crystal). */
export const CELL: CellParams = { a: 1, b: 1.2, c: 1.5 }

/** Seed off special positions (fractional). */
export const SEED: Vec3 = [0.22, 0.15, 0.3]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4-fold', color: '#a5b4fc' },
  sixfold: { id: 'sixfold', label: '6-fold', color: '#818cf8' },
  screw: { id: 'screw', label: '2₁ screw ‖ c', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  mirror: { id: 'mirror', label: 'mirror', color: '#facc15' },
  'a-glide': { id: 'a-glide', label: 'a-glide ⊥ b', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide ⊥ a', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'screw',
  'c-glide',
  'a-glide',
]

/**
 * General positions for Pca2₁ (No. 29), multiplicity 4.
 * c-glide ⊥ a, a-glide ⊥ b, 2₁ ‖ c (polar mm2).
 */
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
    triplet: '−x, −y, z+½',
    label: '2₁ screw ‖ c',
    classId: 'screw',
    R: [
      [-1, 0, 0],
      [0, -1, 0],
      [0, 0, 1],
    ],
    t: [0, 0, 0.5],
    seitz: '{2₀₀₁ | 0,0,½}',
  },
  {
    index: 3,
    triplet: '−x+½, y, z+½',
    label: 'c-glide ⊥ a',
    classId: 'c-glide',
    R: [
      [-1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    t: [0.5, 0, 0.5],
    seitz: '{m₁₀₀ | ½,0,½}',
  },
  {
    index: 4,
    triplet: 'x+½, −y, z',
    label: 'a-glide ⊥ b',
    classId: 'a-glide',
    R: [
      [1, 0, 0],
      [0, -1, 0],
      [0, 0, 1],
    ],
    t: [0.5, 0, 0],
    seitz: '{m₀₁₀ | ½,0,0}',
  },
]

export const META: SpaceGroupMeta = {
  number: 29,
  hm: 'Pca21',
  system: 'orthorhombic',
  pointGroup: 'mm2',
  lattice: 'primitive (P)',
  multiplicity: 4,
  blurb:
    'Pca2₁ is a polar orthorhombic group (~0.8% of CSD): a c-glide ⊥ a, an a-glide ⊥ b, and a 2₁ screw ‖ c. No inversion — same mm2 point group as Pna21, but with axial c- and a-glides instead of n + a. Four general positions; L-markers flip under the glides.',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  {
    origin: [0, 0, 0],
    direction: [0, 0, 1],
    locus: '(0, 0, z)',
    opIndex: 2,
    primary: true,
    kind: '21',
  },
  {
    origin: [0.5, 0.5, 0],
    direction: [0, 0, 1],
    locus: '(½, ½, z)',
    opIndex: 2,
    primary: false,
    kind: '21',
  },
]

const GLIDE_PLANES: GlidePlaneSpec[] = [
  {
    planeValue: 0.25,
    normalAxis: 0,
    glide: [0, 0, 0.5],
    label: 'c-glide',
    classId: 'c-glide',
    opIndex: 3,
    primary: true,
    locus: 'x = ¼, glide (0, 0, ½)',
  },
  {
    planeValue: 0.75,
    normalAxis: 0,
    glide: [0, 0, 0.5],
    label: 'c-glide',
    classId: 'c-glide',
    opIndex: 3,
    primary: false,
    locus: 'x = ¾, glide (0, 0, ½)',
  },
  {
    planeValue: 0,
    normalAxis: 1,
    glide: [0.5, 0, 0],
    label: 'a-glide',
    classId: 'a-glide',
    opIndex: 4,
    primary: true,
    locus: 'y = 0, glide (½, 0, 0)',
  },
  {
    planeValue: 0.5,
    normalAxis: 1,
    glide: [0.5, 0, 0],
    label: 'a-glide',
    classId: 'a-glide',
    opIndex: 4,
    primary: false,
    locus: 'y = ½, glide (½, 0, 0)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  switch (opIndex) {
    case 1:
      return null
    case 2:
      return '2₁ axis at (0, 0, z)'
    case 3:
      return 'c-glide plane x = ¼ · glide (0, 0, ½)'
    case 4:
      return 'a-glide plane y = 0 · glide (½, 0, 0)'
    default:
      return null
  }
}

export const pca21Demo: SpaceGroupDemo = {
  meta: META,
  cell: CELL,
  seed: SEED,
  operators: OPERATORS,
  symmetryClasses: SYMMETRY_CLASSES,
  classLegendOrder: CLASS_LEGEND_ORDER,
  screwAxes: SCREW_AXES,
  inversionCenters: [],
  glidePlanes: GLIDE_PLANES,
  elementLocusForOp,
  defaultProjection: 'c',
  primaryInversionOp: 1,
  shortName: 'Pca21',
}
