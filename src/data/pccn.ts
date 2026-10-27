/** Space group 56 · Pccn — orthorhombic centrosymmetric (ITA). */

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
  twofold: { id: 'twofold', label: '2-fold ‖ c', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4-fold', color: '#a5b4fc' },
  sixfold: { id: 'sixfold', label: '6-fold', color: '#818cf8' },
  screw: { id: 'screw', label: '2₁ screw ‖ a,b', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  mirror: { id: 'mirror', label: 'mirror', color: '#facc15' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide ⊥ a,b', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide ⊥ c', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'twofold',
  'screw',
  'inversion',
  'c-glide',
  'n-glide',
]

const RAW = buildOperatorsFromTriplets([
  'x,y,z',
  '-x+1/2,-y+1/2,z',
  'x+1/2,-y,-z+1/2',
  '-x,y+1/2,-z+1/2',
  '-x,-y,-z',
  'x+1/2,y+1/2,-z',
  '-x+1/2,y,z+1/2',
  'x,-y+1/2,z+1/2',
])

const POLISH: Record<number, { label: string; classId: SymmetryClassId; seitz?: string }> = {
  1: { label: 'Identity', classId: 'identity', seitz: '{1 | 0}' },
  2: { label: '2-fold ‖ c', classId: 'twofold', seitz: '{2₀₀₁ | ½,½,0}' },
  3: { label: '2₁ screw ‖ a', classId: 'screw', seitz: '{2₁₀₀ | ½,0,½}' },
  4: { label: '2₁ screw ‖ b', classId: 'screw', seitz: '{2₀₁₀ | 0,½,½}' },
  5: { label: 'Inversion (−1)', classId: 'inversion', seitz: '{-1 | 0}' },
  6: { label: 'n-glide ⊥ c', classId: 'n-glide', seitz: '{m₀₀₁ | ½,½,0}' },
  7: { label: 'c-glide ⊥ a', classId: 'c-glide', seitz: '{m₁₀₀ | ½,0,½}' },
  8: { label: 'c-glide ⊥ b', classId: 'c-glide', seitz: '{m₀₁₀ | 0,½,½}' },
}

export const OPERATORS: Operator[] = RAW.map((op) => {
  const p = POLISH[op.index]!
  return { ...op, label: p.label, classId: p.classId, seitz: p.seitz ?? op.seitz }
})

export const META: SpaceGroupMeta = {
  number: 56,
  hm: 'Pccn',
  system: 'orthorhombic',
  pointGroup: 'mmm',
  lattice: 'Primitive',
  multiplicity: 8,
  blurb:
    'Pccn (~0.3% of CSD) is a centrosymmetric orthorhombic group with two c-glides (⊥ a and ⊥ b) and an n-glide ⊥ c. Those generate a pure 2-fold ‖ c, 2₁ screws ‖ a and b, plus inversion — eight general positions. Teaching contrast with Pbca / Pbcn (different glide triplets).',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  {
    origin: [0.25, 0.25, 0],
    direction: [0, 0, 1],
    locus: '(¼, ¼, z)',
    opIndex: 2,
    primary: true,
    kind: '2',
  },
  {
    origin: [0.75, 0.75, 0],
    direction: [0, 0, 1],
    locus: '(¾, ¾, z)',
    opIndex: 2,
    primary: false,
    kind: '2',
  },
  {
    origin: [0, 0, 0.25],
    direction: [1, 0, 0],
    locus: '(x, 0, ¼)',
    opIndex: 3,
    primary: true,
    kind: '21',
  },
  {
    origin: [0, 0.5, 0.75],
    direction: [1, 0, 0],
    locus: '(x, ½, ¾)',
    opIndex: 3,
    primary: false,
    kind: '21',
  },
  {
    origin: [0, 0, 0.25],
    direction: [0, 1, 0],
    locus: '(0, y, ¼)',
    opIndex: 4,
    primary: true,
    kind: '21',
  },
  {
    origin: [0.5, 0, 0.75],
    direction: [0, 1, 0],
    locus: '(½, y, ¾)',
    opIndex: 4,
    primary: false,
    kind: '21',
  },
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
  [0.5, 0, 0],
  [0, 0.5, 0],
  [0, 0, 0.5],
  [0.5, 0.5, 0],
  [0.5, 0, 0.5],
  [0, 0.5, 0.5],
  [0.5, 0.5, 0.5],
]

const INVERSION_CENTERS: InversionCenterSpec[] = INVERSION_POSITIONS.map(
  (position) => ({
    position,
    primary: position.every((c) => c === 0),
    locus: `(${fmtFrac(position[0])}, ${fmtFrac(position[1])}, ${fmtFrac(position[2])})`,
  }),
)

const GLIDE_PLANES: GlidePlaneSpec[] = [
  {
    planeValue: 0.25,
    normalAxis: 0,
    glide: [0, 0, 0.5],
    label: 'c-glide',
    classId: 'c-glide',
    opIndex: 7,
    primary: true,
    locus: 'x = ¼, glide (0, 0, ½)',
  },
  {
    planeValue: 0.75,
    normalAxis: 0,
    glide: [0, 0, 0.5],
    label: 'c-glide',
    classId: 'c-glide',
    opIndex: 7,
    primary: false,
    locus: 'x = ¾, glide (0, 0, ½)',
  },
  {
    planeValue: 0.25,
    normalAxis: 1,
    glide: [0, 0, 0.5],
    label: 'c-glide',
    classId: 'c-glide',
    opIndex: 8,
    primary: true,
    locus: 'y = ¼, glide (0, 0, ½)',
  },
  {
    planeValue: 0.75,
    normalAxis: 1,
    glide: [0, 0, 0.5],
    label: 'c-glide',
    classId: 'c-glide',
    opIndex: 8,
    primary: false,
    locus: 'y = ¾, glide (0, 0, ½)',
  },
  {
    planeValue: 0,
    normalAxis: 2,
    glide: [0.5, 0.5, 0],
    label: 'n-glide',
    classId: 'n-glide',
    opIndex: 6,
    primary: true,
    locus: 'z = 0, glide (½, ½, 0)',
  },
  {
    planeValue: 0.5,
    normalAxis: 2,
    glide: [0.5, 0.5, 0],
    label: 'n-glide',
    classId: 'n-glide',
    opIndex: 6,
    primary: false,
    locus: 'z = ½, glide (½, ½, 0)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  switch (opIndex) {
    case 1:
      return null
    case 2:
      return '2-fold axis at (¼, ¼, z)'
    case 3:
      return '2₁ axis at (x, 0, ¼)'
    case 4:
      return '2₁ axis at (0, y, ¼)'
    case 5:
      return 'inversion at (0, 0, 0)'
    case 6:
      return 'n-glide plane z = 0 · glide (½, ½, 0)'
    case 7:
      return 'c-glide plane x = ¼ · glide (0, 0, ½)'
    case 8:
      return 'c-glide plane y = ¼ · glide (0, 0, ½)'
    default:
      return null
  }
}

export const pccnDemo: SpaceGroupDemo = {
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
  shortName: 'Pccn',
}
