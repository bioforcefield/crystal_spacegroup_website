/** Space group 60 · Pbcn — orthorhombic teaching demo (ITA conventional). */

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

/** Teaching orthorhombic proportions (not a physical crystal). */
export const CELL: CellParams = { a: 1, b: 1.2, c: 1.5 }

/** Seed off special positions (fractional). */
export const SEED: Vec3 = [0.22, 0.15, 0.3]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold ‖ b', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold', color: '#67e8f9' },
  screw: { id: 'screw', label: '2₁ screw', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide ⊥ a', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide ⊥ b', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide ⊥ c', color: '#2dd4bf' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'twofold',
  'screw',
  'inversion',
  'b-glide',
  'c-glide',
  'n-glide',
]

/**
 * General positions for Pbcn (No. 60), multiplicity 8.
 * b-glide ⊥ a, c-glide ⊥ b, n-glide ⊥ c (+ 2 ‖ b, 2₁ ‖ a/c, inversion).
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
    triplet: '−x+½, −y+½, z+½',
    label: '2₁ screw ‖ c',
    classId: 'screw',
    R: [
      [-1, 0, 0],
      [0, -1, 0],
      [0, 0, 1],
    ],
    t: [0.5, 0.5, 0.5],
    seitz: '{2₀₀₁ | ½,½,½}',
  },
  {
    index: 3,
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
    index: 4,
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
    triplet: 'x+½, y+½, −z+½',
    label: 'n-glide ⊥ c',
    classId: 'n-glide',
    R: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, -1],
    ],
    t: [0.5, 0.5, 0.5],
    seitz: '{m₀₀₁ | ½,½,½}',
  },
  {
    index: 7,
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
  {
    index: 8,
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
]

export const META: SpaceGroupMeta = {
  number: 60,
  hm: 'Pbcn',
  system: 'orthorhombic',
  pointGroup: 'mmm',
  lattice: 'primitive (P)',
  multiplicity: 8,
  blurb:
    'Pbcn is a centrosymmetric orthorhombic group (~0.8% of CSD): a b-glide ⊥ a, a c-glide ⊥ b, and an n-glide ⊥ c. Those generate a pure 2-fold ‖ b, 2₁ screws ‖ a and c, plus inversion — eight general positions. Close cousin of Pbca with an n-glide in place of the a-glide ⊥ c.',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  {
    origin: [0.25, 0.25, 0],
    direction: [0, 0, 1],
    locus: '(¼, ¼, z)',
    opIndex: 2,
    primary: true,
    kind: '21',
  },
  {
    origin: [0.75, 0.75, 0],
    direction: [0, 0, 1],
    locus: '(¾, ¾, z)',
    opIndex: 2,
    primary: false,
    kind: '21',
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
    origin: [0, 0, 0.25],
    direction: [0, 1, 0],
    locus: '(0, y, ¼)',
    opIndex: 4,
    primary: true,
    kind: '2',
  },
  {
    origin: [0.5, 0, 0.25],
    direction: [0, 1, 0],
    locus: '(½, y, ¼)',
    opIndex: 4,
    primary: false,
    kind: '2',
  },
]

function fmtFrac(v: number): string {
  if (Math.abs(v) < 1e-9) return '0'
  if (Math.abs(v - 0.25) < 1e-9) return '¼'
  if (Math.abs(v - 0.5) < 1e-9) return '½'
  if (Math.abs(v - 0.75) < 1e-9) return '¾'
  return String(v)
}

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
  return {
    position,
    primary,
    locus: `(${fmtFrac(position[0])}, ${fmtFrac(position[1])}, ${fmtFrac(position[2])})`,
  }
})

const GLIDE_PLANES: GlidePlaneSpec[] = [
  {
    planeValue: 0.25,
    normalAxis: 0,
    glide: [0, 0.5, 0],
    label: 'b-glide',
    classId: 'b-glide',
    opIndex: 7,
    primary: true,
    locus: 'x = ¼, glide (0, ½, 0)',
  },
  {
    planeValue: 0.75,
    normalAxis: 0,
    glide: [0, 0.5, 0],
    label: 'b-glide',
    classId: 'b-glide',
    opIndex: 7,
    primary: false,
    locus: 'x = ¾, glide (0, ½, 0)',
  },
  {
    planeValue: 0,
    normalAxis: 1,
    glide: [0, 0, 0.5],
    label: 'c-glide',
    classId: 'c-glide',
    opIndex: 8,
    primary: true,
    locus: 'y = 0, glide (0, 0, ½)',
  },
  {
    planeValue: 0.5,
    normalAxis: 1,
    glide: [0, 0, 0.5],
    label: 'c-glide',
    classId: 'c-glide',
    opIndex: 8,
    primary: false,
    locus: 'y = ½, glide (0, 0, ½)',
  },
  {
    planeValue: 0.25,
    normalAxis: 2,
    glide: [0.5, 0.5, 0],
    label: 'n-glide',
    classId: 'n-glide',
    opIndex: 6,
    primary: true,
    locus: 'z = ¼, glide (½, ½, 0)',
  },
  {
    planeValue: 0.75,
    normalAxis: 2,
    glide: [0.5, 0.5, 0],
    label: 'n-glide',
    classId: 'n-glide',
    opIndex: 6,
    primary: false,
    locus: 'z = ¾, glide (½, ½, 0)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  switch (opIndex) {
    case 1:
      return null
    case 2:
      return '2₁ axis at (¼, ¼, z)'
    case 3:
      return '2₁ axis at (x, ¼, 0)'
    case 4:
      return '2-fold axis at (0, y, ¼)'
    case 5:
      return 'inversion at (0, 0, 0) · others at 0/½'
    case 6:
      return 'n-glide plane z = ¼ · glide (½, ½, 0)'
    case 7:
      return 'b-glide plane x = ¼ · glide (0, ½, 0)'
    case 8:
      return 'c-glide plane y = 0 · glide (0, 0, ½)'
    default:
      return null
  }
}

export const pbcnDemo: SpaceGroupDemo = {
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
  shortName: 'Pbcn',
}
