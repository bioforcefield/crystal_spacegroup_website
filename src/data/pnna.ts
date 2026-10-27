/** Space group 52 · Pnna — orthorhombic (ITA). */

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

export const CELL: CellParams = { a: 1, b: 1.2, c: 1.4 }
export const SEED: Vec3 = [0.22, 0.15, 0.3]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold ‖ a', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4-fold', color: '#a5b4fc' },
  screw: { id: 'screw', label: '2₁ screw ‖ b,c', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  mirror: { id: 'mirror', label: 'mirror', color: '#facc15' },
  'a-glide': { id: 'a-glide', label: 'a-glide ⊥ c', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide ⊥ a,b', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'twofold',
  'screw',
  'inversion',
  'n-glide',
  'a-glide',
]

const triplets = (
  itaJson as { groups: { number: number; triplets: string[] }[] }
).groups.find((g) => g.number === 52)!.triplets

export const OPERATORS: Operator[] = buildOperatorsFromTriplets(triplets).map((op) => {
  switch (op.index) {
    case 1:
      return { ...op, seitz: '{1 | 0}' }
    case 2:
      return { ...op, label: '2-fold ‖ a', classId: 'twofold' }
    case 3:
      return { ...op, label: '2₁ screw ‖ b', classId: 'screw' }
    case 4:
      return { ...op, label: '2₁ screw ‖ c', classId: 'screw' }
    case 5:
      return { ...op, label: 'Inversion (−1)', classId: 'inversion', seitz: '{-1 | 0}' }
    case 6:
      return { ...op, label: 'a-glide ⊥ c', classId: 'a-glide' }
    case 7:
      return { ...op, label: 'n-glide ⊥ a', classId: 'n-glide' }
    case 8:
      return { ...op, label: 'n-glide ⊥ b', classId: 'n-glide' }
    default:
      return op
  }
})

export const META: SpaceGroupMeta = {
  number: 52,
  hm: 'Pnna',
  system: 'orthorhombic',
  pointGroup: 'mmm',
  lattice: 'Primitive',
  multiplicity: 8,
  blurb:
    'Pnna (~CSD rank 36, <0.3%) is orthorhombic mmm with n-glides ⊥ a and ⊥ b plus an a-glide ⊥ c — eight general positions. Teaching companion to Pbcn / Pbca.',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  { origin: [0, 0, 0], direction: [1, 0, 0], locus: '(x, 0, 0)', opIndex: 2, primary: true, kind: '2' },
  { origin: [0.25, 0.25, 0.25], direction: [0, 1, 0], locus: '(¼, y, ¼)', opIndex: 3, primary: true, kind: '21' },
  { origin: [0.25, 0.25, 0.25], direction: [0, 0, 1], locus: '(¼, ¼, z)', opIndex: 4, primary: true, kind: '21' },
]

const INVERSION_CENTERS: InversionCenterSpec[] = [
  { position: [0, 0, 0], primary: true, locus: '(0, 0, 0)' },
  { position: [0.5, 0, 0], primary: false, locus: '(½, 0, 0)' },
]

const GLIDE_PLANES: GlidePlaneSpec[] = [
  {
    planeValue: 0,
    normalAxis: 0,
    glide: [0, 0.5, 0.5],
    label: 'n-glide',
    classId: 'n-glide',
    opIndex: 7,
    primary: true,
    locus: 'x = 0 · n-glide (0, ½, ½)',
  },
  {
    planeValue: 0.25,
    normalAxis: 1,
    glide: [0.5, 0, 0.5],
    label: 'n-glide',
    classId: 'n-glide',
    opIndex: 8,
    primary: true,
    locus: 'y = ¼ · n-glide (½, 0, ½)',
  },
  {
    planeValue: 0,
    normalAxis: 2,
    glide: [0.5, 0, 0],
    label: 'a-glide',
    classId: 'a-glide',
    opIndex: 6,
    primary: true,
    locus: 'z = 0 · a-glide (½, 0, 0)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  const map: Record<number, string | null> = {
    1: null,
    2: '2-fold axis ‖ a',
    3: '2₁ axis ‖ b',
    4: '2₁ axis ‖ c',
    5: 'inversion at (0, 0, 0)',
    6: 'a-glide plane z = 0 · glide (½, 0, 0)',
    7: 'n-glide plane x = 0 · glide (0, ½, ½)',
    8: 'n-glide plane y = ¼ · glide (½, 0, ½)',
  }
  return map[opIndex] ?? null
}

export const pnnaDemo: SpaceGroupDemo = {
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
  shortName: 'Pnna',
}
