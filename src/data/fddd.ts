/** Space group 70 · Fddd — F-centred orthorhombic with diamond glides (ITA origin 1). */

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

export const CELL: CellParams = { a: 1, b: 1.2, c: 1.4 }
export const SEED: Vec3 = [0.41, 0.35, 0.35]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / F-centring', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold ‖ a,b,c', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4-fold', color: '#a5b4fc' },
  sixfold: { id: 'sixfold', label: '6-fold', color: '#818cf8' },
  screw: { id: 'screw', label: 'screw', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  mirror: { id: 'mirror', label: 'mirror', color: '#facc15' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide ⊥ a,b,c', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = [
  'identity',
  'twofold',
  'inversion',
  'd-glide',
]

const triplets = (
  itaJson as { groups: { number: number; triplets: string[] }[] }
).groups.find((g) => g.number === 70)!.triplets

export const OPERATORS: Operator[] = buildOperatorsFromTriplets(triplets).map((op) => {
  const i = op.index
  const t = op.t
  const isCentring =
    op.classId === 'identity' && t.some((c) => Math.abs(c) > 1e-6)

  if (i === 1) return { ...op, seitz: '{1 | 0}' }
  if (i === 2) return { ...op, label: '2-fold ‖ c', classId: 'twofold' as SymmetryClassId }
  if (i === 3) return { ...op, label: '2-fold ‖ a', classId: 'twofold' as SymmetryClassId }
  if (i === 4) return { ...op, label: '2-fold ‖ b', classId: 'twofold' as SymmetryClassId }
  if (i === 5)
    return {
      ...op,
      label: 'Inversion (−1)',
      classId: 'inversion' as SymmetryClassId,
      seitz: '{-1 | 0}',
    }
  // d-glides in primitive cell: ops 6,7,8
  if (i === 6) return { ...op, label: 'd-glide ⊥ c', classId: 'd-glide' as SymmetryClassId }
  if (i === 7) return { ...op, label: 'd-glide ⊥ a', classId: 'd-glide' as SymmetryClassId }
  if (i === 8) return { ...op, label: 'd-glide ⊥ b', classId: 'd-glide' as SymmetryClassId }
  if (isCentring) return { ...op, label: 'F-centring', classId: 'identity' as SymmetryClassId }
  if (op.classId === 'inversion') {
    return { ...op, label: 'Inversion (F-related)', classId: 'inversion' }
  }
  if (op.classId === 'd-glide' || (op.label ?? '').includes('glide')) {
    return { ...op, label: 'd-glide (F)', classId: 'd-glide' }
  }
  // remaining 2-folds from F images
  if (
    (op.R[2][2] === 1 && op.R[0][0] === -1 && op.R[1][1] === -1) ||
    (op.R[0][0] === 1 && op.R[1][1] === -1 && op.R[2][2] === -1) ||
    (op.R[1][1] === 1 && op.R[0][0] === -1 && op.R[2][2] === -1)
  ) {
    return { ...op, label: '2-fold (F)', classId: 'twofold' }
  }
  return op
})

export const META: SpaceGroupMeta = {
  number: 70,
  hm: 'Fddd',
  system: 'orthorhombic',
  pointGroup: 'mmm',
  lattice: 'F-centred',
  multiplicity: 32,
  blurb:
    'Fddd (~CSD rank 33, <0.3%) is the centrosymmetric F-centred diamond-glide orthorhombic group: 2-folds ‖ a/b/c, d-glides ⊥ each axis, inversion, and F-centring — thirty-two general positions. Teaching companion to polar Fdd2 (43). Origin choice 1.',
}

const SCREW_AXES: ScrewAxisSpec[] = [
  { origin: [0, 0, 0], direction: [0, 0, 1], locus: '(0, 0, z)', opIndex: 2, primary: true, kind: '2' },
  { origin: [0, 0, 0], direction: [1, 0, 0], locus: '(x, 0, 0)', opIndex: 3, primary: true, kind: '2' },
  { origin: [0, 0, 0], direction: [0, 1, 0], locus: '(0, y, 0)', opIndex: 4, primary: true, kind: '2' },
]

const INVERSION_CENTERS: InversionCenterSpec[] = [
  { position: [0.125, 0.125, 0.125], primary: true, locus: '(⅛, ⅛, ⅛)' },
]

const GLIDE_PLANES: GlidePlaneSpec[] = [
  {
    planeValue: 0.125,
    normalAxis: 0,
    glide: [0, 0.25, 0.25],
    label: 'd-glide',
    classId: 'd-glide',
    opIndex: 7,
    primary: true,
    locus: 'x = ⅛ · d-glide (0, ¼, ¼)',
  },
  {
    planeValue: 0.125,
    normalAxis: 1,
    glide: [0.25, 0, 0.25],
    label: 'd-glide',
    classId: 'd-glide',
    opIndex: 8,
    primary: true,
    locus: 'y = ⅛ · d-glide (¼, 0, ¼)',
  },
  {
    planeValue: 0.125,
    normalAxis: 2,
    glide: [0.25, 0.25, 0],
    label: 'd-glide',
    classId: 'd-glide',
    opIndex: 6,
    primary: true,
    locus: 'z = ⅛ · d-glide (¼, ¼, 0)',
  },
]

export function elementLocusForOp(opIndex: number): string | null {
  const map: Record<number, string | null> = {
    1: null,
    2: '2-fold axis at (0, 0, z)',
    3: '2-fold axis ‖ a',
    4: '2-fold axis ‖ b',
    5: 'inversion at (⅛, ⅛, ⅛)',
    6: 'd-glide plane z = ⅛ · glide (¼, ¼, 0)',
    7: 'd-glide plane x = ⅛ · glide (0, ¼, ¼)',
    8: 'd-glide plane y = ⅛ · glide (¼, 0, ¼)',
    9: 'F-centring translation',
    17: 'F-centring translation',
    25: 'F-centring translation',
  }
  return map[opIndex] ?? OPERATORS.find((o) => o.index === opIndex)?.label ?? null
}

export const FOCUS_OPS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export const fdddDemo: SpaceGroupDemo = {
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
  shortName: 'Fddd',
  operatorFocusIndices: FOCUS_OPS,
}
