/** Types for CIF upload → symmetry-mapped structure explorer. */

import type { CellParams, Operator, Vec3 } from '../types'

export interface CifAtomSite {
  label: string
  element: string
  /** Fractional coordinates of the asymmetric-unit site. */
  fractional: Vec3
  /** Optional residue / molecule label from CIF (_atom_site_label prefix or auth_comp_id). */
  residue?: string
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
  fractional: Vec3
  cartesian: Vec3
}

export interface SymmetryBond {
  a: number
  b: number
  opIndex: number
}

export interface ExpandedStructure {
  cell: CellParams
  operators: Operator[]
  spaceGroupNumber: number | null
  spaceGroupName: string | null
  /** Asymmetric-unit atoms (input). */
  asymmetric: CifAtomSite[]
  /** All symmetry images (length ≈ au × multiplicity, wrapped into cell). */
  atoms: SymmetryCopyAtom[]
  /** Bonds within each operator copy (covalent heuristic). */
  bonds: SymmetryBond[]
  warnings: string[]
}
