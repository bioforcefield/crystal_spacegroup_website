/**
 * Thermal ellipsoid helpers for CIF Uiso / anisotropic Uij.
 * Teaching-grade: scales balls by Uiso, or draws principal-axis ellipsoids
 * from Uij (crystal frame ≈ Cartesian for near-orthogonal cells; still useful).
 */

import type { CifAnisoU } from './types'
import type { Mat3, Vec3 } from '../types'

const PROB_SCALE = 1.5 // ~50% probability envelope-ish (soft)

export function uIsoRadiusScale(uIso: number | undefined, base: number): number {
  if (uIso == null || !(uIso > 0)) return base
  // Typical organic Uiso ~0.02–0.08 Å²; keep factors modest
  const s = Math.sqrt(uIso) * PROB_SCALE
  return base * (0.85 + Math.min(1.6, s * 8))
}

/** Symmetric U matrix from Voigt components. */
export function uMatrix(u: CifAnisoU): Mat3 {
  return [
    [u.u11, u.u12, u.u13],
    [u.u12, u.u22, u.u23],
    [u.u13, u.u23, u.u33],
  ]
}

export function meanUiso(u: CifAnisoU): number {
  return (u.u11 + u.u22 + u.u33) / 3
}

/**
 * Analytic eigenvalues/vectors for 3×3 symmetric matrix (Jacobi, few sweeps).
 * Returns eigenvalues (Å²) and orthonormal eigenvectors as columns of V.
 */
export function eigenSymmetric3(A: Mat3): { values: Vec3; vectors: Mat3 } {
  let a = A.map((r) => [...r]) as Mat3
  let v: Mat3 = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ]
  for (let iter = 0; iter < 12; iter++) {
    // Find largest off-diagonal
    let p = 0
    let q = 1
    let max = Math.abs(a[0][1]!)
    for (const [i, j] of [
      [0, 2],
      [1, 2],
    ] as const) {
      const m = Math.abs(a[i]![j]!)
      if (m > max) {
        max = m
        p = i
        q = j
      }
    }
    if (max < 1e-12) break
    const app = a[p]![p]!
    const aqq = a[q]![q]!
    const apq = a[p]![q]!
    const phi = 0.5 * Math.atan2(2 * apq, aqq - app)
    const c = Math.cos(phi)
    const s = Math.sin(phi)
    // Rotate A
    const newA = a.map((r) => [...r]) as Mat3
    for (let i = 0; i < 3; i++) {
      if (i === p || i === q) continue
      const aip = a[i]![p]!
      const aiq = a[i]![q]!
      newA[i]![p] = c * aip - s * aiq
      newA[p]![i] = newA[i]![p]!
      newA[i]![q] = s * aip + c * aiq
      newA[q]![i] = newA[i]![q]!
    }
    newA[p]![p] = c * c * app - 2 * s * c * apq + s * s * aqq
    newA[q]![q] = s * s * app + 2 * s * c * apq + c * c * aqq
    newA[p]![q] = 0
    newA[q]![p] = 0
    a = newA
    // Accumulate V
    const newV = v.map((r) => [...r]) as Mat3
    for (let i = 0; i < 3; i++) {
      const vip = v[i]![p]!
      const viq = v[i]![q]!
      newV[i]![p] = c * vip - s * viq
      newV[i]![q] = s * vip + c * viq
    }
    v = newV
  }
  const values: Vec3 = [
    Math.max(0, a[0][0]!),
    Math.max(0, a[1][1]!),
    Math.max(0, a[2][2]!),
  ]
  return { values, vectors: v }
}

/**
 * Ellipsoid half-axes (Å) and rotation matrix (columns = axes in Cartesian /
 * crystal frame used for Uij). Soft fallback when U is tiny/negative.
 */
export function ellipsoidAxes(u: CifAnisoU): {
  radii: Vec3
  rotation: Mat3
  uIsoEquiv: number
} {
  const { values, vectors } = eigenSymmetric3(uMatrix(u))
  const radii: Vec3 = [
    Math.max(0.05, Math.sqrt(values[0]) * PROB_SCALE),
    Math.max(0.05, Math.sqrt(values[1]) * PROB_SCALE),
    Math.max(0.05, Math.sqrt(values[2]) * PROB_SCALE),
  ]
  return { radii, rotation: vectors, uIsoEquiv: meanUiso(u) }
}

/** Stable residue → hue color (HSL). */
export function residueColor(residue: string | undefined, alpha = 1): string {
  if (!residue) return `rgba(148,163,184,${alpha})`
  let h = 0
  for (let i = 0; i < residue.length; i++) h = (h * 31 + residue.charCodeAt(i)) >>> 0
  const hue = h % 360
  return `hsla(${hue}, 65%, 58%, ${alpha})`
}
