/** Entry point for the lazily-loaded structure-analysis bundle. */
import type { MacroModel } from '../macro'
import { residuesOf, type Residue } from './residues'
import { proteinAnalysis, type ProteinRow } from './protein'
import { nucleicAnalysis, type BasePair, type NucleicRow, type Step } from './nucleic'

export interface StructureAnalysis {
  residues: Residue[]
  protein: ProteinRow[]
  nucleic: NucleicRow[]
  pairs: BasePair[]
  steps: Step[]
  form: string | null
  ms: number
}
export function analyzeStructure(model: MacroModel): StructureAnalysis {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const residues = residuesOf(model)
  const protein = proteinAnalysis(residues)
  const na = nucleicAnalysis(residues)
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  return { residues, protein, nucleic: na.rows, pairs: na.pairs, steps: na.steps, form: na.form, ms: t1 - t0 }
}
export * from './residues'
export * from './protein'
export * from './nucleic'
export * from './csv'
