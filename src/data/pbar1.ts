/** Space group 2 · P-1 — triclinic, identity + inversion (ITA). */

import type {
  CellParams,
  InversionCenterSpec,
  Operator,
  SpaceGroupDemo,
  SpaceGroupMeta,
  SymmetryClass,
  SymmetryClassId,
  Vec3,
} from './types'
import { buildOperatorsFromTriplets } from './groups'

/**
 * Teaching cell: unequal edges + mild β so the cell isn’t a brick.
 * Full triclinic α/γ can come later; CellParams currently models unique-b β only.
 */
export const CELL: CellParams = { a: 1, b: 1.2, c: 1.4, betaDeg: 105 }

/** Seed off special positions (fractional). */
export const SEED: Vec3 = [0.18, 0.22, 0.31]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold ‖ b', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4-fold', color: '#a5b4fc' },
  screw: { id: 'screw', label: '2₁ screw ‖ b', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide ⊥ b', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

/** Legend order for this group (identity + inversion only). */
export const CLASS_LEGEND_ORDER: SymmetryClassId[] = ['identity', 'inversion']

/**
 * General positions for P-1 (No. 2), multiplicity 2.
 * Built via Foundation `buildOperatorsFromTriplets`; Seitz strings polished for teaching.
 */
export const OPERATORS: Operator[] = buildOperatorsFromTriplets([
  'x, y, z',
  '−x, −y, −z',
]).map((op) => {
  if (op.classId === 'identity') return { ...op, seitz: '{1 | 0}' }
  if (op.classId === 'inversion') return { ...op, seitz: '{-1 | 0}' }
  return op
})

export const META: SpaceGroupMeta = {
  number: 2,
  hm: 'P-1',
  system: 'triclinic',
  pointGroup: '-1',
  lattice: 'Primitive',
  multiplicity: 2,
  blurb:
    'P-1 is the most common triclinic space group (~¼ of CSD entries). Only identity and inversion (−1) — no screws, glides, or mirrors. Teaching cell uses unequal edges and a single oblique angle (β ≈ 105°) for clarity; full triclinic α/γ can come later.',
}

function fmtFrac(v: number): string {
  if (Math.abs(v) < 1e-9) return '0'
  if (Math.abs(v - 0.25) < 1e-9) return '¼'
  if (Math.abs(v - 0.5) < 1e-9) return '½'
  if (Math.abs(v - 0.75) < 1e-9) return '¾'
  return String(v)
}

/** The eight −1 sites in P-1 (Wyckoff 1a–1h). */
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
  (position) => {
    const primary =
      position[0] === 0 && position[1] === 0 && position[2] === 0
    return {
      position,
      primary,
      locus: `(${fmtFrac(position[0])}, ${fmtFrac(position[1])}, ${fmtFrac(position[2])})`,
    }
  },
)

export function elementLocusForOp(opIndex: number): string | null {
  switch (opIndex) {
    case 1:
      return null
    case 2:
      return 'inversion at (0, 0, 0)'
    default:
      return null
  }
}

export const pbar1Demo: SpaceGroupDemo = {
  meta: META,
  cell: CELL,
  seed: SEED,
  operators: OPERATORS,
  symmetryClasses: SYMMETRY_CLASSES,
  classLegendOrder: CLASS_LEGEND_ORDER,
  screwAxes: [],
  inversionCenters: INVERSION_CENTERS,
  glidePlanes: [],
  elementLocusForOp,
  defaultProjection: 'c',
  primaryInversionOp: 2,
  shortName: 'P-1',
}
