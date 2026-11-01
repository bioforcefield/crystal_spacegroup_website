/** Kabsch least-squares superposition (3×3 via Jacobi eigen-decomposition of the 4×4 quaternion matrix). */
import type { Vec3 } from '../types'

export interface Superposition { rot: number[][]; /** apply: R·(p − cm) + cf */ cMobile: Vec3; cFixed: Vec3; rmsd: number; n: number }

const centroid = (P: Vec3[]): Vec3 => {
  const c: Vec3 = [0, 0, 0]
  for (const p of P) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2] }
  return [c[0] / P.length, c[1] / P.length, c[2] / P.length]
}

/** Jacobi eigen-decomposition of a symmetric n×n matrix. Returns eigenvalues + column eigenvectors. */
export function jacobiEigen(A: number[][]): { values: number[]; vectors: number[][] } {
  const n = A.length
  const a = A.map((r) => r.slice())
  const v: number[][] = a.map((_, i) => a.map((__, j) => (i === j ? 1 : 0)))
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p]![q]! ** 2
    if (off < 1e-18) break
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      const apq = a[p]![q]!
      if (Math.abs(apq) < 1e-20) continue
      const theta = (a[q]![q]! - a[p]![p]!) / (2 * apq)
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1))
      const c = 1 / Math.sqrt(t * t + 1), s = t * c
      for (let k = 0; k < n; k++) {
        const akp = a[k]![p]!, akq = a[k]![q]!
        a[k]![p] = c * akp - s * akq; a[k]![q] = s * akp + c * akq
      }
      for (let k = 0; k < n; k++) {
        const apk = a[p]![k]!, aqk = a[q]![k]!
        a[p]![k] = c * apk - s * aqk; a[q]![k] = s * apk + c * aqk
      }
      for (let k = 0; k < n; k++) {
        const vkp = v[k]![p]!, vkq = v[k]![q]!
        v[k]![p] = c * vkp - s * vkq; v[k]![q] = s * vkp + c * vkq
      }
    }
  }
  return { values: a.map((r, i) => r[i]!), vectors: v }
}

function jacobiMaxEig(A: number[][]): number[] {
  const { values, vectors } = jacobiEigen(A)
  let best = 0
  for (let i = 1; i < values.length; i++) if (values[i]! > values[best]!) best = i
  return vectors.map((row) => row[best]!)
}

/** Horn (1987) quaternion superposition; no minimum point count (callers validate). */
export function superpose(mobile: Vec3[], fixed: Vec3[]): Superposition {
  return superposeImpl(mobile, fixed)
}

/** Best rotation taking `mobile` onto `fixed` (paired points, same length ≥ 3). */
export function kabsch(mobile: Vec3[], fixed: Vec3[]): Superposition {
  if (Math.min(mobile.length, fixed.length) < 3) throw new Error('Superposition needs at least 3 paired atoms')
  return superpose(mobile, fixed)
}

function superposeImpl(mobile: Vec3[], fixed: Vec3[]): Superposition {
  const n = Math.min(mobile.length, fixed.length)
  const P = mobile.slice(0, n), Q = fixed.slice(0, n)
  const cm = centroid(P), cf = centroid(Q)
  const S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
  for (let k = 0; k < n; k++) {
    const p = [P[k]![0] - cm[0], P[k]![1] - cm[1], P[k]![2] - cm[2]]
    const q = [Q[k]![0] - cf[0], Q[k]![1] - cf[1], Q[k]![2] - cf[2]]
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) S[i]![j]! += p[i]! * q[j]!
  }
  const [xx, xy, xz] = S[0]!, [yx, yy, yz] = S[1]!, [zx, zy, zz] = S[2]!
  const N = [
    [xx + yy + zz, yz - zy, zx - xz, xy - yx],
    [yz - zy, xx - yy - zz, xy + yx, zx + xz],
    [zx - xz, xy + yx, -xx + yy - zz, yz + zy],
    [xy - yx, zx + xz, yz + zy, -xx - yy + zz],
  ] as number[][]
  const [w, x, y, z] = jacobiMaxEig(N) as [number, number, number, number]
  const rot = [
    [w * w + x * x - y * y - z * z, 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), w * w - x * x + y * y - z * z, 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), w * w - x * x - y * y + z * z],
  ]
  const sp: Superposition = { rot, cMobile: cm, cFixed: cf, rmsd: 0, n }
  let ss = 0
  for (let k = 0; k < n; k++) {
    const t = applySuperposition(sp, P[k]!)
    ss += (t[0] - Q[k]![0]) ** 2 + (t[1] - Q[k]![1]) ** 2 + (t[2] - Q[k]![2]) ** 2
  }
  sp.rmsd = Math.sqrt(ss / n)
  return sp
}

export function applySuperposition(sp: Superposition, p: Vec3): Vec3 {
  const d = [p[0] - sp.cMobile[0], p[1] - sp.cMobile[1], p[2] - sp.cMobile[2]]
  const R = sp.rot
  return [
    R[0]![0]! * d[0]! + R[0]![1]! * d[1]! + R[0]![2]! * d[2]! + sp.cFixed[0],
    R[1]![0]! * d[0]! + R[1]![1]! * d[1]! + R[1]![2]! * d[2]! + sp.cFixed[1],
    R[2]![0]! * d[0]! + R[2]![1]! * d[1]! + R[2]![2]! * d[2]! + sp.cFixed[2],
  ]
}
