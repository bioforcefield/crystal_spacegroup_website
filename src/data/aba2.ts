/** Space group 41 · Aba2 — A-centred orthorhombic polar (ITA; modern Aea2). */

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

export const CELL: CellParams = { a: 1, b: 1.2, c: 1.4 }
export const SEED: Vec3 = [0.22, 0.15, 0.3]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / A-centring', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold ‖ c', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4-fold', color: '#a5b4fc' },
  screw: { id: 'screw', label: 'screw', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  mirror: { id: 'mirror', label: 'mirror', color: '#facc15' },
  'a-glide': { id: 'a-glide', label: 'a-glide ⊥ b', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide ⊥ a', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'twofold',
  'a-glide',
  'b-glide',
]

const triplets = (
  itaJson as { groups: { number: number; triplets: string[] }[] }
).groups.find((g) => g.number === 41)!.triplets

export const OPERATORS: Operator[] = buildOperatorsFromTriplets(triplets).map((op) => {
  switch (op.index) {
    case 1:
      return { ...op, seitz: '{1 | 0}' }
    case 2:
      return { ...op, label: '2-fold ‖ c', classId: 'twofold' }
    case 3:
      return { ...op, label: 'b-glide ⊥ a', classId: 'b-glide' }
    case 4:
      return { ...op, label: 'a-glide ⊥ b', classId: 'a-glide' }
    case 5:
      return { ...op, label: 'A-centring', classId: 'identity' }
    case 6:
      return { ...op, label: '2-fold ‖ c (A)', classId: 'twofold' }
    case 7:
      return { ...op, label: 'b-glide ⊥ a (A)', classId: 'b-glide' }
    case 8:
      return { ...op, label: 'a-glide ⊥ b (A)', classId: 'a-glide' }
    default:
      return op
  }
})

export const META: SpaceGroupMeta = {
  number: 41,
  hm: 'Aba2',
  system: 'orthorhombic',
  pointGroup: 'mm2',
  lattice: 'A-centred',
  multiplicity: 8,
  blurb:
    'Aba2 (modern Aea2; ~CSD rank 38, <0.3%) is A-centred polar orthorhombic mm2: a pure 2-fold ‖ c with a- and b-glides — no inversion. Eight general positions. CSD still lists the legacy Aba2 symbol.',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  { origin: [0, 0, 0], direction: [0, 0, 1], locus: '(0, 0, z)', opIndex: 2, primary: true, kind: '2' },
  { origin: [0, 0.5, 0], direction: [0, 0, 1], locus: '(0, ½, z)', opIndex: 6, primary: false, kind: '2' },
]

const GLIDE_PLANES: GlidePlaneSpec[] = [
  {
    planeValue: 0.25,
    normalAxis: 0,
    glide: [0, 0.5, 0],
    label: 'b-glide',
    classId: 'b-glide',
    opIndex: 3,
    primary: true,
    locus: 'x = ¼ · b-glide (0, ½, 0)',
  },
  {
    planeValue: 0.25,
    normalAxis: 1,
    glide: [0.5, 0, 0],
    label: 'a-glide',
    classId: 'a-glide',
    opIndex: 4,
    primary: true,
    locus: 'y = ¼ · a-glide (½, 0, 0)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  const map: Record<number, string | null> = {
    1: null,
    2: '2-fold axis at (0, 0, z)',
    3: 'b-glide plane x = ¼ · glide (0, ½, 0)',
    4: 'a-glide plane y = ¼ · glide (½, 0, 0)',
    5: 'A-centring translation (0, ½, ½)',
  }
  return map[opIndex] ?? OPERATORS.find((o) => o.index === opIndex)?.label ?? null
}

export const aba2Demo: SpaceGroupDemo = {
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
  shortName: 'Aba2',
}
