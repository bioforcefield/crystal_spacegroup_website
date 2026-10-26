/** Space group 36 · Cmc21 — C-centred orthorhombic polar (ITA). */

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

export const CELL: CellParams = { a: 1, b: 1.2, c: 1.4 }
export const SEED: Vec3 = [0.22, 0.15, 0.3]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4-fold', color: '#a5b4fc' },
  screw: { id: 'screw', label: '2₁ screw ‖ c', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide ⊥ b', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide ⊥ b', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'screw',
  'c-glide',
  'n-glide',
]

/** Mirror ⊥ a reuses c-glide slot label overridden per-op; true mirror at op3. */
const RAW = buildOperatorsFromTriplets([
  'x,y,z',
  '-x,-y,z+1/2',
  '-x,y,z',
  'x,-y,z+1/2',
  'x+1/2,y+1/2,z',
  '-x+1/2,-y+1/2,z+1/2',
  '-x+1/2,y+1/2,z',
  'x+1/2,-y+1/2,z+1/2',
])

export const OPERATORS: Operator[] = RAW.map((op) => {
  switch (op.index) {
    case 1:
      return { ...op, seitz: '{1 | 0}' }
    case 2:
      return { ...op, label: '2₁ screw ‖ c', classId: 'screw', seitz: '{2₀₀₁ | 0,0,½}' }
    case 3:
      return { ...op, label: 'mirror ⊥ a', classId: 'c-glide', seitz: '{m₁₀₀ | 0}' }
    case 4:
      return { ...op, label: 'c-glide ⊥ b', classId: 'c-glide', seitz: '{m₀₁₀ | 0,0,½}' }
    case 5:
      return { ...op, label: 'C-centring', classId: 'identity', seitz: '{1 | ½,½,0}' }
    case 6:
      return { ...op, label: '2₁ screw ‖ c (C)', classId: 'screw' }
    case 7:
      return { ...op, label: 'mirror ⊥ a (C)', classId: 'c-glide' }
    case 8:
      return { ...op, label: 'n-glide ⊥ b', classId: 'n-glide', seitz: '{m₀₁₀ | ½,½,½}' }
    default:
      return op
  }
})

export const META: SpaceGroupMeta = {
  number: 36,
  hm: 'Cmc21',
  system: 'orthorhombic',
  pointGroup: 'mm2',
  lattice: 'C-centred',
  multiplicity: 8,
  blurb:
    'Cmc21 (~0.14% of CSD) is a common polar C-centred orthorhombic group: 2₁ ‖ c, a mirror ⊥ a, and a c-glide ⊥ b — C-centring generates an n-glide at y = ¼. No inversion (point group mm2). Teaching bridge between Cc and Fdd2.',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  { origin: [0, 0, 0], direction: [0, 0, 1], locus: '(0, 0, z)', opIndex: 2, primary: true, kind: '21' },
  { origin: [0.5, 0.5, 0], direction: [0, 0, 1], locus: '(½, ½, z)', opIndex: 6, primary: false, kind: '21' },
]

const GLIDE_PLANES: GlidePlaneSpec[] = [
  {
    planeValue: 0,
    normalAxis: 0,
    glide: [0, 0, 0],
    label: 'mirror',
    classId: 'c-glide',
    opIndex: 3,
    primary: true,
    locus: 'x = 0, mirror (no glide)',
  },
  {
    planeValue: 0.5,
    normalAxis: 0,
    glide: [0, 0, 0],
    label: 'mirror',
    classId: 'c-glide',
    opIndex: 3,
    primary: false,
    locus: 'x = ½, mirror (no glide)',
  },
  {
    planeValue: 0,
    normalAxis: 1,
    glide: [0, 0, 0.5],
    label: 'c-glide',
    classId: 'c-glide',
    opIndex: 4,
    primary: true,
    locus: 'y = 0, glide (0, 0, ½)',
  },
  {
    planeValue: 0.5,
    normalAxis: 1,
    glide: [0, 0, 0.5],
    label: 'c-glide',
    classId: 'c-glide',
    opIndex: 4,
    primary: false,
    locus: 'y = ½, glide (0, 0, ½)',
  },
  {
    planeValue: 0.25,
    normalAxis: 1,
    glide: [0.5, 0, 0.5],
    label: 'n-glide',
    classId: 'n-glide',
    opIndex: 8,
    primary: true,
    locus: 'y = ¼, glide (½, 0, ½)',
  },
  {
    planeValue: 0.75,
    normalAxis: 1,
    glide: [0.5, 0, 0.5],
    label: 'n-glide',
    classId: 'n-glide',
    opIndex: 8,
    primary: false,
    locus: 'y = ¾, glide (½, 0, ½)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  const map: Record<number, string | null> = {
    1: null,
    2: '2₁ axis at (0, 0, z)',
    3: 'mirror plane x = 0',
    4: 'c-glide plane y = 0 · glide (0, 0, ½)',
    5: 'C-centring translation (½, ½, 0)',
    8: 'n-glide plane y = ¼ · glide (½, 0, ½)',
  }
  return map[opIndex] ?? OPERATORS.find((o) => o.index === opIndex)?.label ?? null
}

export const cmc21Demo: SpaceGroupDemo = {
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
  shortName: 'Cmc21',
}
