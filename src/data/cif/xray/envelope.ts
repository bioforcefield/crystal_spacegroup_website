/** Stick → continuum envelope for teaching PXRD plots. */

export interface StickPeak {
  twoTheta: number
  intensity: number
}

/**
 * Sample a Lorentzian envelope of stick peaks over [tMin, tMax].
 * FWHM in degrees; returns n evenly spaced (2θ, I) points normalized to max 100.
 */
export function lorentzEnvelope(
  peaks: StickPeak[],
  tMin: number,
  tMax: number,
  fwhmDeg: number,
  n = 400,
): { x: number[]; y: number[] } {
  const x: number[] = []
  const y: number[] = []
  if (!(tMax > tMin) || n < 2) return { x, y }
  const half = Math.max(0.01, fwhmDeg) / 2
  const gamma2 = half * half
  let ymax = 0
  for (let i = 0; i < n; i++) {
    const xi = tMin + ((tMax - tMin) * i) / (n - 1)
    let yi = 0
    for (const p of peaks) {
      if (p.intensity <= 0) continue
      const dx = xi - p.twoTheta
      yi += p.intensity * (gamma2 / (dx * dx + gamma2))
    }
    x.push(xi)
    y.push(yi)
    if (yi > ymax) ymax = yi
  }
  if (ymax > 0) {
    for (let i = 0; i < y.length; i++) y[i] = (y[i]! / ymax) * 100
  }
  return { x, y }
}

/** SVG polyline points string for a plot box. */
export function envelopePolyline(
  x: number[],
  y: number[],
  box: { x0: number; y0: number; x1: number; y1: number },
  domain: { xmin: number; xmax: number; ymin: number; ymax: number },
): string {
  const parts: string[] = []
  const dx = domain.xmax - domain.xmin || 1
  const dy = domain.ymax - domain.ymin || 1
  const w = box.x1 - box.x0
  const h = box.y1 - box.y0
  for (let i = 0; i < x.length; i++) {
    const px = box.x0 + ((x[i]! - domain.xmin) / dx) * w
    const py = box.y1 - ((y[i]! - domain.ymin) / dy) * h
    parts.push(`${px.toFixed(2)},${py.toFixed(2)}`)
  }
  return parts.join(' ')
}
