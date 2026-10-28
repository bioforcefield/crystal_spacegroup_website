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

/**
 * Inversion-center card: junction offset from ⊙ at B matches the prior CSS start pose
 * translate(60,36) scale(1) translate(-26,-10). Full inversion (x,y,z)→(−x,−y,−z)
 * has det −1 (improper).
 */
export const INVERSION_PRIMER = {
  center: { x: 60, y: 36 },
  /** Screen offset of the Motif junction from center at s=+1 (B). */
  offset: { x: -26, y: -10 },
} as const

/** MotifGlyph beam / tip lengths (object units) — shared with InvGhost tip rays. */
export const MOTIF_DIMS = {
  lx: 7.5,
  ly: 10,
  lz: 8.5,
  ay: 1.2,
} as const

/** Object-space tip anchors used for tip→⊙→image rays (stem / arm / foot). */
export const INVERSION_TIP_OBJECT = {
  stem: { x: 0, y: MOTIF_DIMS.ly, z: 0 },
  arm: { x: MOTIF_DIMS.lx, y: MOTIF_DIMS.ay, z: 0 },
  foot: { x: 0, y: MOTIF_DIMS.ay, z: MOTIF_DIMS.lz },
} as const

/** Ease in-out quad used by ScrewGhost / InvGhost. */
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

/**
 * Central homothety scale for InvGhost: eased e∈[0,1] → s = 1 − 2e (1→0→−1).
 * s=0 collapses onto ⊙; s=−1 is the 3D-inverted enantiomorph.
 */
export function inversionScale(e: number): number {
  return 1 - 2 * e
}

/** Junction screen position at homothety scale s (B: +1, I: −1). */
export function inversionJunction(s: number): { x: number; y: number } {
  const { center, offset } = INVERSION_PRIMER
  return { x: center.x + s * offset.x, y: center.y + s * offset.y }
}

/**
 * Screen tip at homothety scale s: center + s·(offset + iso(tipObj)).
 * Rays B→I therefore pass through the center when s goes 1→−1.
 */
export function inversionTipScreen(
  tip: { x: number; y: number; z: number },
  s: number,
): { x: number; y: number } {
  const { center, offset } = INVERSION_PRIMER
  const [px, py] = iso(tip.x, tip.y, tip.z)
  return {
    x: center.x + s * (offset.x + px),
    y: center.y + s * (offset.y + py),
  }
}
