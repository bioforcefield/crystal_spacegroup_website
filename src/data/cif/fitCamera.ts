/** Perspective framing helpers shared by CIF (and tests). */

export const CIF_FOV = 42
export const CIF_FIT_MARGIN = 1.12

/** Distance from target so a sphere of `radius` fits in the view. */
export function fitDistanceForSphere(
  radius: number,
  fovDeg: number,
  aspect: number,
): number {
  const vFov = (fovDeg * Math.PI) / 180
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(aspect, 1e-6))
  const half = Math.min(Math.sin(vFov / 2), Math.sin(hFov / 2))
  return (radius / Math.max(half, 1e-6)) * CIF_FIT_MARGIN
}
