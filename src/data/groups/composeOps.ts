/** Seitz operator algebra: multiply, reduce t mod 1, equality mod lattice. */

import type { Mat3, Operator, Vec3 } from '../types'
import { wrap01 } from '../math'

export type Seitz = { R: Mat3; t: Vec3 }

/** (R2|t2)·(R1|t1) = (R2 R1 | R2 t1 + t2). */
export function multiplySeitz(op2: Seitz, op1: Seitz): Seitz {
  const R: Mat3 = [
    [
      op2.R[0][0] * op1.R[0][0] +
        op2.R[0][1] * op1.R[1][0] +
        op2.R[0][2] * op1.R[2][0],
      op2.R[0][0] * op1.R[0][1] +
        op2.R[0][1] * op1.R[1][1] +
        op2.R[0][2] * op1.R[2][1],
      op2.R[0][0] * op1.R[0][2] +
        op2.R[0][1] * op1.R[1][2] +
        op2.R[0][2] * op1.R[2][2],
    ],
    [
      op2.R[1][0] * op1.R[0][0] +
        op2.R[1][1] * op1.R[1][0] +
        op2.R[1][2] * op1.R[2][0],
      op2.R[1][0] * op1.R[0][1] +
        op2.R[1][1] * op1.R[1][1] +
        op2.R[1][2] * op1.R[2][1],
      op2.R[1][0] * op1.R[0][2] +
        op2.R[1][1] * op1.R[1][2] +
        op2.R[1][2] * op1.R[2][2],
    ],
    [
      op2.R[2][0] * op1.R[0][0] +
        op2.R[2][1] * op1.R[1][0] +
        op2.R[2][2] * op1.R[2][0],
      op2.R[2][0] * op1.R[0][1] +
        op2.R[2][1] * op1.R[1][1] +
        op2.R[2][2] * op1.R[2][1],
      op2.R[2][0] * op1.R[0][2] +
        op2.R[2][1] * op1.R[1][2] +
        op2.R[2][2] * op1.R[2][2],
    ],
  ]
  const t: Vec3 = [
    op2.R[0][0] * op1.t[0] +
      op2.R[0][1] * op1.t[1] +
      op2.R[0][2] * op1.t[2] +
      op2.t[0],
    op2.R[1][0] * op1.t[0] +
      op2.R[1][1] * op1.t[1] +
      op2.R[1][2] * op1.t[2] +
      op2.t[1],
    op2.R[2][0] * op1.t[0] +
      op2.R[2][1] * op1.t[1] +
      op2.R[2][2] * op1.t[2] +
      op2.t[2],
  ]
  return { R, t }
}

/** Reduce each component of t into [0, 1). */
export function reduceT(t: Vec3): Vec3 {
  return [wrap01(t[0]), wrap01(t[1]), wrap01(t[2])]
}

export function matClose(A: Mat3, B: Mat3, eps = 1e-9): boolean {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (Math.abs(A[i][j] - B[i][j]) > eps) return false
    }
  }
  return true
}

/** True if a − b is integer (mod lattice) within eps. */
export function tCloseMod1(a: Vec3, b: Vec3, eps = 1e-6): boolean {
  for (let i = 0; i < 3; i++) {
    const d = Math.abs(wrap01(a[i] - b[i]))
    if (d > eps && d < 1 - eps) return false
  }
  return true
}

export function seitzEqual(a: Seitz, b: Seitz, eps = 1e-6): boolean {
  return matClose(a.R, b.R, eps) && tCloseMod1(a.t, b.t, eps)
}

/** Compose two Operators (same multiply as math.composeOps). */
export function composeOps(op2: Operator, op1: Operator): Seitz {
  return multiplySeitz(op2, op1)
}

export const IDENTITY_R: Mat3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
]

export function isIdentitySeitz(s: Seitz, eps = 1e-6): boolean {
  return matClose(s.R, IDENTITY_R, eps) && tCloseMod1(s.t, [0, 0, 0], eps)
}
