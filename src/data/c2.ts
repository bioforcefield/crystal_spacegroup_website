/** Space group 5 · C2 — monoclinic, unique axis b, cell choice 1 (ITA). */

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
  threefold: { id: 'threefold', label: '3-fold', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4-fold', color: '#a5b4fc' },
  screw: { id: 'screw', label: '2₁ screw ‖ b', color: '#a78bfa' },
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
  'screw',
]

/**
 * General positions for C2 (No. 5), multiplicity 4.
 * C-centring expanded; unique axis b. Sohncke (chiral) monoclinic — no improper ops.
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
    triplet: '−x, y, −z',
    label: '2-fold ‖ b',
    classId: 'twofold',
    R: [
      [-1, 0, 0],
      [0, 1, 0],
      [0, 0, -1],
    ],
    t: [0, 0, 0],
    seitz: '{2₀₁₀ | 0}',
  },
  {
    index: 3,
    triplet: 'x+½, y+½, z',
    label: 'C-centring',
    classId: 'identity',
    R: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    t: [0.5, 0.5, 0],
    seitz: '{1 | ½,½,0}',
  },
  {
    index: 4,
    triplet: '−x+½, y+½, −z',
    label: '2₁ screw ‖ b',
    classId: 'screw',
    R: [
      [-1, 0, 0],
      [0, 1, 0],
      [0, 0, -1],
    ],
    t: [0.5, 0.5, 0],
    seitz: '{2₀₁₀ | ½,½,0}',
  },
]

export const META: SpaceGroupMeta = {
  number: 5,
  hm: 'C2',
  system: 'monoclinic',
  pointGroup: '2',
  lattice: 'C-centred',
  multiplicity: 4,
  blurb:
    'C2 is the common C-centred monoclinic Sohncke group (~0.9% of CSD): a pure 2-fold ‖ b plus C-centring that generates a 2₁ ‖ b. No inversion, mirrors, or glides — every operation is proper (L-marker handedness preserved). Teaching contrast with centrosymmetric C2/c; cell uses β ≈ 110°.',
}

/**
 * 2 ‖ b at (0,y,0) and C-related (½,y,0); 2₁ ‖ b at (¼,y,0) and (¾,y,0).
 */
const SCREW_AXES: ScrewAxisSpec[] = [
  {
    origin: [0, 0, 0],
    direction: [0, 1, 0],
    locus: '(0, y, 0)',
    opIndex: 2,
    primary: true,
    kind: '2',
  },
  {
    origin: [0.5, 0, 0],
    direction: [0, 1, 0],
    locus: '(½, y, 0)',
    opIndex: 2,
    primary: false,
    kind: '2',
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
    origin: [0.75, 0, 0],
    direction: [0, 1, 0],
    locus: '(¾, y, 0)',
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
      return '2-fold axis at (0, y, 0)'
    case 3:
      return 'C-centring translation (½, ½, 0)'
    case 4:
      return '2₁ axis at (¼, y, 0)'
    default:
      return null
  }
}

export const c2Demo: SpaceGroupDemo = {
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
  primaryInversionOp: 1,
  shortName: 'C2',
}
