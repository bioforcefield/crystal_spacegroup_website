/**
 * Schematic crystal nucleation & growth kinetics for teaching plots.
 * Not fitted industrial rate laws — axes are dimensionless teaching proxies.
 */

/** Supersaturation σ = (c − c_eq) / c_eq  (relative). S = 1 + σ. */
export function supersaturationFromS(S: number): number {
  return Math.max(0, S - 1)
}

/**
 * Classical homogeneous nucleation barrier scale: ΔG* ∝ γ³ / σ²
 * Returns a normalized barrier (teaching units).
 */
export function nucleationBarrier(sigma: number, gamma: number): number {
  const s = Math.max(sigma, 1e-6)
  const g = Math.max(gamma, 0.05)
  return (g * g * g) / (s * s)
}

/**
 * Critical radius proxy r* ∝ γ / σ (teaching units).
 */
export function criticalRadius(sigma: number, gamma: number): number {
  const s = Math.max(sigma, 1e-6)
  return Math.max(gamma, 0.05) / s
}

/**
 * Nucleation rate J ∝ exp(−B γ³ / σ²). Sharp rise with σ.
 * `prefactor` sets vertical scale; `B` stiffness of the barrier.
 */
export function nucleationRate(
  sigma: number,
  gamma: number,
  opts?: { prefactor?: number; B?: number },
): number {
  const A = opts?.prefactor ?? 1
  const B = opts?.B ?? 1
  const barrier = B * nucleationBarrier(sigma, gamma)
  // Cap extreme underflow
  if (barrier > 80) return 0
  return A * Math.exp(-barrier)
}

/** Induction time proxy τ ∝ 1 / (J + ε). */
export function inductionTime(
  sigma: number,
  gamma: number,
  opts?: { prefactor?: number; B?: number; eps?: number },
): number {
  const J = nucleationRate(sigma, gamma, opts)
  const eps = opts?.eps ?? 1e-6
  return 1 / (J + eps)
}

export type GrowthMechanism = 'spiral' | 'birth' | 'rough'

/**
 * Schematic growth rate vs supersaturation.
 * - spiral (BCF-like): ∝ σ² at low σ
 * - birth-and-spread / 2D nucleation: steeper, ≈ σ · exp(−C/σ)
 * - rough / continuous: ∝ σ
 */
export function growthRate(
  sigma: number,
  mechanism: GrowthMechanism,
  opts?: { C?: number; scale?: number },
): number {
  const s = Math.max(sigma, 0)
  const scale = opts?.scale ?? 1
  const C = opts?.C ?? 0.35
  switch (mechanism) {
    case 'spiral':
      return scale * s * s
    case 'birth': {
      if (s < 1e-8) return 0
      return scale * s * Math.exp(-C / s)
    }
    case 'rough':
      return scale * s
    default:
      return 0
  }
}

/**
 * Linear size vs time at fixed growth rate R: L = L0 + R · t
 */
export function sizeVsTime(
  t: number,
  rate: number,
  L0 = 0,
): number {
  return L0 + Math.max(0, rate) * Math.max(0, t)
}

/** Sample σ grid for SVG plots. */
export function sigmaGrid(
  maxSigma: number,
  n = 64,
): number[] {
  const out: number[] = []
  const m = Math.max(2, n)
  for (let i = 0; i < m; i++) {
    out.push((maxSigma * i) / (m - 1))
  }
  return out
}

/** Map data series to SVG polyline points in a viewBox. */
export function seriesToPolyline(
  xs: number[],
  ys: number[],
  box: { x0: number; y0: number; x1: number; y1: number },
  domain: { xmin: number; xmax: number; ymin: number; ymax: number },
): string {
  const { x0, y0, x1, y1 } = box
  const { xmin, xmax, ymin, ymax } = domain
  const dx = xmax - xmin || 1
  const dy = ymax - ymin || 1
  const pts: string[] = []
  for (let i = 0; i < xs.length; i++) {
    const x = x0 + ((xs[i]! - xmin) / dx) * (x1 - x0)
    const y = y1 - ((ys[i]! - ymin) / dy) * (y1 - y0)
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`)
  }
  return pts.join(' ')
}
