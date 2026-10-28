/** Pure geometry for the home Symmetry primer (no SVG). */

/** Classic isometric screen coords from object (x right, y up, z toward viewer). */
export function iso(x: number, y: number, z: number): [number, number] {
  const sx = (x - z) * 0.8660254
  const sy = (x + z) * 0.5 - y
  return [sx, sy]
}

/**
 * Rotate object coords about +Y (screw / vertical axis), then optional enantiomorph
 * (mirror in YZ: x → −x). Order: yaw first (proper), then enantiomorph (improper).
 */
export function objectMap(
  x: number,
  y: number,
  z: number,
  yawDeg: number,
  enantiomorph: boolean,
): [number, number, number] {
  const rad = (yawDeg * Math.PI) / 180
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  let X = x * c + z * s
  const Y = y
  const Z = -x * s + z * c
  if (enantiomorph) X = -X
  return [X, Y, Z]
}

/** 2₁ screw card constants: axis x, orbit radius, start y, +½ slide (screen px). */
export const SCREW_PRIMER = {
  axisX: 60,
  radius: 24,
  y0: 22,
  halfSlide: 28,
  B: { x: 36, y: 22, yaw: 0 },
  I: { x: 84, y: 50, yaw: 180 },
} as const

/** Ease in-out quad used by ScrewGhost. */
export function screwEase(p: number): number {
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
}

/** ScrewGhost pose at eased progress e ∈ [0,1]: orbit 0→π about axis, yaw 0→180, +½ slide. */
export function screwPose(e: number): { x: number; y: number; yaw: number } {
  const { axisX, radius, y0, halfSlide } = SCREW_PRIMER
  return {
    x: axisX - radius * Math.cos(Math.PI * e),
    y: y0 + halfSlide * e,
    yaw: 180 * e,
  }
}
