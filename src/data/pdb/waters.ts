/** Residue names treated as solvent water by every parser (mmCIF, PDB, Maestro). */
export const WATERS: ReadonlySet<string> = new Set(['HOH', 'WAT', 'DOD', 'H2O', 'SPC', 'T3P', 'T4P', 'TIP', 'TIP3', 'TIP4', 'SOL'])
