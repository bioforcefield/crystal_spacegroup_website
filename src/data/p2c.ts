/** Space group 13 · P2/c — monoclinic, unique axis b, cell choice 1 (ITA). */

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
  screw: { id: 'screw', label: '2₁ screw ‖ b', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  mirror: { id: 'mirror', label: 'mirror', color: '#facc15' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide ⊥ b', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'twofold',
  'inversion',
  'c-glide',
]

export const OPERATORS: Operator[] = buildOperatorsFromTriplets([
  'x, y, z',
  '−x, y, −z+½',
  '−x, −y, −z',
  'x, −y, z+½',
]).map((op) => {
  switch (op.index) {
    case 1:
      return { ...op, seitz: '{1 | 0}' }
    case 2:
      return {
        ...op,
        label: '2-fold ‖ b',
        classId: 'twofold',
        seitz: '{2₀₁₀ | 0,0,½}',
      }
    case 3:
      return { ...op, label: 'Inversion (−1)', classId: 'inversion', seitz: '{-1 | 0}' }
    case 4:
      return {
        ...op,
        label: 'c-glide ⊥ b',
        classId: 'c-glide',
        seitz: '{m₀₁₀ | 0,0,½}',
      }
    default:
      return op
  }
})

export const META: SpaceGroupMeta = {
  number: 13,
  hm: 'P2/c',
  system: 'monoclinic',
  pointGroup: '2/m',
  lattice: 'Primitive',
  multiplicity: 4,
  blurb:
    'P2/c (~0.7% of CSD) is the pure-2 twin of P21/c: a 2-fold ‖ b (at z = ¼) with a c-glide ⊥ b at y = 0, plus inversion. Teaching cell uses β ≈ 110°. Contrast with P21/c (2₁ + c-glide at y = ¼) and with Pc (glide only, no 2-fold).',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  {
    origin: [0, 0, 0.25],
    direction: [0, 1, 0],
    locus: '(0, y, ¼)',
    opIndex: 2,
    primary: true,
    kind: '2',
  },
  {
    origin: [0.5, 0, 0.25],
    direction: [0, 1, 0],
    locus: '(½, y, ¼)',
    opIndex: 2,
    primary: false,
    kind: '2',
  },
  {
    origin: [0, 0, 0.75],
    direction: [0, 1, 0],
    locus: '(0, y, ¾)',
    opIndex: 2,
    primary: false,
    kind: '2',
  },
  {
    origin: [0.5, 0, 0.75],
    direction: [0, 1, 0],
    locus: '(½, y, ¾)',
    opIndex: 2,
    primary: false,
    kind: '2',
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
  [0.5, 0.5, 0],
  [0, 0, 0.5],
  [0.5, 0, 0.5],
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
]

export function elementLocusForOp(opIndex: number): string | null {
  switch (opIndex) {
    case 1:
      return null
    case 2:
      return '2-fold axis at (0, y, ¼)'
    case 3:
      return 'inversion at (0, 0, 0)'
    case 4:
      return 'c-glide plane y = 0 · glide (0, 0, ½)'
    default:
      return null
  }
}

export const p2cDemo: SpaceGroupDemo = {
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
  shortName: 'P2/c',
}
