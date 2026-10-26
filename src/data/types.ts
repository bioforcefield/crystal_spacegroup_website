/** Shared crystallography types for interactive space-group demos. */

export type Vec3 = [number, number, number]
export type Mat3 = [Vec3, Vec3, Vec3]

/** Teaching cell; optional β (monoclinic unique-b) and/or γ (hex/trigonal). */
export interface CellParams {
  a: number
  b: number
  c: number
  /** Monoclinic angle β in degrees (default 90). Unique axis b; α = γ = 90°. */
  betaDeg?: number
  /** Hexagonal/trigonal angle γ in degrees (default 90). α = β = 90°, typically a = b. */
  gammaDeg?: number
}

export type SymmetryClassId =
  | 'identity'
  | 'twofold'
  | 'threefold'
  | 'screw'
  | 'inversion'
  | 'a-glide'
  | 'b-glide'
  | 'c-glide'
  | 'n-glide'

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
  /** Pure 2-fold, 2₁ screw, or 3-fold (default '21' for backward compat). */
  kind?: '2' | '21' | '3'
}

export interface InversionCenterSpec {
  position: Vec3
  primary: boolean
  locus: string
}

export interface GlidePlaneSpec {
  planeValue: number
  normalAxis: 0 | 1 | 2
  glide: Vec3
  label: string
  classId: Extract<SymmetryClassId, 'a-glide' | 'b-glide' | 'c-glide' | 'n-glide'>
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
}
