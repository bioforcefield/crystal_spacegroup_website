/** Space group 64 · Cmca — C-centred orthorhombic (ITA; modern symbol Cmce). */

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

export const CELL: CellParams = { a: 1, b: 1.2, c: 1.4 }
export const SEED: Vec3 = [0.22, 0.15, 0.3]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold ‖ a,b', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4-fold', color: '#a5b4fc' },
  screw: { id: 'screw', label: '2₁ screw ‖ b,c', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  mirror: { id: 'mirror', label: 'mirror ⊥ a', color: '#facc15' },
  'a-glide': { id: 'a-glide', label: 'a-glide ⊥ c', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide ⊥ b', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide ⊥ b', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'twofold',
  'screw',
  'inversion',
  'mirror',
  'a-glide',
  'c-glide',
  'n-glide',
]

const RAW = buildOperatorsFromTriplets([
  'x,y,z',
  '-x+1/2,-y,z+1/2',
  'x,-y,-z',
  '-x+1/2,y,-z+1/2',
  '-x,-y,-z',
  'x+1/2,y,-z+1/2',
  '-x,y,z',
  'x+1/2,-y,z+1/2',
  'x+1/2,y+1/2,z',
  '-x,-y+1/2,z+1/2',
  'x+1/2,-y+1/2,-z',
  '-x,y+1/2,-z+1/2',
  '-x+1/2,-y+1/2,-z',
  'x,y+1/2,-z+1/2',
  '-x+1/2,y+1/2,z',
  'x,-y+1/2,z+1/2',
])

export const OPERATORS: Operator[] = RAW.map((op) => {
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
      return { ...op, label: 'a-glide ⊥ c', classId: 'a-glide' }
    case 7:
      return { ...op, label: 'mirror ⊥ a', classId: 'mirror' }
    case 8:
      return { ...op, label: 'n-glide ⊥ b', classId: 'n-glide' }
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
  number: 64,
  hm: 'Cmca',
  system: 'orthorhombic',
  pointGroup: 'mmm',
  lattice: 'C-centred',
  multiplicity: 16,
  blurb:
    'Cmca (modern Cmce; ~0.13% of CSD) is C-centred orthorhombic mmm: mirror ⊥ a, n-glide ⊥ b, a-glide ⊥ c, plus generated 2-folds/2₁ and inversion. Sixteen general positions. Teaching companion to Cmc21 (polar, no inversion).',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  { origin: [0.25, 0, 0], direction: [0, 0, 1], locus: '(¼, 0, z)', opIndex: 2, primary: true, kind: '21' },
  { origin: [0.75, 0.5, 0], direction: [0, 0, 1], locus: '(¾, ½, z)', opIndex: 2, primary: false, kind: '21' },
  { origin: [0, 0, 0], direction: [1, 0, 0], locus: '(x, 0, 0)', opIndex: 3, primary: true, kind: '2' },
  { origin: [0.25, 0, 0.25], direction: [0, 1, 0], locus: '(¼, y, ¼)', opIndex: 4, primary: true, kind: '2' },
]

function fmtFrac(v: number): string {
  if (Math.abs(v) < 1e-9) return '0'
  if (Math.abs(v - 0.25) < 1e-9) return '¼'
  if (Math.abs(v - 0.5) < 1e-9) return '½'
  if (Math.abs(v - 0.75) < 1e-9) return '¾'
  return String(v)
}

const INVERSION_POSITIONS: Vec3[] = [
  [0, 0, 0],
  [0.5, 0, 0.5],
  [0, 0.5, 0],
  [0.5, 0.5, 0.5],
  [0.25, 0.25, 0.25],
  [0.75, 0.75, 0.75],
]

const INVERSION_CENTERS: InversionCenterSpec[] = INVERSION_POSITIONS.map(
  (position, i) => ({
    position,
    primary: i === 0,
    locus: `(${fmtFrac(position[0])}, ${fmtFrac(position[1])}, ${fmtFrac(position[2])})`,
  }),
)

const GLIDE_PLANES: GlidePlaneSpec[] = [
  {
    planeValue: 0,
    normalAxis: 0,
    glide: [0, 0, 0],
    label: 'mirror',
    classId: 'mirror',
    opIndex: 7,
    primary: true,
    locus: 'x = 0, mirror (no glide)',
  },
  {
    planeValue: 0.5,
    normalAxis: 0,
    glide: [0, 0, 0],
    label: 'mirror',
    classId: 'mirror',
    opIndex: 7,
    primary: false,
    locus: 'x = ½, mirror (no glide)',
  },
  {
    planeValue: 0,
    normalAxis: 1,
    glide: [0.5, 0, 0.5],
    label: 'n-glide',
    classId: 'n-glide',
    opIndex: 8,
    primary: true,
    locus: 'y = 0, glide (½, 0, ½)',
  },
  {
    planeValue: 0.5,
    normalAxis: 1,
    glide: [0.5, 0, 0.5],
    label: 'n-glide',
    classId: 'n-glide',
    opIndex: 8,
    primary: false,
    locus: 'y = ½, glide (½, 0, ½)',
  },
  {
    planeValue: 0.25,
    normalAxis: 2,
    glide: [0.5, 0, 0],
    label: 'a-glide',
    classId: 'a-glide',
    opIndex: 6,
    primary: true,
    locus: 'z = ¼, glide (½, 0, 0)',
  },
  {
    planeValue: 0.75,
    normalAxis: 2,
    glide: [0.5, 0, 0],
    label: 'a-glide',
    classId: 'a-glide',
    opIndex: 6,
    primary: false,
    locus: 'z = ¾, glide (½, 0, 0)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  const map: Record<number, string | null> = {
    1: null,
    2: '2₁ axis at (¼, 0, z)',
    3: '2-fold axis ‖ a',
    4: '2-fold axis ‖ b',
    5: 'inversion at (0, 0, 0)',
    6: 'a-glide plane z = ¼ · glide (½, 0, 0)',
    7: 'mirror plane x = 0',
    8: 'n-glide plane y = 0 · glide (½, 0, ½)',
    9: 'C-centring translation (½, ½, 0)',
  }
  return map[opIndex] ?? OPERATORS.find((o) => o.index === opIndex)?.label ?? null
}

export const cmcaDemo: SpaceGroupDemo = {
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
  shortName: 'Cmca',
}
