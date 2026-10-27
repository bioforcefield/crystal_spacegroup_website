/** Space group 43 · Fdd2 — F-centred orthorhombic polar (ITA). */

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
  twofold: { id: 'twofold', label: '2-fold ‖ c', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4-fold', color: '#a5b4fc' },
  screw: { id: 'screw', label: 'screw', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  mirror: { id: 'mirror', label: 'mirror', color: '#facc15' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide ⊥ a,b', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'twofold',
  'd-glide',
]

const RAW = buildOperatorsFromTriplets([
  'x,y,z',
  '-x,-y,z',
  '-x+1/4,y+1/4,z+1/4',
  'x+1/4,-y+1/4,z+1/4',
  'x,y+1/2,z+1/2',
  '-x,-y+1/2,z+1/2',
  '-x+1/4,y+3/4,z+3/4',
  'x+1/4,-y+3/4,z+3/4',
  'x+1/2,y,z+1/2',
  '-x+1/2,-y,z+1/2',
  '-x+3/4,y+1/4,z+3/4',
  'x+3/4,-y+1/4,z+3/4',
  'x+1/2,y+1/2,z',
  '-x+1/2,-y+1/2,z',
  '-x+3/4,y+3/4,z+1/4',
  'x+3/4,-y+3/4,z+1/4',
])

export const OPERATORS: Operator[] = RAW.map((op) => {
  const t = op.t
  const isCentring =
    op.classId === 'identity' && t.some((c) => Math.abs(c) > 1e-6)
  if (op.index === 1) {
    return { ...op, seitz: '{1 | 0}' }
  }
  if (op.index === 2) {
    return {
      ...op,
      label: '2-fold ‖ c',
      classId: 'twofold' as SymmetryClassId,
      seitz: '{2₀₀₁ | 0}',
    }
  }
  // d-glides: ops with improper R reflecting one axis + (¼,¼,¼)-type glide
  if (op.index === 3 || op.index === 7 || op.index === 11 || op.index === 15) {
    return {
      ...op,
      label: 'd-glide ⊥ a',
      classId: 'd-glide' as SymmetryClassId,
    }
  }
  if (op.index === 4 || op.index === 8 || op.index === 12 || op.index === 16) {
    return {
      ...op,
      label: 'd-glide ⊥ b',
      classId: 'd-glide' as SymmetryClassId,
    }
  }
  if (isCentring) {
    return { ...op, label: 'F-centring', classId: 'identity' as SymmetryClassId }
  }
  if (op.R[2][2] === 1 && op.R[0][0] === -1 && op.R[1][1] === -1) {
    return { ...op, label: '2-fold ‖ c (F)', classId: 'twofold' as SymmetryClassId }
  }
  return op
})

export const META: SpaceGroupMeta = {
  number: 43,
  hm: 'Fdd2',
  system: 'orthorhombic',
  pointGroup: 'mm2',
  lattice: 'F-centred',
  multiplicity: 16,
  blurb:
    'Fdd2 (~0.3% of CSD) is the classic F-centred polar orthorhombic group: a pure 2-fold ‖ c plus diamond (d) glides ⊥ a and ⊥ b — no inversion. Teaching showcase for d-glides (¼,¼,¼-type) and F-centring; sixteen general positions.',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  {
    origin: [0, 0, 0],
    direction: [0, 0, 1],
    locus: '(0, 0, z)',
    opIndex: 2,
    primary: true,
    kind: '2',
  },
  {
    origin: [0.5, 0.5, 0],
    direction: [0, 0, 1],
    locus: '(½, ½, z)',
    opIndex: 2,
    primary: false,
    kind: '2',
  },
  {
    origin: [0.5, 0, 0],
    direction: [0, 0, 1],
    locus: '(½, 0, z)',
    opIndex: 10,
    primary: false,
    kind: '2',
  },
  {
    origin: [0, 0.5, 0],
    direction: [0, 0, 1],
    locus: '(0, ½, z)',
    opIndex: 6,
    primary: false,
    kind: '2',
  },
]

/** Primary d-glides at x=⅛ and y=⅛; F images omitted for clarity. */
const GLIDE_PLANES: GlidePlaneSpec[] = [
  {
    planeValue: 0.125,
    normalAxis: 0,
    glide: [0, 0.25, 0.25],
    label: 'd-glide',
    classId: 'd-glide',
    opIndex: 3,
    primary: true,
    locus: 'x = ⅛, glide (0, ¼, ¼)',
  },
  {
    planeValue: 0.625,
    normalAxis: 0,
    glide: [0, 0.25, 0.25],
    label: 'd-glide',
    classId: 'd-glide',
    opIndex: 3,
    primary: false,
    locus: 'x = ⅝, glide (0, ¼, ¼)',
  },
  {
    planeValue: 0.125,
    normalAxis: 1,
    glide: [0.25, 0, 0.25],
    label: 'd-glide',
    classId: 'd-glide',
    opIndex: 4,
    primary: true,
    locus: 'y = ⅛, glide (¼, 0, ¼)',
  },
  {
    planeValue: 0.625,
    normalAxis: 1,
    glide: [0.25, 0, 0.25],
    label: 'd-glide',
    classId: 'd-glide',
    opIndex: 4,
    primary: false,
    locus: 'y = ⅝, glide (¼, 0, ¼)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  switch (opIndex) {
    case 1:
      return null
    case 2:
      return '2-fold axis at (0, 0, z)'
    case 3:
      return 'd-glide plane x = ⅛ · glide (0, ¼, ¼)'
    case 4:
      return 'd-glide plane y = ⅛ · glide (¼, 0, ¼)'
    case 5:
    case 9:
    case 13:
      return 'F-centring translation'
    default:
      return OPERATORS.find((o) => o.index === opIndex)?.label ?? null
  }
}

export const fdd2Demo: SpaceGroupDemo = {
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
  shortName: 'Fdd2',
}
