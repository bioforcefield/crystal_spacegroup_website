/** Space group 1 · P1 — triclinic, identity only (ITA). */

import type {
  CellParams,
  Operator,
  SpaceGroupDemo,
  SpaceGroupMeta,
  SymmetryClass,
  SymmetryClassId,
  Vec3,
} from './types'

/**
 * Teaching cell: unequal edges + mild β so the cell isn’t a brick.
 * Full triclinic α/γ not modeled yet (unique-b β only) — same compromise as P-1.
 */
export const CELL: CellParams = { a: 1, b: 1.15, c: 1.35, alphaDeg: 75, betaDeg: 85, gammaDeg: 100 }

/** Seed anywhere — every position is general in P1. */
export const SEED: Vec3 = [0.18, 0.22, 0.31]

export const SYMMETRY_CLASSES: Record<SymmetryClassId, SymmetryClass> = {
  identity: { id: 'identity', label: 'self / identity', color: '#38bdf8' },
  twofold: { id: 'twofold', label: '2-fold', color: '#c4b5fd' },
  threefold: { id: 'threefold', label: '3-fold', color: '#67e8f9' },
  fourfold: { id: 'fourfold', label: '4-fold', color: '#a5b4fc' },
  sixfold: { id: 'sixfold', label: '6-fold', color: '#818cf8' },
  screw: { id: 'screw', label: '2₁ screw', color: '#a78bfa' },
  inversion: { id: 'inversion', label: 'inversion', color: '#f472b6' },
  mirror: { id: 'mirror', label: 'mirror', color: '#facc15' },
  'a-glide': { id: 'a-glide', label: 'a-glide', color: '#fbbf24' },
  'b-glide': { id: 'b-glide', label: 'b-glide', color: '#34d399' },
  'c-glide': { id: 'c-glide', label: 'c-glide', color: '#fb923c' },
  'n-glide': { id: 'n-glide', label: 'n-glide', color: '#2dd4bf' },
  'd-glide': { id: 'd-glide', label: 'd-glide', color: '#f9a8d4' },
}

export const CLASS_LEGEND_ORDER: SymmetryClassId[] = ['identity']

export const OPERATORS: Operator[] = [
  {
    index: 1,
    triplet: 'x, y, z',
    label: 'Identity',
    classId: 'identity',
    R: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    t: [0, 0, 0],
    seitz: '{1 | 0}',
  },
]

export const META: SpaceGroupMeta = {
  number: 1,
  hm: 'P1',
  system: 'triclinic',
  pointGroup: '1',
  lattice: 'Primitive',
  multiplicity: 1,
  blurb:
    'P1 is the simplest space group (~1% of CSD): only the identity. The asymmetric unit is the whole cell. Teaching cell α = 75°, β = 85°, γ = 100° — a fully triclinic parallelepiped (baseline before P-1).',
}

export function elementLocusForOp(opIndex: number): string | null {
  if (opIndex === 1) return 'asymmetric unit = whole cell'
  return null
}

export const p1Demo: SpaceGroupDemo = {
  meta: META,
  cell: CELL,
  seed: SEED,
  operators: OPERATORS,
  symmetryClasses: SYMMETRY_CLASSES,
  classLegendOrder: CLASS_LEGEND_ORDER,
  screwAxes: [],
  inversionCenters: [],
  glidePlanes: [],
  elementLocusForOp,
  defaultProjection: 'c',
  primaryInversionOp: 1,
  shortName: 'P1',
}
