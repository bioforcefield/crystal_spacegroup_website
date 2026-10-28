/** Perspective framing helpers shared by CIF (and tests). */

export const CIF_FOV = 42
export const CIF_FIT_MARGIN = 1.12
/** Ignore first-paint sizes below this — they blow up aspect and hide the cell. */
export const CIF_MIN_CANVAS_PX = 32
/** Clamp extreme aspect ratios from a half-laid-out flex canvas. */
export const CIF_ASPECT_MIN = 0.35
export const CIF_ASPECT_MAX = 3
export const CIF_BOUND_PAD = 0.45

export type Vec3Like = readonly [number, number, number] | number[]

export type CifViewBounds = {
  center: { x: number; y: number; z: number }
  radius: number
}

/** True when R3F size is large enough for a trustworthy aspect / fit. */
export function isUsableCanvasSize(width: number, height: number): boolean {
  return (
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width >= CIF_MIN_CANVAS_PX &&
    height >= CIF_MIN_CANVAS_PX
  )
}

/** Keep fit distance from exploding on a 1×800 (or 800×1) first paint. */
export function clampFitAspect(aspect: number): number {
  if (!Number.isFinite(aspect) || aspect <= 0) return 1
  return Math.min(CIF_ASPECT_MAX, Math.max(CIF_ASPECT_MIN, aspect))
}

/**
 * Aspect for framing, or `null` when the canvas is not ready.
 * Prefer measured size; fall back only when size is unusable *and* fallback is sane.
 */
export function aspectForFit(
  width: number,
  height: number,
  fallbackAspect?: number,
): number | null {
  if (isUsableCanvasSize(width, height)) {
    return clampFitAspect(width / height)
  }
  if (
    fallbackAspect != null &&
    Number.isFinite(fallbackAspect) &&
    fallbackAspect > 0
  ) {
    // Still refuse to fit on a zero canvas — caller should retry.
    return null
  }
  return null
}

/** Distance from target so a sphere of `radius` fits in the view. */
export function fitDistanceForSphere(
  radius: number,
  fovDeg: number,
  aspect: number,
): number {
  const a = clampFitAspect(aspect)
  const vFov = (fovDeg * Math.PI) / 180
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(a, 1e-6))
  const half = Math.min(Math.sin(vFov / 2), Math.sin(hFov / 2))
  return (radius / Math.max(half, 1e-6)) * CIF_FIT_MARGIN
}

/**
 * AABB sphere of cell-centred points (cell corners + visible atom positions).
 * Pure helper so camera-fit regressions are unit-testable without R3F.
 */
export function computeCifViewBounds(
  points: Vec3Like[],
  pad: number = CIF_BOUND_PAD,
): CifViewBounds {
  if (points.length === 0) {
    return { center: { x: 0, y: 0, z: 0 }, radius: Math.max(pad, 1) }
  }
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  for (const p of points) {
    const x = p[0]!
    const y = p[1]!
    const z = p[2]!
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (z < minZ) minZ = z
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
    if (z > maxZ) maxZ = z
  }
  const sx = maxX - minX
  const sy = maxY - minY
  const sz = maxZ - minZ
  const radius = 0.5 * Math.hypot(sx, sy, sz) + pad
  return {
    center: {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      z: (minZ + maxZ) / 2,
    },
    radius: Math.max(radius, 1),
  }
}
