/** Space group 4 · P2₁ — monoclinic, unique axis b (ITA standard setting). */

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

/** Teaching monoclinic proportions (β ≠ 90°). */
export const CELL: CellParams = { a: 1, b: 1.15, c: 1.35, betaDeg: 110 }

/** Seed off special positions (fractional). */
export const SEED: Vec3 = [0.18, 0.22, 0.31]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold ‖ b', color: '#c4b5fd' },
  screw: { id: 'screw', label: '2₁ screw ‖ b', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide', color: '#2dd4bf' },
}

/** Legend — only identity + 2₁ appear. */
export const CLASS_LEGEND_ORDER: SymmetryClassId[] = ['identity', 'screw']

/**
 * General positions for P2₁ (No. 4), multiplicity 2.
 * Unique axis b: identity + 2₁ ‖ b (polar, point group 2).
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
    triplet: '−x, y+½, −z',
    label: '2₁ screw ‖ b',
    classId: 'screw',
    R: [
      [-1, 0, 0],
      [0, 1, 0],
      [0, 0, -1],
    ],
    t: [0, 0.5, 0],
    seitz: '{2₀₁₀ | 0,½,0}',
  },
]

export const META: SpaceGroupMeta = {
  number: 4,
  hm: 'P21',
  system: 'monoclinic',
  pointGroup: '2',
  lattice: 'Primitive',
  multiplicity: 2,
  blurb:
    'P2₁ is the most common polar monoclinic space group in the CSD (~5.2% of entries). Unique axis b: a single 2₁ screw ‖ b and no inversion, mirrors, or glides — every operation is proper, so L-marker handedness is preserved. Ideal bridge between P1 and the centrosymmetric workhorse P21/c.',
}

/**
 * 2₁ ‖ b at (0,y,0) and the classic lattice-related axis at (½,y,½).
 */
const SCREW_AXES: ScrewAxisSpec[] = [
  {
    origin: [0, 0, 0],
    direction: [0, 1, 0],
    locus: '(0, y, 0)',
    opIndex: 2,
    primary: true,
    kind: '21',
  },
  {
    origin: [0.5, 0, 0.5],
    direction: [0, 1, 0],
    locus: '(½, y, ½)',
    opIndex: 2,
    primary: false,
    kind: '21',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  switch (opIndex) {
    case 1:
      return null
    case 2:
      return '2₁ axis at (0, y, 0)'
    default:
      return null
  }
}

export const p21Demo: SpaceGroupDemo = {
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
  defaultProjection: 'b',
  /** No inversion; sentinel matches generatedDemo fallback. */
  primaryInversionOp: 1,
  shortName: 'P21',
}
