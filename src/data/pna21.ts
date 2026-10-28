/** Space group 33 · Pna2₁ — polar orthorhombic teaching demo (ITA conventional). */

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
export const SEED: Vec3 = [0.13, 0.07, 0.07]

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
  'c-glide': { id: 'c-glide', label: 'c-glide', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide ⊥ a', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

/** Legend — only classes that appear in Pna2₁. */
export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'screw',
  'n-glide',
  'a-glide',
]

/**
 * General positions for Pna2₁ (No. 33), multiplicity 4.
 * Primitive; n-glide ⊥ a, a-glide ⊥ b, 2₁ ‖ c (polar mm2).
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
    triplet: '−x+½, y+½, z+½',
    label: 'n-glide ⊥ a',
    classId: 'n-glide',
    R: [
      [-1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    t: [0.5, 0.5, 0.5],
    seitz: '{m₁₀₀ | ½,½,½}',
  },
  {
    index: 4,
    triplet: 'x+½, −y+½, z',
    label: 'a-glide ⊥ b',
    classId: 'a-glide',
    R: [
      [1, 0, 0],
      [0, -1, 0],
      [0, 0, 1],
    ],
    t: [0.5, 0.5, 0],
    seitz: '{m₀₁₀ | ½,½,0}',
  },
]

export const META: SpaceGroupMeta = {
  number: 33,
  hm: 'Pna21',
  system: 'orthorhombic',
  pointGroup: 'mm2',
  lattice: 'primitive (P)',
  multiplicity: 4,
  blurb:
    'Pna2₁ is a polar orthorhombic group (~1.4% of CSD entries): an n-glide ⊥ a, an a-glide ⊥ b, and a 2₁ screw ‖ c. No inversion — the polar axis along c makes it a common setting for nonlinear-optic and polar molecular crystals. Four general positions; L-markers flip under the glides and twist under the screw.',
}

/**
 * 2₁ ‖ c at (0,0,z) and lattice-related (½,½,z).
 */
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

/**
 * n-glide ⊥ a at x=¼ (glide b+c); a-glide ⊥ b at y=¼ (glide a).
 * Secondary planes at ¾ keep diagram density comparable to Pbca.
 */
const GLIDE_PLANES: GlidePlaneSpec[] = [
  {
    planeValue: 0.25,
    normalAxis: 0,
    glide: [0, 0.5, 0.5],
    label: 'n-glide',
    classId: 'n-glide',
    opIndex: 3,
    primary: true,
    locus: 'x = ¼, glide (0, ½, ½)',
  },
  {
    planeValue: 0.75,
    normalAxis: 0,
    glide: [0, 0.5, 0.5],
    label: 'n-glide',
    classId: 'n-glide',
    opIndex: 3,
    primary: false,
    locus: 'x = ¾, glide (0, ½, ½)',
  },
  {
    planeValue: 0.25,
    normalAxis: 1,
    glide: [0.5, 0, 0],
    label: 'a-glide',
    classId: 'a-glide',
    opIndex: 4,
    primary: true,
    locus: 'y = ¼, glide (½, 0, 0)',
  },
  {
    planeValue: 0.75,
    normalAxis: 1,
    glide: [0.5, 0, 0],
    label: 'a-glide',
    classId: 'a-glide',
    opIndex: 4,
    primary: false,
    locus: 'y = ¾, glide (½, 0, 0)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  switch (opIndex) {
    case 1:
      return null
    case 2:
      return '2₁ axis at (0, 0, z)'
    case 3:
      return 'n-glide plane x = ¼ · glide (0, ½, ½)'
    case 4:
      return 'a-glide plane y = ¼ · glide (½, 0, 0)'
    default:
      return null
  }
}

export const pna21Demo: SpaceGroupDemo = {
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
  /** Along the polar 2₁ so glides read as lines in the ab projection. */
  defaultProjection: 'c',
  /** No inversion in this polar group; sentinel matches generatedDemo fallback. */
  primaryInversionOp: 1,
  shortName: 'Pna21',
}
