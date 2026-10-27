/**
 * Expand asymmetric-unit atoms by space-group operators and assemble
 * intact molecules (min-image bonds + unwrap) colored by operator.
 */

import { applyOperator, fracToCart } from '../math'
import { getDemo } from '../registry'
import { buildOperatorsFromTriplets } from '../groups/buildOperators'
import type { Operator } from '../types'
import { assembleMolecules } from './molecules'
import type {
  ExpandedStructure,
  ParsedCif,
  SymmetryCopyAtom,
} from './types'

/**
 * Resolve the operator list: prefer site teaching demo (ITA JSON) when the
 * space-group number is known; else CIF-listed ops; else identity only.
 */
export function resolveOperators(parsed: ParsedCif): {
  operators: Operator[]
  source: 'demo' | 'cif' | 'identity'
} {
  if (parsed.spaceGroupNumber != null) {
    const demo = getDemo(parsed.spaceGroupNumber)
    if (demo?.operators?.length) {
      return { operators: demo.operators, source: 'demo' }
    }
  }
  if (parsed.cifOperators.length) {
    return { operators: parsed.cifOperators, source: 'cif' }
  }
  return {
    operators: buildOperatorsFromTriplets(['x,y,z']),
    source: 'identity',
  }
}

/** Expand parsed CIF into operator-colored intact molecules. */
export function expandStructure(parsed: ParsedCif): ExpandedStructure {
  const warnings = [...parsed.warnings]
  const { operators, source } = resolveOperators(parsed)
  if (source === 'identity') {
    warnings.push(
      'No space-group number or symmetry operators found — showing asymmetric unit only',
    )
  } else if (source === 'cif') {
    warnings.push(
      'Using symmetry operators listed in the CIF (could not resolve ITA number)',
    )
  }

  const atoms: SymmetryCopyAtom[] = []
  for (const op of operators) {
    for (let auIndex = 0; auIndex < parsed.atoms.length; auIndex++) {
      const site = parsed.atoms[auIndex]!
      const fractional = applyOperator(op, site.fractional)
      const cartesian = fracToCart(fractional, parsed.cell)
      atoms.push({
        auIndex,
        label: site.label,
        element: site.element,
        opIndex: op.index,
        fractional,
        cartesian,
        // Filled by assembleMolecules
        displayFractional: fractional,
        displayCartesian: cartesian,
        moleculeId: -1,
      })
    }
  }

  const assembled = assembleMolecules(atoms, parsed.cell)
  for (let i = 0; i < atoms.length; i++) {
    const a = atoms[i]!
    a.displayFractional = assembled.displayFractional[i]!
    a.displayCartesian = assembled.displayCartesian[i]!
    a.moleculeId = assembled.moleculeId[i]!
  }

  if (assembled.moleculeCount > 0) {
    const perOp = new Map<number, number>()
    for (let m = 0; m < assembled.moleculeCount; m++) {
      const op = assembled.moleculeOpIndex[m]!
      perOp.set(op, (perOp.get(op) ?? 0) + 1)
    }
    const multi = [...perOp.values()].some((c) => c > 1)
    if (multi) {
      warnings.push(
        `Assembled ${assembled.moleculeCount} intact molecules (some operators produce more than one)`,
      )
    }
  }

  return {
    cell: parsed.cell,
    operators,
    spaceGroupNumber: parsed.spaceGroupNumber,
    spaceGroupName: parsed.spaceGroupName,
    asymmetric: parsed.atoms,
    atoms,
    bonds: assembled.bonds,
    moleculeCount: assembled.moleculeCount,
    moleculeOpIndex: assembled.moleculeOpIndex,
    warnings,
  }
}
