/** Space group 161 · R3c — trigonal, hexagonal setting (ITA R3c:H). */

import type {
  CellParams,
  GlidePlaneSpec,
  Operator,
  ScrewAxisSpec,
  SpaceGroupDemo,
  SpaceGroupMeta,
  SymmetryClass,
  SymmetryClassId,
  Vec3,
} from './types'
import { buildOperatorsFromTriplets } from './groups'
import itaJson from './itaSpaceGroups.json'

/** Hexagonal teaching cell: a = b, γ = 120°. */
export const CELL: CellParams = { a: 1, b: 1, c: 1.6, gammaDeg: 120 }
export const SEED: Vec3 = [0.17, 0.23, 0.31]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / R-centring', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold ‖ c', color: '#67e8f9' },
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
  'c-glide',
]

const triplets = (
  itaJson as { groups: { number: number; triplets: string[] }[] }
).groups.find((g) => g.number === 161)!.triplets

export const OPERATORS: Operator[] = buildOperatorsFromTriplets(triplets).map((op) => {
  const i = op.index
  if (i === 1) return { ...op, seitz: '{1 | 0}' }
  if (i === 2 || i === 3)
    return { ...op, label: '3-fold ‖ c', classId: 'threefold' as SymmetryClassId }
  if (i === 4)
    return { ...op, label: 'c-glide · x=−y', classId: 'c-glide' as SymmetryClassId }
  if (i === 5)
    return { ...op, label: 'c-glide · y=2x', classId: 'c-glide' as SymmetryClassId }
  if (i === 6)
    return { ...op, label: 'c-glide · x=2y', classId: 'c-glide' as SymmetryClassId }
  if (op.classId === 'identity' && op.t.some((c) => Math.abs(c) > 1e-6)) {
    return { ...op, label: 'R-centring', classId: 'identity' }
  }
  if (op.classId === 'c-glide' || (i >= 10 && i <= 12) || (i >= 16 && i <= 18)) {
    if (i === 10 || i === 16)
      return { ...op, label: 'c-glide · x+y=1 (R)', classId: 'c-glide' }
    if (i === 11 || i === 17)
      return { ...op, label: 'c-glide · y=2x−1 (R)', classId: 'c-glide' }
    if (i === 12 || i === 18)
      return { ...op, label: 'c-glide · x=2y−1 (R)', classId: 'c-glide' }
    return { ...op, label: 'c-glide (R)', classId: 'c-glide' }
  }
  if (op.classId === 'threefold') {
    return { ...op, label: '3-fold ‖ c (R)', classId: 'threefold' }
  }
  return op
})

export const META: SpaceGroupMeta = {
  number: 161,
  hm: 'R3c',
  system: 'trigonal',
  pointGroup: '3m',
  lattice: 'Rhombohedral (hexagonal axes)',
  multiplicity: 18,
  blurb:
    'R3c (~CSD rank 39, <0.3%) is the non-centrosymmetric sibling of R-3c: 3-fold ‖ c, vertical c-glides, and R-centring — no inversion (point group 3m). Eighteen general positions. Teaching cell a = b, γ = 120°.',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  { origin: [0, 0, 0], direction: [0, 0, 1], locus: '(0, 0, z)', opIndex: 2, primary: true, kind: '3' },
  { origin: [2 / 3, 1 / 3, 0], direction: [0, 0, 1], locus: '(⅔, ⅓, z)', opIndex: 8, primary: true, kind: '3' },
  { origin: [1 / 3, 2 / 3, 0], direction: [0, 0, 1], locus: '(⅓, ⅔, z)', opIndex: 14, primary: true, kind: '3' },
]

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
    opIndex: 4,
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
    opIndex: 5,
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
    opIndex: 6,
    primary: true,
    locus: 'plane x = 2y · glide (0, 0, ½)',
  },
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
    opIndex: 10,
    primary: false,
    locus: 'plane x + y = 1 (R-related, approx) · glide (0, 0, ½)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  if (opIndex === 1) return null
  if (opIndex === 2 || opIndex === 3) return '3-fold axis at (0, 0, z)'
  if (opIndex === 4) return 'c-glide · plane x = −y · glide (0, 0, ½)'
  if (opIndex === 5) return 'c-glide · plane y = 2x · glide (0, 0, ½)'
  if (opIndex === 6) return 'c-glide · plane x = 2y · glide (0, 0, ½)'
  if (opIndex === 7 || opIndex === 13) return 'R-centring translation'
  if (opIndex === 10 || opIndex === 16)
    return 'c-glide (R) · plane x + y = 1 (approx) · glide ‖ c'
  if (opIndex === 11 || opIndex === 17)
    return 'c-glide (R) · plane y = 2x − 1 (approx) · glide ‖ c'
  if (opIndex === 12 || opIndex === 18)
    return 'c-glide (R) · plane x = 2y − 1 (approx) · glide ‖ c'
  const op = OPERATORS.find((o) => o.index === opIndex)
  return op?.label ?? null
}

export const r3cDemo: SpaceGroupDemo = {
  meta: META,
  cell: CELL,
  seed: SEED,
  operators: OPERATORS,
  symmetryClasses: SYMMETRY_CLASSES,
  classLegendOrder: CLASS_LEGEND_ORDER,
  screwAxes: SCREW_AXES,
  inversionCenters: [],
  glidePlanes: GLIDE_PLANES,
  elementLocusForOp,
  defaultProjection: 'c',
  primaryInversionOp: 1,
  shortName: 'R3c',
}
