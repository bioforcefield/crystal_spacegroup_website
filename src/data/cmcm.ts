/** Space group 63 · Cmcm — C-centred orthorhombic (ITA). */

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
  identity: { id: 'identity', label: 'self / C-centring', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold ‖ a,b', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4-fold', color: '#a5b4fc' },
  screw: { id: 'screw', label: '2₁ screw ‖ c', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  mirror: { id: 'mirror', label: 'mirror ⊥ a,b', color: '#facc15' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide ⊥ b', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'twofold',
  'screw',
  'inversion',
  'mirror',
  'c-glide',
]

const triplets = (
  itaJson as { groups: { number: number; triplets: string[] }[] }
).groups.find((g) => g.number === 63)!.triplets

export const OPERATORS: Operator[] = buildOperatorsFromTriplets(triplets).map((op) => {
  switch (op.index) {
    case 1:
      return { ...op, seitz: '{1 | 0}' }
    case 2:
      return { ...op, label: '2₁ screw ‖ c', classId: 'screw' }
    case 3:
      return { ...op, label: '2-fold ‖ a', classId: 'twofold' }
    case 4:
      return { ...op, label: '2-fold ‖ b', classId: 'twofold' }
    case 5:
      return { ...op, label: 'Inversion (−1)', classId: 'inversion', seitz: '{-1 | 0}' }
    case 6:
      return { ...op, label: 'mirror ⊥ c', classId: 'mirror' }
    case 7:
      return { ...op, label: 'mirror ⊥ a', classId: 'mirror' }
    case 8:
      return { ...op, label: 'c-glide ⊥ b', classId: 'c-glide' }
    case 9:
      return { ...op, label: 'C-centring', classId: 'identity' }
    default: {
      if (op.classId === 'identity' && op.t.some((c) => Math.abs(c) > 1e-6)) {
        return { ...op, label: 'C-centring', classId: 'identity' }
      }
      if (op.classId === 'inversion') {
        return { ...op, label: 'Inversion (C-related)', classId: 'inversion' }
      }
      return op
    }
  }
})

export const META: SpaceGroupMeta = {
  number: 63,
  hm: 'Cmcm',
  system: 'orthorhombic',
  pointGroup: 'mmm',
  lattice: 'C-centred',
  multiplicity: 16,
  blurb:
    'Cmcm (~CSD rank 40, <0.3%) is C-centred orthorhombic mmm — mirrors ⊥ a and ⊥ c, c-glide ⊥ b, plus 2₁ ‖ c. Sixteen general positions. Sibling of polar Cmc21 (36) and Cmca (64).',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  { origin: [0, 0, 0], direction: [0, 0, 1], locus: '(0, 0, z)', opIndex: 2, primary: true, kind: '21' },
  { origin: [0.5, 0.5, 0], direction: [0, 0, 1], locus: '(½, ½, z)', opIndex: 2, primary: false, kind: '21' },
  { origin: [0, 0, 0], direction: [1, 0, 0], locus: '(x, 0, 0)', opIndex: 3, primary: true, kind: '2' },
  { origin: [0, 0, 0.25], direction: [0, 1, 0], locus: '(0, y, ¼)', opIndex: 4, primary: true, kind: '2' },
]

const INVERSION_CENTERS: InversionCenterSpec[] = [
  { position: [0, 0, 0], primary: true, locus: '(0, 0, 0)' },
  { position: [0.5, 0.5, 0], primary: false, locus: '(½, ½, 0)' },
]

const GLIDE_PLANES: GlidePlaneSpec[] = [
  {
    planeValue: 0,
    normalAxis: 0,
    glide: [0, 0, 0],
    label: 'mirror',
    classId: 'mirror',
    opIndex: 7,
    primary: true,
    locus: 'x = 0 · mirror',
  },
  {
    planeValue: 0,
    normalAxis: 1,
    glide: [0, 0, 0.5],
    label: 'c-glide',
    classId: 'c-glide',
    opIndex: 8,
    primary: true,
    locus: 'y = 0 · c-glide (0, 0, ½)',
  },
  {
    planeValue: 0.25,
    normalAxis: 2,
    glide: [0, 0, 0],
    label: 'mirror',
    classId: 'mirror',
    opIndex: 6,
    primary: true,
    locus: 'z = ¼ · mirror',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  const map: Record<number, string | null> = {
    1: null,
    2: '2₁ axis at (0, 0, z)',
    3: '2-fold axis ‖ a',
    4: '2-fold axis ‖ b',
    5: 'inversion at (0, 0, 0)',
    6: 'mirror plane z = ¼',
    7: 'mirror plane x = 0',
    8: 'c-glide plane y = 0 · glide (0, 0, ½)',
    9: 'C-centring translation (½, ½, 0)',
  }
  return map[opIndex] ?? OPERATORS.find((o) => o.index === opIndex)?.label ?? null
}

export const cmcmDemo: SpaceGroupDemo = {
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
  shortName: 'Cmcm',
}
