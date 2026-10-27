/** Space group 10 · P2/m — monoclinic, unique axis b (ITA P12/m1). */

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

export const CELL: CellParams = { a: 1, b: 1.15, c: 1.35, betaDeg: 110 }
export const SEED: Vec3 = [0.18, 0.22, 0.31]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold ‖ b', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4-fold', color: '#a5b4fc' },
  sixfold: { id: 'sixfold', label: '6-fold', color: '#818cf8' },
  screw: { id: 'screw', label: 'screw', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  mirror: { id: 'mirror', label: 'mirror ⊥ b', color: '#facc15' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'twofold',
  'inversion',
  'mirror',
]

export const OPERATORS: Operator[] = buildOperatorsFromTriplets([
  'x, y, z',
  '−x, y, −z',
  '−x, −y, −z',
  'x, −y, z',
]).map((op) => {
  if (op.index === 1) return { ...op, seitz: '{1 | 0}' }
  if (op.index === 2) {
    return { ...op, label: '2-fold ‖ b', classId: 'twofold', seitz: '{2₀₁₀ | 0}' }
  }
  if (op.index === 3) {
    return { ...op, label: 'Inversion (−1)', classId: 'inversion', seitz: '{-1 | 0}' }
  }
  if (op.index === 4) {
    return {
      ...op,
      label: 'mirror ⊥ b',
      classId: 'mirror',
      seitz: '{m₀₁₀ | 0}',
    }
  }
  return op
})

export const META: SpaceGroupMeta = {
  number: 10,
  hm: 'P2/m',
  system: 'monoclinic',
  pointGroup: '2/m',
  lattice: 'Primitive',
  multiplicity: 4,
  blurb:
    'P2/m is the centrosymmetric monoclinic baseline: a true 2-fold ‖ b, a pure mirror ⊥ b through y = 0, and inversion. Teaching cell uses β ≈ 110°. Contrast with P21/m (screw + mirror at y = ¼) and P21/c (screw + c-glide).',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  {
    origin: [0, 0, 0],
    direction: [0, 1, 0],
    locus: '(0, y, 0)',
    opIndex: 2,
    primary: true,
    kind: '2',
  },
  {
    origin: [0.5, 0, 0],
    direction: [0, 1, 0],
    locus: '(½, y, 0)',
    opIndex: 2,
    primary: false,
    kind: '2',
  },
  {
    origin: [0, 0, 0.5],
    direction: [0, 1, 0],
    locus: '(0, y, ½)',
    opIndex: 2,
    primary: false,
    kind: '2',
  },
  {
    origin: [0.5, 0, 0.5],
    direction: [0, 1, 0],
    locus: '(½, y, ½)',
    opIndex: 2,
    primary: false,
    kind: '2',
  },
]

function fmtFrac(v: number): string {
  if (Math.abs(v) < 1e-9) return '0'
  if (Math.abs(v - 0.5) < 1e-9) return '½'
  return String(v)
}

const INVERSION_POSITIONS: Vec3[] = [
  [0, 0, 0],
  [0.5, 0, 0],
  [0, 0, 0.5],
  [0.5, 0, 0.5],
  [0, 0.5, 0],
  [0.5, 0.5, 0],
  [0, 0.5, 0.5],
  [0.5, 0.5, 0.5],
]

const INVERSION_CENTERS: InversionCenterSpec[] = INVERSION_POSITIONS.map(
  (position) => ({
    position,
    primary: position[0] === 0 && position[1] === 0 && position[2] === 0,
    locus: `(${fmtFrac(position[0])}, ${fmtFrac(position[1])}, ${fmtFrac(position[2])})`,
  }),
)

const GLIDE_PLANES: GlidePlaneSpec[] = [
  {
    planeValue: 0,
    normalAxis: 1,
    glide: [0, 0, 0],
    label: 'mirror',
    classId: 'mirror',
    opIndex: 4,
    primary: true,
    locus: 'y = 0, mirror (no glide)',
  },
  {
    planeValue: 0.5,
    normalAxis: 1,
    glide: [0, 0, 0],
    label: 'mirror',
    classId: 'mirror',
    opIndex: 4,
    primary: false,
    locus: 'y = ½, mirror (no glide)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  if (opIndex === 1) return null
  if (opIndex === 2) return '2-fold axis ‖ b'
  if (opIndex === 3) return 'inversion at (0, 0, 0)'
  if (opIndex === 4) return 'mirror plane ⊥ b at y = 0'
  return null
}

export const p2mDemo: SpaceGroupDemo = {
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
  defaultProjection: 'b',
  primaryInversionOp: 3,
  shortName: 'P2/m',
}
