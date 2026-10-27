/** Space group 194 · P6₃/mmc — hexagonal HCP / layered archetype (ITA). */

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

export const CELL: CellParams = { a: 1, b: 1, c: 1.6, gammaDeg: 120 }
export const SEED: Vec3 = [0.17, 0.23, 0.31]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold ‖ c', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4-fold', color: '#a5b4fc' },
  sixfold: { id: 'sixfold', label: '6-fold', color: '#818cf8' },
  screw: { id: 'screw', label: '6₃ / 2₁ ‖ c', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  mirror: { id: 'mirror', label: 'mirror', color: '#facc15' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide / m ⊥ c', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'screw',
  'threefold',
  'inversion',
  'mirror',
  'c-glide',
]

const triplets = (
  itaJson as { groups: { number: number; triplets: string[] }[] }
).groups.find((g) => g.number === 194)!.triplets

function det3(R: number[][]): number {
  return (
    R[0][0] * (R[1][1] * R[2][2] - R[1][2] * R[2][1]) -
    R[0][1] * (R[1][0] * R[2][2] - R[1][2] * R[2][0]) +
    R[0][2] * (R[1][0] * R[2][1] - R[1][1] * R[2][0])
  )
}
function tr3(R: number[][]): number {
  return R[0][0] + R[1][1] + R[2][2]
}

const RAW = buildOperatorsFromTriplets(triplets)

export const OPERATORS: Operator[] = RAW.map((op) => {
  const det = Math.round(det3(op.R))
  const tr = Math.round(tr3(op.R))
  const t = op.t
  const tz = Math.abs(((t[2] % 1) + 1) % 1)

  if (op.index === 1) return { ...op, seitz: '{1 | 0}' }
  if (det === -1 && tr === -3) {
    return {
      ...op,
      label: 'Inversion (−1)',
      classId: 'inversion' as SymmetryClassId,
      seitz: '{-1 | 0}',
    }
  }
  // 6₃: det 1, tr 2, t_z = ½
  if (det === 1 && tr === 2) {
    return { ...op, label: '6₃ screw ‖ c', classId: 'screw' as SymmetryClassId }
  }
  // 3-fold ‖ c
  if (det === 1 && tr === 0) {
    return { ...op, label: '3-fold ‖ c', classId: 'threefold' as SymmetryClassId }
  }
  // 2₁ ‖ c
  if (det === 1 && tr === -1 && Math.abs(tz - 0.5) < 0.02) {
    return { ...op, label: '2₁ screw ‖ c', classId: 'screw' as SymmetryClassId }
  }
  if (det === 1 && tr === -1) {
    return { ...op, label: '2-fold', classId: 'screw' as SymmetryClassId }
  }
  // horizontal c-glide / mirror with ½ along c
  if (det === -1 && tr === 1 && Math.abs(tz - 0.5) < 0.02) {
    return { ...op, label: 'c-glide / m⊥c', classId: 'c-glide' as SymmetryClassId }
  }
  // vertical mirrors (t ≈ 0)
  if (det === -1 && tr === 1 && t.every((c) => Math.abs(c) < 1e-6)) {
    return { ...op, label: 'mirror', classId: 'mirror' as SymmetryClassId }
  }
  if (det === -1 && (tr === 0 || tr === -2)) {
    return { ...op, label: '−6 / −3', classId: 'threefold' as SymmetryClassId }
  }
  if (det === -1) {
    return { ...op, label: 'mirror / glide', classId: 'mirror' as SymmetryClassId }
  }
  return op
})

export const META: SpaceGroupMeta = {
  number: 194,
  hm: 'P63/mmc',
  system: 'hexagonal',
  pointGroup: '6/mmm',
  lattice: 'Primitive',
  multiplicity: 24,
  blurb:
    'P6₃/mmc is the HCP / graphite / many layered-materials archetype: 6₃ screws ‖ c, 3-folds, vertical mirrors, and c-glides. Teaching cell uses hexagonal γ = 120°.',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  {
    origin: [0, 0, 0],
    direction: [0, 0, 1],
    locus: '(0, 0, z)',
    opIndex: 2,
    primary: true,
    kind: '63',
  },
  {
    origin: [0, 0, 0],
    direction: [0, 0, 1],
    locus: '(0, 0, z) · 3-fold',
    opIndex: 3,
    primary: true,
    kind: '3',
  },
  {
    origin: [0, 0, 0],
    direction: [0, 0, 1],
    locus: '(0, 0, z) · 2₁',
    opIndex: 4,
    primary: false,
    kind: '21',
  },
]

const INVERSION_CENTERS: InversionCenterSpec[] = [
  { position: [0, 0, 0], primary: true, locus: '(0, 0, 0)' },
  { position: [0, 0, 0.5], primary: false, locus: '(0, 0, ½)' },
]

/** Vertical mirror containing a (approx x,x−y plane family) + horizontal c-related. */
const GLIDE_PLANES: GlidePlaneSpec[] = [
  {
    // vertical mirror: x, x−y, z → plane normal in ab; teach as axis-aligned proxy y=0? 
    // Op 20: x, x-y, z is reflection through plane containing a and c (the plane y = x/2... )
    // Simpler teaching: horizontal c-glide at z=¼ (op 16: x,y,−z+½)
    planeValue: 0.25,
    normalAxis: 2,
    glide: [0, 0, 0.5],
    label: 'c-glide',
    classId: 'c-glide',
    opIndex: 16,
    primary: true,
    locus: 'z = ¼ · c-glide (horizontal)',
  },
  {
    planeValue: 0,
    normalAxis: 1,
    glide: [0, 0, 0],
    label: 'mirror',
    classId: 'mirror',
    opIndex: 22,
    primary: true,
    locus: 'y = 0 · vertical mirror (teaching)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  if (opIndex === 1) return null
  const op = OPERATORS.find((o) => o.index === opIndex)
  if (!op) return null
  if (op.classId === 'screw' && op.label.includes('6₃')) return '6₃ screw axis ‖ c'
  if (op.classId === 'threefold') return '3-fold axis ‖ c'
  if (op.classId === 'inversion') return 'inversion centre'
  if (op.classId === 'mirror') return 'mirror plane'
  if (op.classId === 'c-glide') return 'c-glide plane'
  return op.label
}

export const FOCUS_OPS = [1, 2, 3, 4, 13, 16, 20, 22]

export const p63mmcDemo: SpaceGroupDemo = {
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
  primaryInversionOp: 13,
  shortName: 'P6₃/mmc',
  operatorFocusIndices: FOCUS_OPS,
}
