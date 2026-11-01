/** Small vector / dihedral helpers for structure analysis (degrees out). */
import { superpose } from '../kabsch'
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

export { jacobiEigen } from '../kabsch'

/**
 * Least-squares superposition of reference points P onto target points Q (shared
 * Horn-quaternion solver in ../kabsch). Returns rotation R (rows) and translation t
 * so Q ≈ R·P + t, plus rmsd.
 */
export function lsFit(P: Vec3[], Q: Vec3[]): { R: number[][]; t: Vec3; rmsd: number } {
  const sp = superpose(P, Q)
  const R = sp.rot
  const Rc: Vec3 = [dot(R[0] as Vec3, sp.cMobile), dot(R[1] as Vec3, sp.cMobile), dot(R[2] as Vec3, sp.cMobile)]
  return { R, t: sub(sp.cFixed, Rc), rmsd: sp.rmsd }
}
