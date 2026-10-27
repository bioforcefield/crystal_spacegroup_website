/**
 * Expand asymmetric-unit atoms by space-group operators and assemble
 * intact molecules (min-image bonds + unwrap) colored by operator.
 *
 * Operator source priority (scientific):
 *  1. CIF-listed symops — always match the AU fractional setting/origin
 *  2. ITA teaching demo — only when the CIF omits a symmetry loop
 *  3. Identity — last resort
 *
 * Preferring the ITA demo when a CIF already lists ops is wrong for
 * non-standard settings / alternate origins (common in CSD/COD).
 */

import { applyOperator, fracToCart } from '../math'
import { getDemo } from '../registry'
import { buildOperatorsFromTriplets } from '../groups/buildOperators'
import type { Operator } from '../types'
import { findHBonds } from './hbonds'
import { assembleMolecules } from './molecules'
import type {
  ExpandedStructure,
  ParsedCif,
  SymmetryCopyAtom,
} from './types'

export type OperatorSource = 'cif' | 'demo' | 'identity'

/**
 * Resolve the operator list. CIF symops win when present so expansion
 * matches the deposited fractional coordinates.
 */
export function resolveOperators(parsed: ParsedCif): {
  operators: Operator[]
  source: OperatorSource
} {
  if (parsed.cifOperators.length) {
    return { operators: parsed.cifOperators, source: 'cif' }
  }
  if (parsed.spaceGroupNumber != null) {
    const demo = getDemo(parsed.spaceGroupNumber)
    if (demo?.operators?.length) {
      return { operators: demo.operators, source: 'demo' }
    }
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
  } else if (source === 'demo') {
    warnings.push(
      'CIF had no symmetry loop — using ITA standard-setting operators for the space-group number (verify origin/setting match)',
    )
  } else if (source === 'cif' && parsed.spaceGroupNumber == null) {
    warnings.push(
      'Using symmetry operators listed in the CIF (space-group number unknown)',
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
        residue: site.residue,
        occupancy: site.occupancy,
        uIso: site.uIso,
        aniso: site.aniso,
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

  const draft = {
    cell: parsed.cell,
    operators,
    operatorSource: source,
    spaceGroupNumber: parsed.spaceGroupNumber,
    spaceGroupName: parsed.spaceGroupName,
    asymmetric: parsed.atoms,
    atoms,
    bonds: assembled.bonds,
    moleculeCount: assembled.moleculeCount,
    moleculeOpIndex: assembled.moleculeOpIndex,
    hbonds: [] as ReturnType<typeof findHBonds>,
    metadata: withZPrime(parsed.metadata, {
      nOps: operators.length,
      spaceGroupNumber: parsed.spaceGroupNumber,
      operatorSource: source,
    }),
    warnings,
  }
  draft.hbonds = findHBonds(draft)
  if (draft.hbonds.length) {
    const cross = draft.hbonds.filter((h) => h.crossOp).length
    warnings.push(
      `Detected ${draft.hbonds.length} geometric H-bond contact(s)` +
        (cross ? ` (${cross} cross-operator)` : ''),
    )
  }
  return draft
}

function nearInteger(v: number, tol = 0.05): boolean {
  return Math.abs(v - Math.round(v)) <= tol
}

/**
 * Prefer explicit CIF Z′ tags. Otherwise estimate Z′ ≈ Z / N_ops
 * (exact only when every formula unit occupies a general position and
 * N_ops is the full set of general-position operators).
 */
function withZPrime(
  meta: ParsedCif['metadata'] | undefined,
  ctx: {
    nOps: number
    spaceGroupNumber?: number | null
    operatorSource: OperatorSource
  },
) {
  const m = { ...(meta ?? {}) }
  const { nOps, spaceGroupNumber, operatorSource } = ctx

  if (m.zPrime != null && m.zPrimeSource === 'cif') {
    m.zPrimeNote =
      'Z′ from the CIF (_cell_formula_units_z_prime / related tags).'
    return m
  }

  if (m.zPrime == null && m.z != null && nOps >= 1) {
    const zp = m.z / nOps
    if (zp > 0) {
      m.zPrime = Math.round(zp * 1000) / 1000
      m.zPrimeSource = 'computed' as const
    }
  }

  if (m.zPrimeSource === 'computed' && m.zPrime != null) {
    m.zPrimeNote =
      'Estimated as Z′ = Z / N_ops (general-position teaching formula). Prefer an explicit CIF Z′ tag when present.'

    const warnings: string[] = []
    if (!nearInteger(m.zPrime)) {
      warnings.push(
        `Z/N_ops = ${m.zPrime} is not near an integer — special positions or an incomplete operator list are likely.`,
      )
    }

    if (spaceGroupNumber != null) {
      const demo = getDemo(spaceGroupNumber)
      const expected = demo?.meta.multiplicity
      if (expected != null && nOps > 0 && nOps < expected) {
        warnings.push(
          `Only ${nOps} of ${expected} ITA general positions are listed — Z′ from Z/ops may be high.`,
        )
      }
    }

    if (operatorSource === 'identity' && nOps <= 1 && (m.z ?? 0) > 1) {
      warnings.push(
        'No symmetry operators found; Z′ estimate assumes P1 and is unreliable.',
      )
    }

    if (warnings.length) {
      m.zPrimeWarning = warnings.join(' ')
    }
  }

  return m
}
