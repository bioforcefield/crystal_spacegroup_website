/** Shared fractional/cartesian math for space-group demos. */

import type {
  CellParams,
  GeneralPoint,
  Mat3,
  Operator,
  SpaceGroupDemo,
  SymmetryClass,
  SymmetryClassId,
  Vec3,
} from './types'

export function det3(R: Mat3): number {
  return (
    R[0][0] * (R[1][1] * R[2][2] - R[1][2] * R[2][1]) -
    R[0][1] * (R[1][0] * R[2][2] - R[1][2] * R[2][0]) +
    R[0][2] * (R[1][0] * R[2][1] - R[1][1] * R[2][0])
  )
}

export function isImproper(R: Mat3): boolean {
  return det3(R) < 0
}

/**
 * Split R into a proper rotation + optional mirror (scale.x = −1).
 * Flips the first column of an improper R so det becomes +1.
 */
export function properBasis(R: Mat3): { proper: Mat3; mirror: boolean } {
  if (!isImproper(R)) {
    return { proper: R, mirror: false }
  }
  const proper: Mat3 = [
    [-R[0][0], R[0][1], R[0][2]],
    [-R[1][0], R[1][1], R[1][2]],
    [-R[2][0], R[2][1], R[2][2]],
  ]
  return { proper, mirror: true }
}

export function wrap01(v: number): number {
  return ((v % 1) + 1) % 1
}

export function applyOperator(op: Operator, p: Vec3): Vec3 {
  const x =
    op.R[0][0] * p[0] + op.R[0][1] * p[1] + op.R[0][2] * p[2] + op.t[0]
  const y =
    op.R[1][0] * p[0] + op.R[1][1] * p[1] + op.R[1][2] * p[2] + op.t[1]
  const z =
    op.R[2][0] * p[0] + op.R[2][1] * p[1] + op.R[2][2] * p[2] + op.t[2]
  return [wrap01(x), wrap01(y), wrap01(z)]
}

export function applyOperatorRaw(op: Operator, p: Vec3): Vec3 {
  const x =
    op.R[0][0] * p[0] + op.R[0][1] * p[1] + op.R[0][2] * p[2] + op.t[0]
  const y =
    op.R[1][0] * p[0] + op.R[1][1] * p[1] + op.R[1][2] * p[2] + op.t[1]
  const z =
    op.R[2][0] * p[0] + op.R[2][1] * p[1] + op.R[2][2] * p[2] + op.t[2]
  return [x, y, z]
}

export function addFrac(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

/** β in radians; unique axis b monoclinic (α = γ = 90°). */
export function betaRad(cell: CellParams): number {
  const deg = cell.betaDeg ?? 90
  return (deg * Math.PI) / 180
}

/**
 * Fractional → Cartesian.
 * Unique-axis b: x = xa + zc cosβ, y = yb, z = zc sinβ.
 */
export function fracToCart(p: Vec3, cell: CellParams): Vec3 {
  const beta = betaRad(cell)
  const cosB = Math.cos(beta)
  const sinB = Math.sin(beta)
  return [
    p[0] * cell.a + p[2] * cell.c * cosB,
    p[1] * cell.b,
    p[2] * cell.c * sinB,
  ]
}

/** Cartesian → fractional (inverse of fracToCart; unique-axis b). */
export function cartToFrac(p: Vec3, cell: CellParams): Vec3 {
  const beta = betaRad(cell)
  const cosB = Math.cos(beta)
  const sinB = Math.sin(beta)
  const zFrac = Math.abs(sinB) < 1e-12 ? 0 : p[2] / (cell.c * sinB)
  const yFrac = p[1] / cell.b
  const xFrac = (p[0] - zFrac * cell.c * cosB) / cell.a
  return [xFrac, yFrac, zFrac]
}

/** Cartesian center of the unit cell (fractional ½,½,½). */
export function cellCenterCart(cell: CellParams): Vec3 {
  return fracToCart([0.5, 0.5, 0.5], cell)
}

/** Eight corners of the unit cell in Cartesian coords. */
export function cellCornersCart(cell: CellParams): Vec3[] {
  const corners: Vec3[] = []
  for (const z of [0, 1]) {
    for (const y of [0, 1]) {
      for (const x of [0, 1]) {
        corners.push(fracToCart([x, y, z], cell))
      }
    }
  }
  // Order matching orthorhombic wireframe: bottom 0,a,a+b,b then top +c
  return [
    fracToCart([0, 0, 0], cell),
    fracToCart([1, 0, 0], cell),
    fracToCart([1, 1, 0], cell),
    fracToCart([0, 1, 0], cell),
    fracToCart([0, 0, 1], cell),
    fracToCart([1, 0, 1], cell),
    fracToCart([1, 1, 1], cell),
    fracToCart([0, 1, 1], cell),
  ]
}

export function classColor(
  demo: SpaceGroupDemo,
  classId: SymmetryClassId,
): string {
  return demo.symmetryClasses[classId]?.color ?? '#94a3b8'
}

export function operatorClass(
  demo: SpaceGroupDemo,
  op: Operator,
): SymmetryClass {
  return demo.symmetryClasses[op.classId]
}

export function generalPositions(demo: SpaceGroupDemo): GeneralPoint[] {
  return demo.operators.map((op) => {
    const fractional = applyOperator(op, demo.seed)
    return {
      index: op.index,
      fractional,
      cartesian: fracToCart(fractional, demo.cell),
      operator: op,
      improper: isImproper(op.R),
      classId: op.classId,
      classColor: classColor(demo, op.classId),
    }
  })
}

export function colorByHeight(zFrac: number): string {
  const t = Math.min(1, Math.max(0, zFrac))
  const h = 210 - t * 180
  return `hsl(${h} 85% 58%)`
}

/** Compose Seitz (R2|t2)·(R1|t1) = (R2 R1 | R2 t1 + t2). */
export function composeOps(op2: Operator, op1: Operator): { R: Mat3; t: Vec3 } {
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

function matClose(A: Mat3, B: Mat3, eps = 1e-9): boolean {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (Math.abs(A[i][j] - B[i][j]) > eps) return false
    }
  }
  return true
}

function tCloseMod1(a: Vec3, b: Vec3, eps = 1e-6): boolean {
  for (let i = 0; i < 3; i++) {
    const d = Math.abs(wrap01(a[i] - b[i]))
    if (d > eps && d < 1 - eps) return false
  }
  return true
}

/** Verify operators close under composition mod lattice. */
export function auditGroupClosure(ops: Operator[]): string[] {
  const errors: string[] = []
  for (const a of ops) {
    for (const b of ops) {
      const { R, t } = composeOps(a, b)
      const match = ops.find(
        (o) => matClose(o.R, R) && tCloseMod1(o.t, t),
      )
      if (!match) {
        errors.push(
          `op${a.index}∘op${b.index} not in group (mod lattice)`,
        )
      }
    }
  }
  return errors
}
