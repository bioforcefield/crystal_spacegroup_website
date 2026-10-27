/** Space group 86 · P4₂/n — tetragonal (ITA origin choice 1). */

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
import itaJson from './itaSpaceGroups.json'

export const CELL: CellParams = { a: 1, b: 1, c: 1.3 }
export const SEED: Vec3 = [0.17, 0.23, 0.31]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold ‖ c', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4₂ / −4 ‖ c', color: '#a5b4fc' },
  screw: { id: 'screw', label: 'screw', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  mirror: { id: 'mirror', label: 'mirror', color: '#facc15' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide ⊥ c', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'fourfold',
  'twofold',
  'inversion',
  'n-glide',
]

const triplets = (
  itaJson as { groups: { number: number; triplets: string[] }[] }
).groups.find((g) => g.number === 86)!.triplets

export const OPERATORS: Operator[] = buildOperatorsFromTriplets(triplets).map((op) => {
  switch (op.index) {
    case 1:
      return { ...op, seitz: '{1 | 0}' }
    case 2:
      return { ...op, label: '4₂ screw ‖ c', classId: 'fourfold' }
    case 3:
      return { ...op, label: '2-fold ‖ c', classId: 'twofold' }
    case 4:
      return { ...op, label: '4₂⁻¹ screw ‖ c', classId: 'fourfold' }
    case 5:
      return { ...op, label: 'Inversion (−1)', classId: 'inversion', seitz: '{-1 | 0}' }
    case 6:
      return { ...op, label: '−4 ‖ c', classId: 'fourfold' }
    case 7:
      return { ...op, label: 'n-glide ⊥ c', classId: 'n-glide' }
    case 8:
      return { ...op, label: '−4³ ‖ c', classId: 'fourfold' }
    default:
      return op
  }
})

export const META: SpaceGroupMeta = {
  number: 86,
  hm: 'P42/n',
  system: 'tetragonal',
  pointGroup: '4/m',
  lattice: 'Primitive',
  multiplicity: 8,
  blurb:
    'P4₂/n (~CSD rank 31, <0.3%) is centrosymmetric tetragonal 4/m: a 4₂ screw ‖ c, −4, an n-glide ⊥ c, and inversion — eight general positions. Teaching cell keeps a = b (origin choice 1).',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  {
    origin: [0.25, 0.25, 0],
    direction: [0, 0, 1],
    locus: '(¼, ¼, z)',
    opIndex: 2,
    primary: true,
    kind: '42',
  },
  {
    origin: [0, 0, 0],
    direction: [0, 0, 1],
    locus: '(0, 0, z)',
    opIndex: 3,
    primary: true,
    kind: '2',
  },
]

const INVERSION_CENTERS: InversionCenterSpec[] = [
  { position: [0.25, 0.25, 0.25], primary: true, locus: '(¼, ¼, ¼)' },
]

const GLIDE_PLANES: GlidePlaneSpec[] = [
  {
    planeValue: 0.25,
    normalAxis: 2,
    glide: [0.5, 0.5, 0],
    label: 'n-glide',
    classId: 'n-glide',
    opIndex: 7,
    primary: true,
    locus: 'z = ¼ · n-glide (½, ½, 0)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  const map: Record<number, string | null> = {
    1: null,
    2: '4₂ screw axis at (¼, ¼, z)',
    3: '2-fold axis at (0, 0, z)',
    4: '4₂ screw axis at (¼, ¼, z)',
    5: 'inversion at (¼, ¼, ¼)',
    6: '−4 axis ‖ c',
    7: 'n-glide plane z = ¼ · glide (½, ½, 0)',
    8: '−4 axis ‖ c',
  }
  return map[opIndex] ?? OPERATORS.find((o) => o.index === opIndex)?.label ?? null
}

export const p42nDemo: SpaceGroupDemo = {
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
  shortName: 'P4₂/n',
}
