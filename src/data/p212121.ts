/** Space group 19 · P2₁2₁2₁ — chiral orthorhombic teaching demo (ITA origin choice 1). */

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

/** Teaching orthorhombic proportions (not a physical crystal). */
export const CELL: CellParams = { a: 1, b: 1.2, c: 1.5 }

/** Seed off axes in a general position (fractional). */
export const SEED: Vec3 = [0.22, 0.15, 0.3]

/** Teaching palette — only identity + 2₁ appear in the legend for this group. */
export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4-fold', color: '#a5b4fc' },
  screw: { id: 'screw', label: '2₁ screw', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = ['identity', 'screw']

/**
 * General positions for P2₁2₁2₁ (No. 19), multiplicity 4.
 * Origin choice 1 — three mutually perpendicular 2₁ screws; all proper.
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
]

export const META: SpaceGroupMeta = {
  number: 19,
  hm: 'P212121',
  system: 'orthorhombic',
  pointGroup: '222',
  lattice: 'primitive (P)',
  multiplicity: 4,
  blurb:
    'P2₁2₁2₁ is the most common Sohncke (enantiomorphous) space group in the CSD (~7% of entries). Three mutually perpendicular 2₁ screw axes — no inversion, mirrors, or glides — so every operation is proper and L-marker handedness is preserved. Ideal for teaching chirality in molecular crystals.',
}

/**
 * Primary + lattice-related secondary 2₁ loci (same families as Pbca’s screw set).
 */
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
    default:
      return null
  }
}

export const p212121Demo: SpaceGroupDemo = {
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
  /** No inversion in this Sohncke group; sentinel matches generatedDemo fallback. */
  primaryInversionOp: 1,
  shortName: 'P212121',
}
