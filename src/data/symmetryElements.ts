/**
 * Geometric loci of Pbca (No. 61) symmetry elements for teaching visuals.
 * Positions are fractional; convert with fracToCart for the scene.
 *
 * Derived from R,t of the conventional ITA operators (see pbca.ts).
 * Companion axes/planes are the usual ITA-diagram equivalents inside the cell.
 */

import {
  CELL,
  SYMMETRY_CLASSES,
  type SymmetryClassId,
  type Vec3,
} from './pbca'

export type ElementKind = 'inversion' | 'screw' | 'glide'

export interface ScrewAxisSpec {
  /** Fractional point on the axis (any point) */
  origin: Vec3
  /** Unit direction in fractional frame (axis-aligned for Pbca) */
  direction: Vec3
  /** Short locus note, e.g. "(¼, 0, z)" */
  locus: string
  /** Operator index this axis primarily belongs to (2, 3, or 4) */
  opIndex: number
  /** True for the primary axis of that operator; false for ITA companions */
  primary: boolean
}

export interface InversionCenterSpec {
  position: Vec3
  /** Operator 5's fixed point is (0,0,0); others are lattice-related */
  primary: boolean
  locus: string
}

export interface GlidePlaneSpec {
  /** Fractional constant along the plane normal */
  planeValue: number
  /** 0=x, 1=y, 2=z — which fractional axis is the normal */
  normalAxis: 0 | 1 | 2
  /** In-plane glide vector (fractional) */
  glide: Vec3
  /** Billboard / panel label */
  label: string
  classId: Extract<SymmetryClassId, 'a-glide' | 'b-glide' | 'c-glide'>
  opIndex: number
  primary: boolean
  locus: string
}

/** 2₁ ‖ c — Op2: R=diag(−1,−1,1), t=(½,0,½) → axis (¼,0,z) */
const SCREW_C: ScrewAxisSpec[] = [
  {
    origin: [0.25, 0, 0],
    direction: [0, 0, 1],
    locus: '(¼, 0, z)',
    opIndex: 2,
    primary: true,
  },
  {
    origin: [0.75, 0.5, 0],
    direction: [0, 0, 1],
    locus: '(¾, ½, z)',
    opIndex: 2,
    primary: false,
  },
]

/** 2₁ ‖ b — Op3: R=diag(−1,1,−1), t=(0,½,½) → axis (0,y,¼) */
const SCREW_B: ScrewAxisSpec[] = [
  {
    origin: [0, 0, 0.25],
    direction: [0, 1, 0],
    locus: '(0, y, ¼)',
    opIndex: 3,
    primary: true,
  },
  {
    origin: [0.5, 0, 0.75],
    direction: [0, 1, 0],
    locus: '(½, y, ¾)',
    opIndex: 3,
    primary: false,
  },
]

/** 2₁ ‖ a — Op4: R=diag(1,−1,−1), t=(½,½,0) → axis (x,¼,0) */
const SCREW_A: ScrewAxisSpec[] = [
  {
    origin: [0, 0.25, 0],
    direction: [1, 0, 0],
    locus: '(x, ¼, 0)',
    opIndex: 4,
    primary: true,
  },
  {
    origin: [0, 0.75, 0.5],
    direction: [1, 0, 0],
    locus: '(x, ¾, ½)',
    opIndex: 4,
    primary: false,
  },
]

export const SCREW_AXES: ScrewAxisSpec[] = [...SCREW_C, ...SCREW_B, ...SCREW_A]

/** Conventional Pbca inversion centers (all 0/½ combinations). */
export const INVERSION_CENTERS: InversionCenterSpec[] = (
  [
    [0, 0, 0],
    [0.5, 0, 0],
    [0, 0.5, 0],
    [0, 0, 0.5],
    [0.5, 0.5, 0],
    [0.5, 0, 0.5],
    [0, 0.5, 0.5],
    [0.5, 0.5, 0.5],
  ] as Vec3[]
).map((position) => {
  const primary =
    position[0] === 0 && position[1] === 0 && position[2] === 0
  const fmt = (v: number) => (v === 0 ? '0' : v === 0.5 ? '½' : String(v))
  return {
    position,
    primary,
    locus: `(${fmt(position[0])}, ${fmt(position[1])}, ${fmt(position[2])})`,
  }
})

/**
 * Glide planes from Op6–8.
 * Plane location = t_n / 2 along the −1 eigenvalue axis;
 * glide vector = in-plane part of t.
 */
export const GLIDE_PLANES: GlidePlaneSpec[] = [
  // Op6 a-glide: R reflects z, t=(½,0,½) → z=¼, glide a
  {
    planeValue: 0.25,
    normalAxis: 2,
    glide: [0.5, 0, 0],
    label: 'a-glide',
    classId: 'a-glide',
    opIndex: 6,
    primary: true,
    locus: 'z = ¼, glide (½, 0, 0)',
  },
  {
    planeValue: 0.75,
    normalAxis: 2,
    glide: [0.5, 0, 0],
    label: 'a-glide',
    classId: 'a-glide',
    opIndex: 6,
    primary: false,
    locus: 'z = ¾, glide (½, 0, 0)',
  },
  // Op7: R reflects y, t=(0,½,½) → y=¼, glide c  → c-glide ⊥ b (HM: letter c)
  {
    planeValue: 0.25,
    normalAxis: 1,
    glide: [0, 0, 0.5],
    label: 'c-glide',
    classId: 'c-glide',
    opIndex: 7,
    primary: true,
    locus: 'y = ¼, glide (0, 0, ½)',
  },
  {
    planeValue: 0.75,
    normalAxis: 1,
    glide: [0, 0, 0.5],
    label: 'c-glide',
    classId: 'c-glide',
    opIndex: 7,
    primary: false,
    locus: 'y = ¾, glide (0, 0, ½)',
  },
  // Op8: R reflects x, t=(½,½,0) → x=¼, glide b  → b-glide ⊥ a (HM: letter b)
  {
    planeValue: 0.25,
    normalAxis: 0,
    glide: [0, 0.5, 0],
    label: 'b-glide',
    classId: 'b-glide',
    opIndex: 8,
    primary: true,
    locus: 'x = ¼, glide (0, ½, 0)',
  },
  {
    planeValue: 0.75,
    normalAxis: 0,
    glide: [0, 0.5, 0],
    label: 'b-glide',
    classId: 'b-glide',
    opIndex: 8,
    primary: false,
    locus: 'x = ¾, glide (0, ½, 0)',
  },
]

/** One-line locus description for the operator panel. */
export function elementLocusForOp(opIndex: number): string | null {
  switch (opIndex) {
    case 1:
      return null
    case 2:
      return '2₁ axis at (¼, 0, z)'
    case 3:
      return '2₁ axis at (0, y, ¼)'
    case 4:
      return '2₁ axis at (x, ¼, 0)'
    case 5:
      return 'inversion at (0, 0, 0) · others at 0/½'
    case 6:
      return 'a-glide plane z = ¼ · glide (½, 0, 0)'
    case 7:
      return 'c-glide plane y = ¼ · glide (0, 0, ½)'
    case 8:
      return 'b-glide plane x = ¼ · glide (0, ½, 0)'
    default:
      return null
  }
}

export function classColorId(id: SymmetryClassId): string {
  return SYMMETRY_CLASSES[id].color
}

/** Cell extents used when building plane meshes (fractional → cart handled in scene). */
export { CELL }
