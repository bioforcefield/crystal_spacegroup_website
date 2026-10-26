/** Space group 88 · I41/a — tetragonal, origin choice 1 (ITA I 41/a:1). */

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

/** Tetragonal teaching cell: a = b, γ = 90°, c elongated. */
export const CELL: CellParams = { a: 1, b: 1, c: 1.4 }
export const SEED: Vec3 = [0.17, 0.23, 0.31]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold ‖ c', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '−4 ‖ c', color: '#a5b4fc' },
  screw: { id: 'screw', label: '4₁ screw ‖ c', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  mirror: { id: 'mirror', label: 'mirror', color: '#facc15' },
  'a-glide': { id: 'a-glide', label: 'a-glide ⊥ c', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'screw',
  'twofold',
  'fourfold',
  'inversion',
  'a-glide',
]

const RAW = buildOperatorsFromTriplets([
  'x,y,z',
  '-y,x+1/2,z+1/4',
  '-x+1/2,-y+1/2,z+1/2',
  'y+1/2,-x,z+3/4',
  '-x,-y+1/2,-z+1/4',
  'y,-x,-z',
  'x+1/2,y,-z+3/4',
  '-y+1/2,x+1/2,-z+1/2',
  'x+1/2,y+1/2,z+1/2',
  '-y+1/2,x,z+3/4',
  '-x,-y,z',
  'y,-x+1/2,z+1/4',
  '-x+1/2,-y,-z+3/4',
  'y+1/2,-x+1/2,-z+1/2',
  'x,y+1/2,-z+1/4',
  '-y,x,-z',
])

const POLISH: Record<
  number,
  { label: string; classId: SymmetryClassId; seitz?: string }
> = {
  1: { label: 'Identity', classId: 'identity', seitz: '{1 | 0}' },
  2: { label: '4₁ screw ‖ c', classId: 'screw', seitz: '{4₀₀₁ | 0,½,¼}' },
  3: { label: '2₁ screw ‖ c', classId: 'screw', seitz: '{2₀₀₁ | ½,½,½}' },
  4: { label: '4₁³ screw ‖ c', classId: 'screw', seitz: '{4₀₀₁³ | ½,0,¾}' },
  5: { label: 'Inversion (−1)', classId: 'inversion', seitz: '{-1 | 0,½,¼}' },
  6: { label: '−4 ‖ c', classId: 'fourfold', seitz: '{-4₀₀₁ | 0}' },
  7: { label: 'a-glide ⊥ c', classId: 'a-glide', seitz: '{m₀₀₁ | ½,0,¾}' },
  8: { label: '−4 ‖ c (related)', classId: 'fourfold' },
  9: { label: 'I-centring', classId: 'identity', seitz: '{1 | ½,½,½}' },
  10: { label: '4₁ screw ‖ c (I)', classId: 'screw' },
  11: { label: '2-fold ‖ c', classId: 'twofold', seitz: '{2₀₀₁ | 0}' },
  12: { label: '4₁³ screw ‖ c (I)', classId: 'screw' },
  13: { label: 'Inversion (I-related)', classId: 'inversion' },
  14: { label: '−4 ‖ c (I)', classId: 'fourfold' },
  15: { label: 'a-glide ⊥ c (I)', classId: 'a-glide' },
  16: { label: '−4 ‖ c (I)', classId: 'fourfold' },
}

export const OPERATORS: Operator[] = RAW.map((op) => {
  const p = POLISH[op.index]!
  return { ...op, label: p.label, classId: p.classId, seitz: p.seitz ?? op.seitz }
})

export const META: SpaceGroupMeta = {
  number: 88,
  hm: 'I41/a',
  system: 'tetragonal',
  pointGroup: '4/m',
  lattice: 'I-centred',
  multiplicity: 16,
  blurb:
    'I41/a (~0.4% of CSD) is the common body-centred tetragonal group: a 4₁ screw ‖ c, −4, an a-glide ⊥ c, plus I-centring — sixteen general positions. Teaching cell uses a = b with elongated c. First hand-polished tetragonal exemplar (origin choice 1).',
}

/** 4₁ at (¾,¼,z); 2 ‖ c at (0,0,z); −4 at (0,0,z); I-related axes. */
const SCREW_AXES: ScrewAxisSpec[] = [
  {
    origin: [0.75, 0.25, 0],
    direction: [0, 0, 1],
    locus: '(¾, ¼, z)',
    opIndex: 2,
    primary: true,
    kind: '41',
  },
  {
    origin: [0.25, 0.75, 0],
    direction: [0, 0, 1],
    locus: '(¼, ¾, z)',
    opIndex: 10,
    primary: false,
    kind: '41',
  },
  {
    origin: [0, 0, 0],
    direction: [0, 0, 1],
    locus: '(0, 0, z)',
    opIndex: 11,
    primary: true,
    kind: '2',
  },
  {
    origin: [0.5, 0.5, 0],
    direction: [0, 0, 1],
    locus: '(½, ½, z)',
    opIndex: 11,
    primary: false,
    kind: '2',
  },
  {
    origin: [0, 0, 0],
    direction: [0, 0, 1],
    locus: '(0, 0, z)',
    opIndex: 6,
    primary: true,
    kind: 'bar4',
  },
  {
    origin: [0.5, 0.5, 0],
    direction: [0, 0, 1],
    locus: '(½, ½, z)',
    opIndex: 14,
    primary: false,
    kind: 'bar4',
  },
]

function fmtFrac(v: number): string {
  const w = ((v % 1) + 1) % 1
  if (Math.abs(w) < 1e-9 || Math.abs(w - 1) < 1e-9) return '0'
  if (Math.abs(w - 0.125) < 1e-9) return '⅛'
  if (Math.abs(w - 0.25) < 1e-9) return '¼'
  if (Math.abs(w - 0.375) < 1e-9) return '⅜'
  if (Math.abs(w - 0.5) < 1e-9) return '½'
  if (Math.abs(w - 0.625) < 1e-9) return '⅝'
  if (Math.abs(w - 0.75) < 1e-9) return '¾'
  if (Math.abs(w - 0.875) < 1e-9) return '⅞'
  return w.toFixed(3)
}

/** Inversions from R=−I ops (t/2) plus lattice images for teaching density. */
const INVERSION_POSITIONS: Vec3[] = [
  [0, 0.25, 0.125],
  [0.5, 0.75, 0.625],
  [0.5, 0, 0.375],
  [0, 0.5, 0.875],
]

const INVERSION_CENTERS: InversionCenterSpec[] = INVERSION_POSITIONS.map(
  (position, i) => ({
    position,
    primary: i === 0,
    locus: `(${fmtFrac(position[0])}, ${fmtFrac(position[1])}, ${fmtFrac(position[2])})`,
  }),
)

/** a-glide ⊥ c: plane z = ⅜, glide (½,0,0); I-related z = ⅞. */
const GLIDE_PLANES: GlidePlaneSpec[] = [
  {
    planeValue: 0.375,
    normalAxis: 2,
    glide: [0.5, 0, 0],
    label: 'a-glide',
    classId: 'a-glide',
    opIndex: 7,
    primary: true,
    locus: 'z = ⅜, glide (½, 0, 0)',
  },
  {
    planeValue: 0.875,
    normalAxis: 2,
    glide: [0.5, 0, 0],
    label: 'a-glide',
    classId: 'a-glide',
    opIndex: 15,
    primary: true,
    locus: 'z = ⅞, glide (½, 0, 0)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  switch (opIndex) {
    case 1:
      return null
    case 2:
    case 4:
      return '4₁ axis at (¾, ¼, z)'
    case 3:
      return '2₁ axis ‖ c'
    case 5:
      return 'inversion at (0, ¼, ⅛)'
    case 6:
    case 8:
      return '−4 axis at (0, 0, z)'
    case 7:
      return 'a-glide plane z = ⅜ · glide (½, 0, 0)'
    case 9:
      return 'I-centring translation (½, ½, ½)'
    case 11:
      return '2-fold axis at (0, 0, z)'
    default:
      return POLISH[opIndex]?.label ?? null
  }
}

export const i41aDemo: SpaceGroupDemo = {
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
  shortName: 'I41/a',
}
