/**
 * Reuse a teaching space-group demo's element loci (screws, glides,
 * inversions, mirrors) but place them with the loaded CIF cell metric.
 * Fractional loci stay the same; only frac→Cartesian uses the real a,b,c,α,β,γ.
 */
import { getDemo } from '../registry'
import type { CellParams, SpaceGroupDemo } from '../types'

/** Count drawn geometric overlays (not operator chips). */
export function countDemoElements(demo: SpaceGroupDemo): number {
  return (
    demo.screwAxes.length +
    demo.inversionCenters.length +
    demo.glidePlanes.length
  )
}

/**
 * Return the ITA teaching demo for `spaceGroupNumber` with `cell` substituted.
 * Returns undefined when the SG is unknown or not in 1–230.
 */
export function demoWithCifCell(
  spaceGroupNumber: number | null | undefined,
  cell: CellParams,
): SpaceGroupDemo | undefined {
  if (spaceGroupNumber == null || spaceGroupNumber < 1 || spaceGroupNumber > 230) {
    return undefined
  }
  const demo = getDemo(spaceGroupNumber)
  if (!demo) return undefined
  return { ...demo, cell }
}
