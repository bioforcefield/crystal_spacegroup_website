/** Space group 114 · P-42₁c — tetragonal (ITA). */

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

export const CELL: CellParams = { a: 1, b: 1, c: 1.3 }
export const SEED: Vec3 = [0.05, 0.29, 0.05]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold ‖ c', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '−4 ‖ c', color: '#a5b4fc' },
  sixfold: { id: 'sixfold', label: '6-fold', color: '#818cf8' },
  screw: { id: 'screw', label: '2₁ screw ‖ a,b', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  mirror: { id: 'mirror', label: 'mirror', color: '#facc15' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n / c-glide', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'fourfold',
  'twofold',
  'screw',
  'n-glide',
]

const triplets = (
  itaJson as { groups: { number: number; triplets: string[] }[] }
).groups.find((g) => g.number === 114)!.triplets

export const OPERATORS: Operator[] = buildOperatorsFromTriplets(triplets).map((op) => {
  switch (op.index) {
    case 1:
      return { ...op, seitz: '{1 | 0}' }
    case 2:
      return { ...op, label: '−4 ‖ c', classId: 'fourfold' }
    case 3:
      return { ...op, label: '2-fold ‖ c', classId: 'twofold' }
    case 4:
      return { ...op, label: '−4³ ‖ c', classId: 'fourfold' }
    case 5:
      return { ...op, label: '2₁ screw ‖ a', classId: 'screw' }
    case 6:
      return { ...op, label: 'c-glide (diag.)', classId: 'n-glide' }
    case 7:
      return { ...op, label: '2₁ screw ‖ b', classId: 'screw' }
    case 8:
      return { ...op, label: 'c-glide (diag.)', classId: 'n-glide' }
    default:
      return op
  }
})

export const META: SpaceGroupMeta = {
  number: 114,
  hm: 'P-421c',
  system: 'tetragonal',
  pointGroup: '-42m',
  lattice: 'Primitive',
  multiplicity: 8,
  blurb:
    'P-42₁c (~CSD rank 35, <0.3%) is non-centrosymmetric tetragonal −42m: −4 ‖ c, 2₁ screws ‖ a/b, and diagonal c-glides — eight general positions. Teaching cell keeps a = b.',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  {
    origin: [0, 0, 0],
    direction: [0, 0, 1],
    locus: '(0, 0, z) · −4',
    opIndex: 2,
    primary: true,
    kind: 'bar4',
  },
  {
    origin: [0, 0, 0],
    direction: [0, 0, 1],
    locus: '(0, 0, z)',
    opIndex: 3,
    primary: true,
    kind: '2',
  },
  {
    origin: [0.25, 0, 0.25],
    direction: [1, 0, 0],
    locus: '(x, 0, ¼)',
    opIndex: 5,
    primary: true,
    kind: '21',
  },
  {
    origin: [0, 0.25, 0.25],
    direction: [0, 1, 0],
    locus: '(0, y, ¼)',
    opIndex: 7,
    primary: true,
    kind: '21',
  },
]

const GLIDE_PLANES: GlidePlaneSpec[] = [
  {
    corners: [
      [0, 0, 0.25],
      [1, 1, 0.25],
      [1, 1, 0.75],
      [0, 0, 0.75],
    ],
    glide: [0, 0, 0.5],
    label: 'c-glide',
    classId: 'n-glide',
    opIndex: 6,
    primary: true,
    locus: 'diagonal plane · c-glide (teaching)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  const map: Record<number, string | null> = {
    1: null,
    2: '−4 axis at (0, 0, z)',
    3: '2-fold axis at (0, 0, z)',
    4: '−4 axis at (0, 0, z)',
    5: '2₁ axis ‖ a',
    6: 'diagonal c-glide',
    7: '2₁ axis ‖ b',
    8: 'diagonal c-glide',
  }
  return map[opIndex] ?? OPERATORS.find((o) => o.index === opIndex)?.label ?? null
}

export const p421cDemo: SpaceGroupDemo = {
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
  shortName: 'P-42₁c',
}
