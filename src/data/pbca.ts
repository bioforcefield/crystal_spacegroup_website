/** Space group 61 · Pbca — Session 1 hard-coded demo data (ITA conventional). */

export type Vec3 = [number, number, number]

export interface CellParams {
  a: number
  b: number
  c: number
}

/** Teaching orthorhombic proportions (not a physical crystal). */
export const CELL: CellParams = { a: 1, b: 1.2, c: 1.5 }

/** Seed point in the asymmetric unit (fractional coordinates). */
export const SEED: Vec3 = [0.22, 0.15, 0.3]

export type SymmetryClassId =
  | 'identity'
  | 'screw'
  | 'inversion'
  | 'a-glide'
  | 'b-glide'
  | 'c-glide'

export interface SymmetryClass {
  id: SymmetryClassId
  /** Legend label */
  label: string
  /** Motif + row accent color */
  color: string
}

/** Teaching palette — one distinct color per class shown in the legend. */
export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  screw: { id: 'screw', label: '2₁ screw', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide', color: '#fb923c' },
}

/** Legend order for the toolbar. */
export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'screw',
  'inversion',
  'a-glide',
  'b-glide',
  'c-glide',
]

export interface Operator {
  index: number
  triplet: string
  label: string
  classId: SymmetryClassId
  /** Rotation matrix R (row-major 3×3) and translation t in fractional coords: x' = R x + t */
  R: [Vec3, Vec3, Vec3]
  t: Vec3
  /** Seitz-style short form */
  seitz: string
}

/**
 * General-position operators for Pbca (No. 61), multiplicity 8.
 * Coordinate triplets match the ITA conventional listing.
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

export interface SpaceGroupMeta {
  number: number
  hm: string
  system: string
  pointGroup: string
  lattice: string
  multiplicity: number
  blurb: string
}

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


export type Mat3 = [Vec3, Vec3, Vec3]

/** det(R) for a 3×3 row-major matrix. */
export function det3(R: Mat3): number {
  return (
    R[0][0] * (R[1][1] * R[2][2] - R[1][2] * R[2][1]) -
    R[0][1] * (R[1][0] * R[2][2] - R[1][2] * R[2][0]) +
    R[0][2] * (R[1][0] * R[2][1] - R[1][1] * R[2][0])
  )
}

export function isImproper(R: Mat3): boolean {
  return det3(R) < 0
}

/**
 * Split R into a proper rotation + optional mirror (scale.x = −1).
 * Flips the first column of an improper R so det becomes +1; the enantiomorph
 * is then restored by mirroring in the motif's local +x.
 */
export function properBasis(R: Mat3): { proper: Mat3; mirror: boolean } {
  if (!isImproper(R)) {
    return { proper: R, mirror: false }
  }
  const proper: Mat3 = [
    [-R[0][0], R[0][1], R[0][2]],
    [-R[1][0], R[1][1], R[1][2]],
    [-R[2][0], R[2][1], R[2][2]],
  ]
  return { proper, mirror: true }
}

/** Wrap fractional coordinate into [0, 1). */
export function wrap01(v: number): number {
  return ((v % 1) + 1) % 1
}

export function applyOperator(op: Operator, p: Vec3): Vec3 {
  const x =
    op.R[0][0] * p[0] + op.R[0][1] * p[1] + op.R[0][2] * p[2] + op.t[0]
  const y =
    op.R[1][0] * p[0] + op.R[1][1] * p[1] + op.R[1][2] * p[2] + op.t[1]
  const z =
    op.R[2][0] * p[0] + op.R[2][1] * p[1] + op.R[2][2] * p[2] + op.t[2]
  return [wrap01(x), wrap01(y), wrap01(z)]
}

/** Fractional → Cartesian for orthorhombic cell (axes aligned). */
export function fracToCart(p: Vec3, cell: CellParams = CELL): Vec3 {
  return [p[0] * cell.a, p[1] * cell.b, p[2] * cell.c]
}

export interface GeneralPoint {
  index: number
  fractional: Vec3
  cartesian: Vec3
  operator: Operator
  /** true when det(R) < 0 (inversion, glide, rotary-inversion) */
  improper: boolean
  classId: SymmetryClassId
  classColor: string
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

/** Color by fractional height along c (subtle cue only). */
export function colorByHeight(zFrac: number): string {
  const t = Math.min(1, Math.max(0, zFrac))
  const h = 210 - t * 180
  return `hsl(${h} 85% 58%)`
}

export function classColor(classId: SymmetryClassId): string {
  return SYMMETRY_CLASSES[classId].color
}

export function operatorClass(op: Operator): SymmetryClass {
  return SYMMETRY_CLASSES[op.classId]
}

/** Apply operator without wrapping into [0, 1). */
export function applyOperatorRaw(op: Operator, p: Vec3): Vec3 {
  const x =
    op.R[0][0] * p[0] + op.R[0][1] * p[1] + op.R[0][2] * p[2] + op.t[0]
  const y =
    op.R[1][0] * p[0] + op.R[1][1] * p[1] + op.R[1][2] * p[2] + op.t[1]
  const z =
    op.R[2][0] * p[0] + op.R[2][1] * p[1] + op.R[2][2] * p[2] + op.t[2]
  return [x, y, z]
}

/** Add two fractional vectors. */
export function addFrac(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}
