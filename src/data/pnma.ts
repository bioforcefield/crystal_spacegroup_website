/** Space group 62 · Pnma — orthorhombic teaching demo (ITA conventional). */

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

/**
 * Palette: pure mirror ⊥ b reuses the c-glide class slot (no dedicated mirror id
 * in SymmetryClassId yet) with a teaching label — same convention as the generator.
 */
export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold', color: '#c4b5fd' },
  screw: { id: 'screw', label: '2₁ screw', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  'a-glide': { id: 'a-glide', label: 'a-glide ⊥ c', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'mirror ⊥ b', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide ⊥ a', color: '#2dd4bf' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'screw',
  'inversion',
  'n-glide',
  'c-glide',
  'a-glide',
]

/**
 * General positions for Pnma (No. 62), multiplicity 8.
 * n-glide ⊥ a, mirror ⊥ b, a-glide ⊥ c (+ generated 2₁ screws + inversion).
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
    triplet: 'x+½, −y+½, −z+½',
    label: '2₁ screw ‖ a',
    classId: 'screw',
    R: [
      [1, 0, 0],
      [0, -1, 0],
      [0, 0, -1],
    ],
    t: [0.5, 0.5, 0.5],
    seitz: '{2₁₀₀ | ½,½,½}',
  },
  {
    index: 4,
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
    index: 8,
    triplet: 'x, −y+½, z',
    label: 'mirror ⊥ b',
    classId: 'c-glide',
    R: [
      [1, 0, 0],
      [0, -1, 0],
      [0, 0, 1],
    ],
    t: [0, 0.5, 0],
    seitz: '{m₀₁₀ | 0,½,0}',
  },
]

export const META: SpaceGroupMeta = {
  number: 62,
  hm: 'Pnma',
  system: 'orthorhombic',
  pointGroup: 'mmm',
  lattice: 'primitive (P)',
  multiplicity: 8,
  blurb:
    'Pnma is a common centrosymmetric orthorhombic group (~1% of CSD): an n-glide ⊥ a, a true mirror ⊥ b, and an a-glide ⊥ c. Those generate three 2₁ screws and an inversion — eight general positions. Contrast with Pbca (three axial glides, no mirror). Ideal for teaching mirror vs glide.',
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
    origin: [0, 0.25, 0.25],
    direction: [1, 0, 0],
    locus: '(x, ¼, ¼)',
    opIndex: 3,
    primary: true,
    kind: '21',
  },
  {
    origin: [0, 0.75, 0.75],
    direction: [1, 0, 0],
    locus: '(x, ¾, ¾)',
    opIndex: 3,
    primary: false,
    kind: '21',
  },
  {
    origin: [0, 0, 0],
    direction: [0, 1, 0],
    locus: '(0, y, 0)',
    opIndex: 4,
    primary: true,
    kind: '21',
  },
  {
    origin: [0.5, 0, 0.5],
    direction: [0, 1, 0],
    locus: '(½, y, ½)',
    opIndex: 4,
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
    glide: [0, 0.5, 0.5],
    label: 'n-glide',
    classId: 'n-glide',
    opIndex: 7,
    primary: true,
    locus: 'x = ¼, glide (0, ½, ½)',
  },
  {
    planeValue: 0.75,
    normalAxis: 0,
    glide: [0, 0.5, 0.5],
    label: 'n-glide',
    classId: 'n-glide',
    opIndex: 7,
    primary: false,
    locus: 'x = ¾, glide (0, ½, ½)',
  },
  {
    planeValue: 0.25,
    normalAxis: 1,
    glide: [0, 0, 0],
    label: 'mirror',
    classId: 'c-glide',
    opIndex: 8,
    primary: true,
    locus: 'y = ¼, mirror (no glide)',
  },
  {
    planeValue: 0.75,
    normalAxis: 1,
    glide: [0, 0, 0],
    label: 'mirror',
    classId: 'c-glide',
    opIndex: 8,
    primary: false,
    locus: 'y = ¾, mirror (no glide)',
  },
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
]

export function elementLocusForOp(opIndex: number): string | null {
  switch (opIndex) {
    case 1:
      return null
    case 2:
      return '2₁ axis at (¼, 0, z)'
    case 3:
      return '2₁ axis at (x, ¼, ¼)'
    case 4:
      return '2₁ axis at (0, y, 0)'
    case 5:
      return 'inversion at (0, 0, 0) · others at 0/½'
    case 6:
      return 'a-glide plane z = ¼ · glide (½, 0, 0)'
    case 7:
      return 'n-glide plane x = ¼ · glide (0, ½, ½)'
    case 8:
      return 'mirror plane y = ¼'
    default:
      return null
  }
}

export const pnmaDemo: SpaceGroupDemo = {
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
  shortName: 'Pnma',
}
