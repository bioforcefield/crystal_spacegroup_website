/**
 * Expand asymmetric-unit atoms by space-group operators and assign each copy
 * an operator index for teaching visualization.
 */

import { applyOperator, fracToCart } from '../math'
import { getDemo } from '../registry'
import { buildOperatorsFromTriplets } from '../groups/buildOperators'
import type { Operator, Vec3 } from '../types'
import type {
  ExpandedStructure,
  ParsedCif,
  SymmetryBond,
  SymmetryCopyAtom,
} from './types'

/** Rough covalent radii (Å) for bonding heuristic. */
const COVALENT: Record<string, number> = {
  H: 0.31,
  C: 0.76,
  N: 0.71,
  O: 0.66,
  F: 0.57,
  P: 1.07,
  S: 1.05,
  Cl: 1.02,
  Br: 1.2,
  I: 1.39,
  B: 0.84,
  Si: 1.11,
  Se: 1.2,
}

function radius(el: string): number {
  return COVALENT[el] ?? 0.8
}

function cartDist(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

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
  // Last resort: try building from a lone identity so AU still displays.
  return {
    operators: buildOperatorsFromTriplets(['x,y,z']),
    source: 'identity',
  }
}

function bondsForCopy(
  atoms: SymmetryCopyAtom[],
  opIndex: number,
): SymmetryBond[] {
  const subset = atoms
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => a.opIndex === opIndex)
  const bonds: SymmetryBond[] = []
  for (let i = 0; i < subset.length; i++) {
    for (let j = i + 1; j < subset.length; j++) {
      const A = subset[i]!.a
      const B = subset[j]!.a
      const max = (radius(A.element) + radius(B.element)) * 1.25
      if (cartDist(A.cartesian, B.cartesian) <= max) {
        bonds.push({ a: subset[i]!.i, b: subset[j]!.i, opIndex })
      }
    }
  }
  return bonds
}

/** Expand parsed CIF into operator-colored copies inside the unit cell. */
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
      atoms.push({
        auIndex,
        label: site.label,
        element: site.element,
        opIndex: op.index,
        fractional,
        cartesian: fracToCart(fractional, parsed.cell),
      })
    }
  }

  const bonds: SymmetryBond[] = []
  for (const op of operators) {
    bonds.push(...bondsForCopy(atoms, op.index))
  }

  return {
    cell: parsed.cell,
    operators,
    spaceGroupNumber: parsed.spaceGroupNumber,
    spaceGroupName: parsed.spaceGroupName,
    asymmetric: parsed.atoms,
    atoms,
    bonds,
    warnings,
  }
}
