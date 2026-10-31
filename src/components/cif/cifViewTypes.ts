export type { CifPlacementMode } from '../../data/cif/placement'
export type CifVisibility = 'molecules' | 'all' | 'selected' | 'asymmetric'
/** Atom coloring: by symmetry operator (default) or by residue/comp id. */
/** operator = default (element body + op tint, op-colored bonds). */
export type CifColorMode = 'operator' | 'element' | 'equivalence' | 'residue'
/** Thermal rendering: off | scale balls by Uiso | draw aniso ellipsoids when present. */
export type CifThermalMode = 'off' | 'uiso' | 'ellipsoid'

/** Draw dashed H···A contacts; optionally dim non-partners of AU molecules. */
export type CifHBondMode = 'off' | 'links' | 'partners'
