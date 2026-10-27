import type { CifMetadata } from './metadata'
/** Types for CIF upload → symmetry-mapped structure explorer. */

import type { CellParams, Operator, Vec3 } from '../types'

export interface CifAnisoU {
  /** Crystal-frame anisotropic displacement Uij (Å²), Voigt order 11,22,33,12,13,23. */
  u11: number
  u22: number
  u33: number
  u12: number
  u13: number
  u23: number
}

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
  /** Isotropic U (Å²) when present. */
  uIso?: number
  /** Anisotropic Uij when present. */
  aniso?: CifAnisoU
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
  metadata: CifMetadata
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
  residue?: string
  occupancy?: number
  uIso?: number
  aniso?: CifAnisoU
}

export interface SymmetryBond {
  a: number
  b: number
  opIndex: number
  moleculeId?: number
}

/** Geometric intermolecular H-bond / short contact (see hbonds.ts). */
export interface HBondContact {
  donor: number
  hydrogen: number
  acceptor: number
  donorOp: number
  acceptorOp: number
  donorMolecule: number
  acceptorMolecule: number
  distHA: number
  distDA: number
  angleDeg: number
  crossOp: boolean
}

export interface ExpandedStructure {
  cell: CellParams
  operators: Operator[]
  /** Where operators came from — CIF list must win when present (matches AU setting). */
  operatorSource: 'cif' | 'demo' | 'identity'
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
  /** Intermolecular H-bond / short contacts (may be empty). */
  hbonds: HBondContact[]
  metadata: CifMetadata
  warnings: string[]
}
