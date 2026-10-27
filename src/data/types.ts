/** Shared crystallography types for interactive space-group demos. */

export type Vec3 = [number, number, number]
export type Mat3 = [Vec3, Vec3, Vec3]

/** Teaching cell; optional α / β / γ (degrees, default 90). */
export interface CellParams {
  a: number
  b: number
  c: number
  /** Triclinic angle α (b∧c) in degrees (default 90). */
  alphaDeg?: number
  /** Monoclinic unique-b / triclinic angle β (a∧c) in degrees (default 90). */
  betaDeg?: number
  /** Hexagonal/trigonal / triclinic angle γ (a∧b) in degrees (default 90). */
  gammaDeg?: number
}

export type SymmetryClassId =
  | 'identity'
  | 'twofold'
  | 'threefold'
  | 'fourfold'
  | 'sixfold'
  | 'screw'
  | 'inversion'
  | 'mirror'
  | 'a-glide'
  | 'b-glide'
  | 'c-glide'
  | 'n-glide'
  | 'd-glide'

export interface SymmetryClass {
  id: SymmetryClassId
  label: string
  color: string
}

export interface Operator {
  index: number
  triplet: string
  label: string
  classId: SymmetryClassId
  /** Rotation matrix R (row-major 3×3) and translation t: x' = R x + t */
  R: Mat3
  t: Vec3
  seitz: string
}

export interface SpaceGroupMeta {
  number: number
  hm: string
  system: string
  pointGroup: string
  lattice: string
  multiplicity: number
  blurb: string
}

export type ElementKind = 'inversion' | 'screw' | 'glide' | 'twofold'

export interface ScrewAxisSpec {
  origin: Vec3
  direction: Vec3
  locus: string
  opIndex: number
  primary: boolean
  /** Axis order/type (default '21' for backward compat). */
  kind?: '2' | '21' | '3' | '4' | '41' | '42' | '43' | '6' | '63' | 'bar4'
}

export interface InversionCenterSpec {
  position: Vec3
  primary: boolean
  locus: string
}

export interface GlidePlaneSpec {
  /**
   * Axis-aligned plane: constant fractional coordinate along normalAxis.
   * Omit when `corners` is set (diagonal / non-axis-aligned planes).
   */
  planeValue?: number
  normalAxis?: 0 | 1 | 2
  /**
   * Explicit fractional parallelogram (4 corners, CCW). Use for diagonal
   * planes such as R-3c vertical c-glides (x = −y). When set, overrides
   * planeValue/normalAxis for rendering.
   */
  corners?: [Vec3, Vec3, Vec3, Vec3]
  glide: Vec3
  label: string
  classId: Extract<
    SymmetryClassId,
    'a-glide' | 'b-glide' | 'c-glide' | 'n-glide' | 'd-glide' | 'mirror'
  >
  opIndex: number
  primary: boolean
  locus: string
}

export type ProjectionDir = 'c' | 'b' | 'a'

export interface ProjectionInfo {
  dir: ProjectionDir
  label: string
  axisU: string
  axisV: string
  axisW: string
  uIndex: 0 | 1 | 2
  vIndex: 0 | 1 | 2
  wIndex: 0 | 1 | 2
  sizeU: number
  sizeV: number
}

export interface GeneralPoint {
  index: number
  fractional: Vec3
  cartesian: Vec3
  operator: Operator
  improper: boolean
  classId: SymmetryClassId
  classColor: string
}

/** Bundled teaching demo for one space group. */
export interface SpaceGroupDemo {
  meta: SpaceGroupMeta
  cell: CellParams
  seed: Vec3
  operators: Operator[]
  symmetryClasses: Record<SymmetryClassId, SymmetryClass>
  classLegendOrder: SymmetryClassId[]
  screwAxes: ScrewAxisSpec[]
  inversionCenters: InversionCenterSpec[]
  glidePlanes: GlidePlaneSpec[]
  elementLocusForOp: (opIndex: number) => string | null
  defaultProjection: ProjectionDir
  /** Operator index whose class is the primary inversion (−1). */
  primaryInversionOp: number
  /** Short name for 2D diagram header */
  shortName: string
  /**
   * When set (e.g. cubic 96–192 ops), chip strip / panel prioritise these
   * operator indices for teaching; remaining ops behind an expand control.
   */
  operatorFocusIndices?: number[]
  /**
   * True when geometric overlays are incomplete (e.g. body-diagonal 3-folds
   * not derived). UI should show an honest "operators / limited geometry" note.
   */
  geometryLimited?: boolean
  /** Short note shown when geometryLimited is true. */
  geometryNote?: string
  /** Hand-authored teaching pack vs ITA-generated fallback. */
  demoSource?: 'hand' | 'generated'
}
