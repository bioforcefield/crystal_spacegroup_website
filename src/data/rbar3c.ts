/** Space group 167 · R-3c — trigonal, hexagonal setting (ITA R-3c:H). */

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
import { buildOperatorsFromTriplets } from './groups'

/** Hexagonal teaching cell: a = b, γ = 120°. */
export const CELL: CellParams = { a: 1, b: 1, c: 1.6, gammaDeg: 120 }
export const SEED: Vec3 = [0.17, 0.23, 0.31]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold ⊥ c', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3 / −3 ‖ c', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4-fold', color: '#a5b4fc' },
  screw: { id: 'screw', label: 'screw', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  mirror: { id: 'mirror', label: 'mirror', color: '#facc15' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide ‖ c (vertical)', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'threefold',
  'twofold',
  'inversion',
  'c-glide',
]

const RAW = buildOperatorsFromTriplets([
  'x,y,z',
  '-y,x-y,z',
  '-x+y,-x,z',
  'y,x,-z+1/2',
  'x-y,-y,-z+1/2',
  '-x,-x+y,-z+1/2',
  '-x,-y,-z',
  'y,-x+y,-z',
  'x-y,x,-z',
  '-y,-x,z+1/2',
  '-x+y,y,z+1/2',
  'x,x-y,z+1/2',
  'x+2/3,y+1/3,z+1/3',
  '-y+2/3,x-y+1/3,z+1/3',
  '-x+y+2/3,-x+1/3,z+1/3',
  'y+2/3,x+1/3,-z+5/6',
  'x-y+2/3,-y+1/3,-z+5/6',
  '-x+2/3,-x+y+1/3,-z+5/6',
  '-x+2/3,-y+1/3,-z+1/3',
  'y+2/3,-x+y+1/3,-z+1/3',
  'x-y+2/3,x+1/3,-z+1/3',
  '-y+2/3,-x+1/3,z+5/6',
  '-x+y+2/3,y+1/3,z+5/6',
  'x+2/3,x-y+1/3,z+5/6',
  'x+1/3,y+2/3,z+2/3',
  '-y+1/3,x-y+2/3,z+2/3',
  '-x+y+1/3,-x+2/3,z+2/3',
  'y+1/3,x+2/3,-z+1/6',
  'x-y+1/3,-y+2/3,-z+1/6',
  '-x+1/3,-x+y+2/3,-z+1/6',
  '-x+1/3,-y+2/3,-z+2/3',
  'y+1/3,-x+y+2/3,-z+2/3',
  'x-y+1/3,x+2/3,-z+2/3',
  '-y+1/3,-x+2/3,z+1/6',
  '-x+y+1/3,y+2/3,z+1/6',
  'x+1/3,x-y+2/3,z+1/6',
])

export const OPERATORS: Operator[] = RAW.map((op) => {
  const i = op.index
  // Primitive-cell generators (ops 1–12); R images inherit class via classifier
  if (i === 1) return { ...op, seitz: '{1 | 0}' }
  if (i === 2 || i === 3)
    return { ...op, label: '3-fold ‖ c', classId: 'threefold' as SymmetryClassId }
  if (i === 4 || i === 5 || i === 6)
    return { ...op, label: '2-fold ⊥ c', classId: 'twofold' as SymmetryClassId }
  if (i === 7)
    return {
      ...op,
      label: 'Inversion (−1)',
      classId: 'inversion' as SymmetryClassId,
      seitz: '{-1 | 0}',
    }
  if (i === 8 || i === 9)
    return { ...op, label: '−3 ‖ c', classId: 'threefold' as SymmetryClassId }
  if (i === 10)
    return { ...op, label: 'c-glide · x=−y', classId: 'c-glide' as SymmetryClassId }
  if (i === 11)
    return { ...op, label: 'c-glide · y=2x', classId: 'c-glide' as SymmetryClassId }
  if (i === 12)
    return { ...op, label: 'c-glide · x=2y', classId: 'c-glide' as SymmetryClassId }
  if (op.classId === 'identity' && op.t.some((c) => Math.abs(c) > 1e-6)) {
    return { ...op, label: 'R-centring', classId: 'identity' }
  }
  if (op.classId === 'screw') {
    return { ...op, label: '2-fold ⊥ c (R)', classId: 'twofold' }
  }
  if (op.classId === 'c-glide') {
    // R images of ops 10/11/12 (T1: 22–24, T2: 34–36)
    if (i === 22 || i === 34)
      return { ...op, label: 'c-glide · x+y=1 (R)', classId: 'c-glide' }
    if (i === 23 || i === 35)
      return { ...op, label: 'c-glide · y=2x−1 (R)', classId: 'c-glide' }
    if (i === 24 || i === 36)
      return { ...op, label: 'c-glide · x=2y−1 (R)', classId: 'c-glide' }
    return { ...op, label: 'c-glide (R)', classId: 'c-glide' }
  }
  if (op.classId === 'inversion') {
    return { ...op, label: 'Inversion (R-related)', classId: 'inversion' }
  }
  if (op.classId === 'threefold' && (op.label ?? '').startsWith('−3')) {
    return { ...op, label: '−3 ‖ c (R)', classId: 'threefold' }
  }
  if (op.classId === 'threefold') {
    return { ...op, label: '3-fold ‖ c (R)', classId: 'threefold' }
  }
  return op
})

export const META: SpaceGroupMeta = {
  number: 167,
  hm: 'R-3c',
  system: 'trigonal',
  pointGroup: '-3m',
  lattice: 'Rhombohedral (hexagonal axes)',
  multiplicity: 36,
  blurb:
    'R-3c (~0.2% of CSD, rank 24) extends R-3 with c-glides and 2-folds ⊥ c (point group −3m). Hexagonal setting: 3 / −3 ‖ c, inversion, vertical c-glides, plus R-centring — thirty-six general positions. Teaching cell a = b, γ = 120°. Primary vertical c-glides (x=−y, y=2x, x=2y) plus approximate R-translated tertiary strips.',
}

/** 3 ‖ c at (0,0,z) and R-related; 2 ⊥ c along [110]-family. */
const SCREW_AXES: ScrewAxisSpec[] = [
  { origin: [0, 0, 0], direction: [0, 0, 1], locus: '(0, 0, z)', opIndex: 2, primary: true, kind: '3' },
  { origin: [2 / 3, 1 / 3, 0], direction: [0, 0, 1], locus: '(⅔, ⅓, z)', opIndex: 14, primary: true, kind: '3' },
  { origin: [1 / 3, 2 / 3, 0], direction: [0, 0, 1], locus: '(⅓, ⅔, z)', opIndex: 26, primary: true, kind: '3' },
  { origin: [0, 0, 0.25], direction: [1, 1, 0], locus: '[110] through (0,0,¼)', opIndex: 4, primary: true, kind: '2' },
  { origin: [0, 0, 0.25], direction: [1, -2, 0], locus: '[1-20] through (0,0,¼)', opIndex: 5, primary: false, kind: '2' },
  { origin: [0, 0, 0.25], direction: [-2, 1, 0], locus: '[-210] through (0,0,¼)', opIndex: 6, primary: false, kind: '2' },
]

function fmtFrac(v: number): string {
  const w = ((v % 1) + 1) % 1
  if (Math.abs(w) < 1e-9 || Math.abs(w - 1) < 1e-9) return '0'
  if (Math.abs(w - 0.5) < 1e-9) return '½'
  if (Math.abs(w - 1 / 3) < 1e-9) return '⅓'
  if (Math.abs(w - 2 / 3) < 1e-9) return '⅔'
  if (Math.abs(w - 1 / 6) < 1e-9) return '⅙'
  if (Math.abs(w - 5 / 6) < 1e-9) return '⅚'
  if (Math.abs(w - 0.25) < 1e-9) return '¼'
  if (Math.abs(w - 0.75) < 1e-9) return '¾'
  return w.toFixed(3)
}

const INVERSION_POSITIONS: Vec3[] = [
  [0, 0, 0],
  [0, 0, 0.5],
  [2 / 3, 1 / 3, 1 / 3],
  [2 / 3, 1 / 3, 5 / 6],
  [1 / 3, 2 / 3, 2 / 3],
  [1 / 3, 2 / 3, 1 / 6],
]

const INVERSION_CENTERS: InversionCenterSpec[] = INVERSION_POSITIONS.map(
  (position, i) => ({
    position,
    primary: i === 0,
    locus: `(${fmtFrac(position[0])}, ${fmtFrac(position[1])}, ${fmtFrac(position[2])})`,
  }),
)

/**
 * Vertical c-glides via explicit corners (x = −y and 3-fold images).
 * Patches extend slightly outside the unit cell for readable teaching strips.
 */
const GLIDE_PLANES: GlidePlaneSpec[] = [
  {
    corners: [
      [0, 0, 0],
      [1, -1, 0],
      [1, -1, 1],
      [0, 0, 1],
    ],
    glide: [0, 0, 0.5],
    label: 'c-glide · x=−y',
    classId: 'c-glide',
    opIndex: 10,
    primary: true,
    locus: 'plane x = −y · glide (0, 0, ½)',
  },
  {
    corners: [
      [0, 0, 0],
      [1, 2, 0],
      [1, 2, 1],
      [0, 0, 1],
    ],
    glide: [0, 0, 0.5],
    label: 'c-glide · y=2x',
    classId: 'c-glide',
    opIndex: 11,
    primary: true,
    locus: 'plane y = 2x · glide (0, 0, ½)',
  },
  {
    corners: [
      [0, 0, 0],
      [-2, -1, 0],
      [-2, -1, 1],
      [0, 0, 1],
    ],
    glide: [0, 0, 0.5],
    label: 'c-glide · x=2y',
    classId: 'c-glide',
    opIndex: 12,
    primary: true,
    locus: 'plane x = 2y · glide (0, 0, ½)',
  },
  // Tertiary / R-related images (T1 = ⅔,⅓ shift in ab; approximate teaching strips)
  {
    corners: [
      [2 / 3, 1 / 3, 0],
      [5 / 3, -2 / 3, 0],
      [5 / 3, -2 / 3, 1],
      [2 / 3, 1 / 3, 1],
    ],
    glide: [0, 0, 0.5],
    label: 'c-glide · x+y=1 (R)',
    classId: 'c-glide',
    opIndex: 22,
    primary: false,
    locus: 'plane x + y = 1 (R-related, approx) · glide (0, 0, ½)',
  },
  {
    corners: [
      [2 / 3, 1 / 3, 0],
      [5 / 3, 7 / 3, 0],
      [5 / 3, 7 / 3, 1],
      [2 / 3, 1 / 3, 1],
    ],
    glide: [0, 0, 0.5],
    label: 'c-glide · y=2x−1 (R)',
    classId: 'c-glide',
    opIndex: 23,
    primary: false,
    locus: 'plane y = 2x − 1 (R-related, approx) · glide (0, 0, ½)',
  },
  {
    corners: [
      [2 / 3, 1 / 3, 0],
      [-4 / 3, -2 / 3, 0],
      [-4 / 3, -2 / 3, 1],
      [2 / 3, 1 / 3, 1],
    ],
    glide: [0, 0, 0.5],
    label: 'c-glide · x=2y−1 (R)',
    classId: 'c-glide',
    opIndex: 24,
    primary: false,
    locus: 'plane x = 2y − 1 (R-related, approx) · glide (0, 0, ½)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  if (opIndex === 1) return null
  if (opIndex === 2 || opIndex === 3) return '3-fold axis at (0, 0, z)'
  if (opIndex >= 4 && opIndex <= 6) return '2-fold axis ⊥ c'
  if (opIndex === 7) return 'inversion at (0, 0, 0)'
  if (opIndex === 8 || opIndex === 9) return '−3 axis at (0, 0, z)'
  if (opIndex === 10) return 'c-glide · plane x = −y · glide (0, 0, ½)'
  if (opIndex === 11) return 'c-glide · plane y = 2x · glide (0, 0, ½)'
  if (opIndex === 12) return 'c-glide · plane x = 2y · glide (0, 0, ½)'
  if (opIndex === 22 || opIndex === 34)
    return 'c-glide (R) · plane x + y = 1 (approx) · glide ‖ c'
  if (opIndex === 23 || opIndex === 35)
    return 'c-glide (R) · plane y = 2x − 1 (approx) · glide ‖ c'
  if (opIndex === 24 || opIndex === 36)
    return 'c-glide (R) · plane x = 2y − 1 (approx) · glide ‖ c'
  if (opIndex === 13 || opIndex === 25) return 'R-centring translation'
  const op = OPERATORS.find((o) => o.index === opIndex)
  return op?.label ?? null
}

export const rbar3cDemo: SpaceGroupDemo = {
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
  primaryInversionOp: 7,
  shortName: 'R-3c',
}
