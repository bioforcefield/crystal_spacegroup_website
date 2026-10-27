/** Space group 15 · C2/c — monoclinic, unique axis b, cell choice 1 (ITA). */

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

/** Teaching monoclinic proportions (β ≠ 90°). */
export const CELL: CellParams = { a: 1, b: 1.15, c: 1.35, betaDeg: 110 }

/** Seed off special positions (fractional). */
export const SEED: Vec3 = [0.18, 0.22, 0.31]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold ‖ b', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4-fold', color: '#a5b4fc' },
  sixfold: { id: 'sixfold', label: '6-fold', color: '#818cf8' },
  screw: { id: 'screw', label: '2₁ screw ‖ b', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  mirror: { id: 'mirror', label: 'mirror', color: '#facc15' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide ⊥ b', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide ⊥ b', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'twofold',
  'screw',
  'inversion',
  'c-glide',
  'n-glide',
]

/**
 * General positions for C2/c (No. 15), multiplicity 8.
 * C-centring expanded; unique axis b, cell choice 1.
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
    triplet: '−x, y, −z+½',
    label: '2-fold ‖ b',
    classId: 'twofold',
    R: [
      [-1, 0, 0],
      [0, 1, 0],
      [0, 0, -1],
    ],
    t: [0, 0, 0.5],
    seitz: '{2₀₁₀ | 0,0,½}',
  },
  {
    index: 3,
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
    index: 4,
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
    index: 5,
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
    index: 6,
    triplet: '−x+½, y+½, −z+½',
    label: '2₁ screw ‖ b',
    classId: 'screw',
    R: [
      [-1, 0, 0],
      [0, 1, 0],
      [0, 0, -1],
    ],
    t: [0.5, 0.5, 0.5],
    seitz: '{2₀₁₀ | ½,½,½}',
  },
  {
    index: 7,
    triplet: '−x+½, −y+½, −z',
    label: 'Inversion at ¼,¼,0',
    classId: 'inversion',
    R: [
      [-1, 0, 0],
      [0, -1, 0],
      [0, 0, -1],
    ],
    t: [0.5, 0.5, 0],
    seitz: '{-1 | ½,½,0}',
  },
  {
    index: 8,
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
  number: 15,
  hm: 'C2/c',
  system: 'monoclinic',
  pointGroup: '2/m',
  lattice: 'C-centred',
  multiplicity: 8,
  blurb:
    'C2/c is the most common centrosymmetric monoclinic group in molecular crystals. Unique axis b: a 2-fold ‖ b, a c-glide ⊥ b, plus C-centring that generates a 2₁ ‖ b and an n-glide at y = ¼. Teaching cell uses β ≈ 110° so the ac face is a parallelogram.',
}

/** 2 ‖ b at (0,y,¼) and C-related (½,y,¼); 2₁ ‖ b at (¼,y,¼) and (¾,y,¼). */
const SCREW_AXES: ScrewAxisSpec[] = [
  {
    origin: [0, 0, 0.25],
    direction: [0, 1, 0],
    locus: '(0, y, ¼)',
    opIndex: 2,
    primary: true,
    kind: '2',
  },
  {
    origin: [0.5, 0, 0.25],
    direction: [0, 1, 0],
    locus: '(½, y, ¼)',
    opIndex: 2,
    primary: false,
    kind: '2',
  },
  {
    origin: [0.25, 0, 0.25],
    direction: [0, 1, 0],
    locus: '(¼, y, ¼)',
    opIndex: 6,
    primary: true,
    kind: '21',
  },
  {
    origin: [0.75, 0, 0.25],
    direction: [0, 1, 0],
    locus: '(¾, y, ¼)',
    opIndex: 6,
    primary: false,
    kind: '21',
  },
]

function fmtFrac(v: number): string {
  if (Math.abs(v) < 1e-9) return '0'
  if (Math.abs(v - 0.25) < 1e-9) return '¼'
  if (Math.abs(v - 0.5) < 1e-9) return '½'
  if (Math.abs(v - 0.75) < 1e-9) return '¾'
  return String(v)
}

const INVERSION_POSITIONS: Vec3[] = [
  [0, 0, 0],
  [0, 0, 0.5],
  [0.5, 0.5, 0],
  [0.5, 0.5, 0.5],
  [0.25, 0.25, 0],
  [0.25, 0.25, 0.5],
  [0.75, 0.75, 0],
  [0.75, 0.75, 0.5],
]

const INVERSION_CENTERS: InversionCenterSpec[] = INVERSION_POSITIONS.map(
  (position) => {
    const primary =
      position[0] === 0 && position[1] === 0 && position[2] === 0
    return {
      position,
      primary,
      locus: `(${fmtFrac(position[0])}, ${fmtFrac(position[1])}, ${fmtFrac(position[2])})`,
    }
  },
)

/**
 * Op4 c-glide: R reflects y, t=(0,0,½) → plane y=0, glide c.
 * Op8 n-glide: R reflects y, t=(½,½,½) → plane y=¼, glide (½,0,½).
 */
const GLIDE_PLANES: GlidePlaneSpec[] = [
  {
    planeValue: 0,
    normalAxis: 1,
    glide: [0, 0, 0.5],
    label: 'c-glide',
    classId: 'c-glide',
    opIndex: 4,
    primary: true,
    locus: 'y = 0, glide (0, 0, ½)',
  },
  {
    planeValue: 0.5,
    normalAxis: 1,
    glide: [0, 0, 0.5],
    label: 'c-glide',
    classId: 'c-glide',
    opIndex: 4,
    primary: false,
    locus: 'y = ½, glide (0, 0, ½)',
  },
  {
    planeValue: 0.25,
    normalAxis: 1,
    glide: [0.5, 0, 0.5],
    label: 'n-glide',
    classId: 'n-glide',
    opIndex: 8,
    primary: true,
    locus: 'y = ¼, glide (½, 0, ½)',
  },
  {
    planeValue: 0.75,
    normalAxis: 1,
    glide: [0.5, 0, 0.5],
    label: 'n-glide',
    classId: 'n-glide',
    opIndex: 8,
    primary: false,
    locus: 'y = ¾, glide (½, 0, ½)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  switch (opIndex) {
    case 1:
      return null
    case 2:
      return '2-fold axis at (0, y, ¼)'
    case 3:
      return 'inversion at (0, 0, 0)'
    case 4:
      return 'c-glide plane y = 0 · glide (0, 0, ½)'
    case 5:
      return 'C-centring translation (½, ½, 0)'
    case 6:
      return '2₁ axis at (¼, y, ¼)'
    case 7:
      return 'inversion at (¼, ¼, 0)'
    case 8:
      return 'n-glide plane y = ¼ · glide (½, 0, ½)'
    default:
      return null
  }
}

export const c2cDemo: SpaceGroupDemo = {
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
  defaultProjection: 'b',
  primaryInversionOp: 3,
  shortName: 'C2/c',
}
