/** Small vector / dihedral helpers for structure analysis (degrees out). */
import type { Vec3 } from '../../types'

export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s]
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
export const norm = (a: Vec3) => Math.hypot(a[0], a[1], a[2])
export const unit = (a: Vec3): Vec3 => { const n = norm(a) || 1; return [a[0] / n, a[1] / n, a[2] / n] }
export const dist = (a: Vec3, b: Vec3) => norm(sub(a, b))
export const RAD = 180 / Math.PI

/** IUPAC dihedral a-b-c-d in degrees, range (-180, 180]. */
export function dihedral(a: Vec3, b: Vec3, c: Vec3, d: Vec3): number {
  const b0 = sub(a, b), b1 = sub(c, b), b2 = sub(d, c)
  const b1u = unit(b1)
  const v = sub(b0, scale(b1u, dot(b0, b1u)))
  const w = sub(b2, scale(b1u, dot(b2, b1u)))
  const x = dot(v, w)
  const y = dot(cross(b1u, v), w)
  return Math.atan2(y, x) * RAD
}

/** Wrap an angle to (-180, 180]. */
export function wrap180(a: number): number {
  let x = ((a + 180) % 360 + 360) % 360 - 180
  if (x === -180) x = 180
  return x
}

/** Rodrigues rotation of v about unit axis k by angle (deg). */
export function rotate(v: Vec3, k: Vec3, deg: number): Vec3 {
  const t = deg / RAD, c = Math.cos(t), s = Math.sin(t)
  const kv = cross(k, v), kd = dot(k, v)
  return [v[0] * c + kv[0] * s + k[0] * kd * (1 - c), v[1] * c + kv[1] * s + k[1] * kd * (1 - c), v[2] * c + kv[2] * s + k[2] * kd * (1 - c)]
}

/** Signed angle from a to b (deg) with the sign from ref (3DNA magang/vec_ang). */
export function signedAngle(a: Vec3, b: Vec3, ref: Vec3): number {
  // project onto plane ⟂ ref
  const r = unit(ref)
  const ap = unit(sub(a, scale(r, dot(a, r))))
  const bp = unit(sub(b, scale(r, dot(b, r))))
  const ang = Math.acos(Math.max(-1, Math.min(1, dot(ap, bp)))) * RAD
  return dot(cross(ap, bp), r) < 0 ? -ang : ang
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
        a[k]![p] = c * akp - s * akq
        a[k]![q] = s * akp + c * akq
      }
      for (let k = 0; k < n; k++) {
        const apk = a[p]![k]!, aqk = a[q]![k]!
        a[p]![k] = c * apk - s * aqk
        a[q]![k] = s * apk + c * aqk
      }
      for (let k = 0; k < n; k++) {
        const vkp = v[k]![p]!, vkq = v[k]![q]!
        v[k]![p] = c * vkp - s * vkq
        v[k]![q] = s * vkp + c * vkq
      }
    }
  }
  return { values: a.map((r, i) => r[i]!), vectors: v }
}

/**
 * Least-squares superposition (Horn 1987 quaternion) of reference points P onto
 * target points Q. Returns rotation R (rows) and translation t so Q ≈ R·P + t, plus rmsd.
 */
export function lsFit(P: Vec3[], Q: Vec3[]): { R: number[][]; t: Vec3; rmsd: number } {
  const n = P.length
  const cp = scale(P.reduce(add, [0, 0, 0]), 1 / n)
  const cq = scale(Q.reduce(add, [0, 0, 0]), 1 / n)
  const S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
  for (let i = 0; i < n; i++) {
    const p = sub(P[i]!, cp), q = sub(Q[i]!, cq)
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) S[r]![c]! += p[r]! * q[c]!
  }
  const [xx, xy, xz] = S[0] as Vec3, [yx, yy, yz] = S[1] as Vec3, [zx, zy, zz] = S[2] as Vec3
  const N = [
    [xx + yy + zz, yz - zy, zx - xz, xy - yx],
    [yz - zy, xx - yy - zz, xy + yx, zx + xz],
    [zx - xz, xy + yx, -xx + yy - zz, yz + zy],
    [xy - yx, zx + xz, yz + zy, -xx - yy + zz],
  ]
  const { values, vectors } = jacobiEigen(N)
  let k = 0
  for (let i = 1; i < 4; i++) if (values[i]! > values[k]!) k = i
  const [q0, q1, q2, q3] = [vectors[0]![k]!, vectors[1]![k]!, vectors[2]![k]!, vectors[3]![k]!]
  const R = [
    [q0 * q0 + q1 * q1 - q2 * q2 - q3 * q3, 2 * (q1 * q2 - q0 * q3), 2 * (q1 * q3 + q0 * q2)],
    [2 * (q1 * q2 + q0 * q3), q0 * q0 - q1 * q1 + q2 * q2 - q3 * q3, 2 * (q2 * q3 - q0 * q1)],
    [2 * (q1 * q3 - q0 * q2), 2 * (q2 * q3 + q0 * q1), q0 * q0 - q1 * q1 - q2 * q2 + q3 * q3],
  ]
  const mul = (v: Vec3): Vec3 => [dot(R[0] as Vec3, v), dot(R[1] as Vec3, v), dot(R[2] as Vec3, v)]
  const t = sub(cq, mul(cp))
  let e = 0
  for (let i = 0; i < n; i++) e += dist(add(mul(P[i]!), t), Q[i]!) ** 2
  return { R, t, rmsd: Math.sqrt(e / n) }
}
