/** Space group 138 · P4₂/ncm — tetragonal 4₂ teaching leftover (ITA origin 1). */

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

export const CELL: CellParams = { a: 1, b: 1, c: 1.3 }
export const SEED: Vec3 = [0.17, 0.23, 0.31]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4₂ screw ‖ c', color: '#a5b4fc' },
  sixfold: { id: 'sixfold', label: '6-fold', color: '#818cf8' },
  screw: { id: 'screw', label: '2-fold', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  mirror: { id: 'mirror', label: 'mirror', color: '#facc15' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'fourfold',
  'screw',
  'inversion',
  'n-glide',
  'mirror',
  'c-glide',
]

const triplets = (
  itaJson as { groups: { number: number; triplets: string[] }[] }
).groups.find((g) => g.number === 138)!.triplets

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

export const OPERATORS: Operator[] = buildOperatorsFromTriplets(triplets).map((op) => {
  const det = Math.round(det3(op.R))
  const tr = Math.round(tr3(op.R))
  const t = op.t
  const tz = Math.abs(((t[2] % 1) + 1) % 1)
  const hasHalf = t.some((c) => {
    const a = Math.abs(((c % 1) + 1) % 1)
    return Math.abs(a - 0.5) < 0.02
  })

  if (op.index === 1) return { ...op, seitz: '{1 | 0}' }
  if (det === -1 && tr === -3) {
    return { ...op, label: 'Inversion (−1)', classId: 'inversion' }
  }
  // 4₂: det 1, tr 1, with ½ translations
  if (det === 1 && tr === 1) {
    return { ...op, label: '4₂ screw ‖ c', classId: 'fourfold' }
  }
  if (det === 1 && tr === -1) {
    return { ...op, label: '2-fold', classId: 'screw' }
  }
  if (det === -1 && tr === -1) {
    return { ...op, label: '−4', classId: 'fourfold' }
  }
  // n-glide-ish: improper with diagonal half translations
  if (det === -1 && tr === 1 && hasHalf && Math.abs(tz - 0.5) < 0.02) {
    return { ...op, label: 'n / c-glide', classId: 'n-glide' }
  }
  if (det === -1 && tr === 1 && t.every((c) => Math.abs(c) < 1e-6)) {
    return { ...op, label: 'mirror', classId: 'mirror' }
  }
  if (det === -1 && tr === 1) {
    return { ...op, label: 'c / n-glide', classId: 'c-glide' }
  }
  return op
})

export const META: SpaceGroupMeta = {
  number: 138,
  hm: 'P42/ncm',
  system: 'tetragonal',
  pointGroup: '4/mmm',
  lattice: 'Primitive',
  multiplicity: 16,
  blurb:
    'P4₂/ncm (origin choice 1) teaches the 4₂ screw ‖ c together with n/c glides and mirrors — a tetragonal leftover beyond P4/mmm. Teaching cell keeps a = b.',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  {
    origin: [0.25, 0.25, 0],
    direction: [0, 0, 1],
    locus: '(¼, ¼, z)',
    opIndex: 2,
    primary: true,
    kind: '42',
  },
]

const INVERSION_CENTERS: InversionCenterSpec[] = [
  { position: [0.25, 0.25, 0.25], primary: true, locus: '(¼, ¼, ¼)' },
]

const GLIDE_PLANES: GlidePlaneSpec[] = [
  {
    planeValue: 0.25,
    normalAxis: 2,
    glide: [0.5, 0.5, 0],
    label: 'n-glide',
    classId: 'n-glide',
    opIndex: 11,
    primary: true,
    locus: 'z = ¼ · n-glide (teaching)',
  },
  {
    planeValue: 0,
    normalAxis: 0,
    glide: [0, 0, 0.5],
    label: 'c-glide',
    classId: 'c-glide',
    opIndex: 15,
    primary: true,
    locus: 'x = 0 · c-glide (teaching)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  if (opIndex === 1) return null
  const op = OPERATORS.find((o) => o.index === opIndex)
  if (!op) return null
  if (op.classId === 'fourfold' && op.label.includes('4₂')) return '4₂ screw axis ‖ c'
  if (op.classId === 'inversion') return 'inversion centre'
  if (op.classId === 'n-glide') return 'n-glide plane'
  if (op.classId === 'c-glide') return 'c-glide plane'
  if (op.classId === 'mirror') return 'mirror plane'
  return op.label
}

export const p42ncmDemo: SpaceGroupDemo = {
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
  primaryInversionOp: 9,
  shortName: 'P4₂/ncm',
}
