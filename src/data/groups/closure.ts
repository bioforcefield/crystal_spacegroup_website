/** Group closure checks for Seitz operator lists. */

import type { Operator } from '../types'
import {
  composeOps,
  isIdentitySeitz,
  matClose,
  seitzEqual,
  tCloseMod1,
} from './composeOps'

export interface ClosureResult {
  ok: boolean
  errors: string[]
  hasIdentity: boolean
}

/** Verify identity is present and the set is closed under composition mod ℤ³. */
export function checkClosure(ops: Operator[]): ClosureResult {
  const errors: string[] = []
  const hasIdentity = ops.some((o) => isIdentitySeitz(o))
  if (!hasIdentity) {
    errors.push('identity (I|0) not found in operator list')
  }

  for (const a of ops) {
    for (const b of ops) {
      const product = composeOps(a, b)
      const match = ops.find(
        (o) => matClose(o.R, product.R) && tCloseMod1(o.t, product.t),
      )
      if (!match) {
        errors.push(
          `op${a.index}∘op${b.index} not in group (mod lattice)`,
        )
      }
    }
  }

  return { ok: errors.length === 0, errors, hasIdentity }
}

/** Find an operator equal to `target` mod lattice, or undefined. */
export function findOp(
  ops: Operator[],
  target: { R: Operator['R']; t: Operator['t'] },
): Operator | undefined {
  return ops.find((o) => seitzEqual(o, target))
}
