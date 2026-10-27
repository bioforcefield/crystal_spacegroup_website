/** Space group 12 · C2/m — monoclinic, unique axis b, cell choice 1 (ITA). */

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
  mirror: { id: 'mirror', label: 'mirror ⊥ b', color: '#facc15' },
  'a-glide': { id: 'a-glide', label: 'a-glide ⊥ b', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'twofold',
  'screw',
  'inversion',
  'mirror',
  'a-glide',
]

export const OPERATORS: Operator[] = buildOperatorsFromTriplets([
  'x, y, z',
  '−x, y, −z',
  '−x, −y, −z',
  'x, −y, z',
  'x+½, y+½, z',
  '−x+½, y+½, −z',
  '−x+½, −y+½, −z',
  'x+½, −y+½, z',
]).map((op) => {
  switch (op.index) {
    case 1:
      return { ...op, seitz: '{1 | 0}' }
    case 2:
      return { ...op, label: '2-fold ‖ b', classId: 'twofold', seitz: '{2₀₁₀ | 0}' }
    case 3:
      return { ...op, label: 'Inversion (−1)', classId: 'inversion', seitz: '{-1 | 0}' }
    case 4:
      return {
        ...op,
        label: 'mirror ⊥ b',
        classId: 'mirror',
        seitz: '{m₀₁₀ | 0}',
      }
    case 5:
      return { ...op, label: 'C-centring', classId: 'identity', seitz: '{1 | ½,½,0}' }
    case 6:
      return {
        ...op,
        label: '2₁ screw ‖ b',
        classId: 'screw',
        seitz: '{2₀₁₀ | ½,½,0}',
      }
    case 7:
      return {
        ...op,
        label: 'Inversion at ¼,¼,0',
        classId: 'inversion',
        seitz: '{-1 | ½,½,0}',
      }
    case 8:
      return {
        ...op,
        label: 'a-glide ⊥ b',
        classId: 'a-glide',
        seitz: '{m₀₁₀ | ½,½,0}',
      }
    default:
      return op
  }
})

export const META: SpaceGroupMeta = {
  number: 12,
  hm: 'C2/m',
  system: 'monoclinic',
  pointGroup: '2/m',
  lattice: 'C-centred',
  multiplicity: 8,
  blurb:
    'C2/m (~0.5% of CSD) is the C-centred mirror twin of C2/c: a 2-fold ‖ b, a true mirror ⊥ b, plus C-centring that generates a 2₁ ‖ b and an a-glide at y = ¼. Teaching cell uses β ≈ 110°. Contrast with C2/c (c-glide / n-glide instead of mirror / a-glide).',
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
    origin: [0.25, 0, 0],
    direction: [0, 1, 0],
    locus: '(¼, y, 0)',
    opIndex: 6,
    primary: true,
    kind: '21',
  },
  {
    origin: [0.75, 0, 0],
    direction: [0, 1, 0],
    locus: '(¾, y, 0)',
    opIndex: 6,
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
  [0, 0, 0.5],
  [0.5, 0.5, 0],
  [0.5, 0.5, 0.5],
  [0.25, 0.25, 0],
  [0.25, 0.25, 0.5],
  [0.75, 0.75, 0],
  [0.75, 0.75, 0.5],
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
  {
    planeValue: 0.25,
    normalAxis: 1,
    glide: [0.5, 0, 0],
    label: 'a-glide',
    classId: 'a-glide',
    opIndex: 8,
    primary: true,
    locus: 'y = ¼, glide (½, 0, 0)',
  },
  {
    planeValue: 0.75,
    normalAxis: 1,
    glide: [0.5, 0, 0],
    label: 'a-glide',
    classId: 'a-glide',
    opIndex: 8,
    primary: false,
    locus: 'y = ¾, glide (½, 0, 0)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  switch (opIndex) {
    case 1:
      return null
    case 2:
      return '2-fold axis at (0, y, 0)'
    case 3:
      return 'inversion at (0, 0, 0)'
    case 4:
      return 'mirror plane y = 0'
    case 5:
      return 'C-centring translation (½, ½, 0)'
    case 6:
      return '2₁ axis at (¼, y, 0)'
    case 7:
      return 'inversion at (¼, ¼, 0)'
    case 8:
      return 'a-glide plane y = ¼ · glide (½, 0, 0)'
    default:
      return null
  }
}

export const c2mDemo: SpaceGroupDemo = {
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
  shortName: 'C2/m',
}
