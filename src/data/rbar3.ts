/** Space group 148 · R-3 — trigonal, hexagonal setting (ITA R-3:H). */

import type {
  CellParams,
  InversionCenterSpec,
  Operator,
  ScrewAxisSpec,
  SpaceGroupDemo,
  SpaceGroupMeta,
  SymmetryClass,
  SymmetryClassId,
  Vec3,
} from './types'
import { buildOperatorsFromTriplets } from './groups'

/** Hexagonal teaching cell: a = b, γ = 120°. */
export const CELL: CellParams = { a: 1, b: 1, c: 1.5, gammaDeg: 120 }

/** Seed off special positions (fractional). */
export const SEED: Vec3 = [0.17, 0.23, 0.31]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold ‖ c', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4-fold', color: '#a5b4fc' },
  screw: { id: 'screw', label: 'screw', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  mirror: { id: 'mirror', label: 'mirror', color: '#facc15' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'threefold',
  'inversion',
]

/**
 * General positions for R-3 (No. 148), hexagonal setting, multiplicity 18.
 * R-centring expanded: (0,0,0) + (⅔,⅓,⅓) + (⅓,⅔,⅔).
 */
const RAW: Operator[] = buildOperatorsFromTriplets([
  'x,y,z',
  '-y,x-y,z',
  '-x+y,-x,z',
  '-x,-y,-z',
  'y,-x+y,-z',
  'x-y,x,-z',
  'x+2/3,y+1/3,z+1/3',
  '-y+2/3,x-y+1/3,z+1/3',
  '-x+y+2/3,-x+1/3,z+1/3',
  '-x+2/3,-y+1/3,-z+1/3',
  'y+2/3,-x+y+1/3,-z+1/3',
  'x-y+2/3,x+1/3,-z+1/3',
  'x+1/3,y+2/3,z+2/3',
  '-y+1/3,x-y+2/3,z+2/3',
  '-x+y+1/3,-x+2/3,z+2/3',
  '-x+1/3,-y+2/3,-z+2/3',
  'y+1/3,-x+y+2/3,-z+2/3',
  'x-y+1/3,x+2/3,-z+2/3',
])

function polishSeitz(op: Operator): string {
  if (op.classId === 'identity' && op.t.every((c) => Math.abs(c) < 1e-9)) {
    return '{1 | 0}'
  }
  if (op.classId === 'inversion' && op.t.every((c) => Math.abs(c) < 1e-9)) {
    return '{-1 | 0}'
  }
  return op.seitz
}

export const OPERATORS: Operator[] = RAW.map((op) => {
  let label = op.label
  let classId = op.classId
  // R-lattice translations
  if (
    op.classId === 'identity' &&
    op.t.some((c) => Math.abs(c) > 1e-6)
  ) {
    label = 'R-centring'
  }
  if (op.classId === 'threefold' && label.startsWith('−3')) {
    classId = 'threefold'
  }
  return { ...op, label, classId, seitz: polishSeitz(op) }
})

export const META: SpaceGroupMeta = {
  number: 148,
  hm: 'R-3',
  system: 'trigonal',
  pointGroup: '-3',
  lattice: 'Rhombohedral (hexagonal axes)',
  multiplicity: 18,
  blurb:
    'R-3 is the most common trigonal group in the CSD (~0.8%). Hexagonal setting (R-3:H): a 3-fold ‖ c, inversion (point group −3), and R-centring that replicates the axis at (⅔,⅓,z) and (⅓,⅔,z). Teaching cell uses a = b, γ = 120° so the ab face is a hex parallelogram.',
}

/** 3 ‖ c at (0,0,z) and R-related sites. */
const SCREW_AXES: ScrewAxisSpec[] = [
  {
    origin: [0, 0, 0],
    direction: [0, 0, 1],
    locus: '(0, 0, z)',
    opIndex: 2,
    primary: true,
    kind: '3',
  },
  {
    origin: [2 / 3, 1 / 3, 0],
    direction: [0, 0, 1],
    locus: '(⅔, ⅓, z)',
    opIndex: 8,
    primary: true,
    kind: '3',
  },
  {
    origin: [1 / 3, 2 / 3, 0],
    direction: [0, 0, 1],
    locus: '(⅓, ⅔, z)',
    opIndex: 14,
    primary: true,
    kind: '3',
  },
]

function fmtFrac(v: number): string {
  const w = ((v % 1) + 1) % 1
  if (Math.abs(w) < 1e-9 || Math.abs(w - 1) < 1e-9) return '0'
  if (Math.abs(w - 0.5) < 1e-9) return '½'
  if (Math.abs(w - 1 / 3) < 1e-9) return '⅓'
  if (Math.abs(w - 2 / 3) < 1e-9) return '⅔'
  if (Math.abs(w - 1 / 6) < 1e-9) return '⅙'
  if (Math.abs(w - 5 / 6) < 1e-9) return '⅚'
  return w.toFixed(3)
}

/** 3a / 3b inversion sites (+ R images). */
const INVERSION_POSITIONS: Vec3[] = [
  [0, 0, 0],
  [0, 0, 0.5],
  [2 / 3, 1 / 3, 1 / 3],
  [1 / 3, 2 / 3, 2 / 3],
  [2 / 3, 1 / 3, 5 / 6],
  [1 / 3, 2 / 3, 1 / 6],
]

const INVERSION_CENTERS: InversionCenterSpec[] = INVERSION_POSITIONS.map(
  (position, i) => ({
    position,
    primary: i === 0,
    locus: `(${fmtFrac(position[0])}, ${fmtFrac(position[1])}, ${fmtFrac(position[2])})`,
  }),
)

export function elementLocusForOp(opIndex: number): string | null {
  switch (opIndex) {
    case 1:
      return null
    case 2:
    case 3:
      return '3-fold axis at (0, 0, z)'
    case 4:
      return 'inversion at (0, 0, 0)'
    case 5:
    case 6:
      return '−3 axis at (0, 0, z)'
    case 7:
    case 13:
      return 'R-centring translation'
    case 8:
    case 9:
      return '3-fold axis at (⅔, ⅓, z)'
    case 10:
      return 'inversion (R-related)'
    case 11:
    case 12:
      return '−3 axis at (⅔, ⅓, z)'
    case 14:
    case 15:
      return '3-fold axis at (⅓, ⅔, z)'
    case 16:
      return 'inversion (R-related)'
    case 17:
    case 18:
      return '−3 axis at (⅓, ⅔, z)'
    default:
      return null
  }
}

export const rbar3Demo: SpaceGroupDemo = {
  meta: META,
  cell: CELL,
  seed: SEED,
  operators: OPERATORS,
  symmetryClasses: SYMMETRY_CLASSES,
  classLegendOrder: CLASS_LEGEND_ORDER,
  screwAxes: SCREW_AXES,
  inversionCenters: INVERSION_CENTERS,
  glidePlanes: [],
  elementLocusForOp,
  defaultProjection: 'c',
  primaryInversionOp: 4,
  shortName: 'R-3',
}
