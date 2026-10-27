/** Types for CIF upload → symmetry-mapped structure explorer. */

import type { CellParams, Operator, Vec3 } from '../types'

export interface CifAtomSite {
  label: string
  element: string
  /** Fractional coordinates of the asymmetric-unit site. */
  fractional: Vec3
  /** Optional residue / molecule label from CIF (_atom_site_label prefix or auth_comp_id). */
  residue?: string
  /** Occupancy 0–1 when present in CIF. */
  occupancy?: number
  /** Disorder altloc / group id when present. */
  altloc?: string
}

export interface ParsedCif {
  dataBlock: string
  cell: CellParams
  /** ITA number when resolved from CIF tags or HM match. */
  spaceGroupNumber: number | null
  /** HM / Hall / other name as written in the CIF. */
  spaceGroupName: string | null
  /** Operators from CIF symmetry loops (may be empty if only SG number given). */
  cifOperators: Operator[]
  atoms: CifAtomSite[]
  warnings: string[]
}

export interface SymmetryCopyAtom {
  /** Index into asymmetric-unit atoms. */
  auIndex: number
  label: string
  element: string
  /** Operator that produced this image (1-based, identity = 1). */
  opIndex: number
  /** Wrapped fractional coords in [0,1)³. */
  fractional: Vec3
  /** Cartesian of wrapped fractional (may chop molecules at cell faces). */
  cartesian: Vec3
  /** Unwrapped fractional so the molecule is contiguous. */
  displayFractional: Vec3
  /** Cartesian of displayFractional — use for drawing intact molecules. */
  displayCartesian: Vec3
  /** Connected-component molecule id (0…M-1) within the expanded structure. */
  moleculeId: number
}

export interface SymmetryBond {
  a: number
  b: number
  opIndex: number
  moleculeId?: number
}

export interface ExpandedStructure {
  cell: CellParams
  operators: Operator[]
  spaceGroupNumber: number | null
  spaceGroupName: string | null
  /** Asymmetric-unit atoms (input). */
  asymmetric: CifAtomSite[]
  /** All symmetry images (length ≈ au × multiplicity). */
  atoms: SymmetryCopyAtom[]
  /** Bonds within each intact molecule (covalent + min-image). */
  bonds: SymmetryBond[]
  /** Number of intact molecules after clustering. */
  moleculeCount: number
  /** moleculeId → opIndex. */
  moleculeOpIndex: number[]
  warnings: string[]
}
