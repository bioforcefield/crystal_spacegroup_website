/** Space group 9 · Cc — monoclinic, unique axis b, cell choice 1 (ITA). */

import type {
  CellParams,
  GlidePlaneSpec,
  Operator,
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
  'c-glide': { id: 'c-glide', label: 'c-glide ⊥ b', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide ⊥ b', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

/** Legend — identity (incl. C-centring) + c- and n-glides. */
export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'c-glide',
  'n-glide',
]

/**
 * General positions for Cc (No. 9), multiplicity 4.
 * C-centring expanded; unique axis b, cell choice 1.
 * Polar point group m — no 2-fold, no inversion.
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
    triplet: 'x, −y, z+½',
    label: 'c-glide ⊥ b',
    classId: 'c-glide',
    R: [
      [1, 0, 0],
      [0, -1, 0],
      [0, 0, 1],
    ],
    t: [0, 0, 0.5],
    seitz: '{m₀₁₀ | 0,0,½}',
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
    triplet: 'x+½, −y+½, z+½',
    label: 'n-glide ⊥ b',
    classId: 'n-glide',
    R: [
      [1, 0, 0],
      [0, -1, 0],
      [0, 0, 1],
    ],
    t: [0.5, 0.5, 0.5],
    seitz: '{m₀₁₀ | ½,½,½}',
  },
]

export const META: SpaceGroupMeta = {
  number: 9,
  hm: 'Cc',
  system: 'monoclinic',
  pointGroup: 'm',
  lattice: 'C-centred',
  multiplicity: 4,
  blurb:
    'Cc is the common non-centrosymmetric C-centred monoclinic group (~1.0% of CSD). Unique axis b: a c-glide ⊥ b plus C-centring that generates an n-glide at y = ¼ — same glide story as C2/c, but without the 2-fold or inversion, so the crystal is polar (point group m). Teaching cell uses β ≈ 110°.',
}

/**
 * Op2 c-glide: R reflects y, t=(0,0,½) → plane y=0, glide c.
 * Op4 n-glide: R reflects y, t=(½,½,½) → plane y=¼, glide (½,0,½).
 */
const GLIDE_PLANES: GlidePlaneSpec[] = [
  {
    planeValue: 0,
    normalAxis: 1,
    glide: [0, 0, 0.5],
    label: 'c-glide',
    classId: 'c-glide',
    opIndex: 2,
    primary: true,
    locus: 'y = 0, glide (0, 0, ½)',
  },
  {
    planeValue: 0.5,
    normalAxis: 1,
    glide: [0, 0, 0.5],
    label: 'c-glide',
    classId: 'c-glide',
    opIndex: 2,
    primary: false,
    locus: 'y = ½, glide (0, 0, ½)',
  },
  {
    planeValue: 0.25,
    normalAxis: 1,
    glide: [0.5, 0, 0.5],
    label: 'n-glide',
    classId: 'n-glide',
    opIndex: 4,
    primary: true,
    locus: 'y = ¼, glide (½, 0, ½)',
  },
  {
    planeValue: 0.75,
    normalAxis: 1,
    glide: [0.5, 0, 0.5],
    label: 'n-glide',
    classId: 'n-glide',
    opIndex: 4,
    primary: false,
    locus: 'y = ¾, glide (½, 0, ½)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  switch (opIndex) {
    case 1:
      return null
    case 2:
      return 'c-glide plane y = 0 · glide (0, 0, ½)'
    case 3:
      return 'C-centring translation (½, ½, 0)'
    case 4:
      return 'n-glide plane y = ¼ · glide (½, 0, ½)'
    default:
      return null
  }
}

export const ccDemo: SpaceGroupDemo = {
  meta: META,
  cell: CELL,
  seed: SEED,
  operators: OPERATORS,
  symmetryClasses: SYMMETRY_CLASSES,
  classLegendOrder: CLASS_LEGEND_ORDER,
  screwAxes: [],
  inversionCenters: [],
  glidePlanes: GLIDE_PLANES,
  elementLocusForOp,
  defaultProjection: 'b',
  /** No inversion; sentinel matches generatedDemo fallback. */
  primaryInversionOp: 1,
  shortName: 'Cc',
}
