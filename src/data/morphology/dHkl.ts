/**
 * Interplanar spacing d_hkl from a general triclinic cell (Å).
 */

import type { CellParams } from '../types'
import { alphaRad, betaRad, gammaRad } from '../math'

const EPS = 1e-12

/** Reciprocal metric G* = G⁻¹ for the direct metric tensor. */
export function reciprocalMetric(cell: CellParams): {
  ast: number
  bst: number
  cst: number
  cosAs: number
  cosBs: number
  cosGs: number
} {
  const a = cell.a
  const b = cell.b
  const c = cell.c
  const ca = Math.cos(alphaRad(cell))
  const cb = Math.cos(betaRad(cell))
  const cg = Math.cos(gammaRad(cell))
  const sa = Math.sin(alphaRad(cell))
  const sb = Math.sin(betaRad(cell))
  const sg = Math.sin(gammaRad(cell))

  const vol =
    a *
    b *
    c *
    Math.sqrt(
      Math.max(
        0,
        1 - ca * ca - cb * cb - cg * cg + 2 * ca * cb * cg,
      ),
    )
  if (vol < EPS) {
    // Degenerate → treat as orthogonal fallback
    return {
      ast: 1 / a,
      bst: 1 / b,
      cst: 1 / c,
      cosAs: 0,
      cosBs: 0,
      cosGs: 0,
    }
  }

  const ast = (b * c * sa) / vol
  const bst = (a * c * sb) / vol
  const cst = (a * b * sg) / vol
  const cosAs = (cb * cg - ca) / (sb * sg)
  const cosBs = (ca * cg - cb) / (sa * sg)
  const cosGs = (ca * cb - cg) / (sa * sb)
  return { ast, bst, cst, cosAs, cosBs, cosGs }
}

/** d_hkl in Å. Returns Infinity for (000). */
export function dHkl(
  cell: CellParams,
  h: number,
  k: number,
  l: number,
): number {
  if (h === 0 && k === 0 && l === 0) return Number.POSITIVE_INFINITY
  const { ast, bst, cst, cosAs, cosBs, cosGs } = reciprocalMetric(cell)
  const invD2 =
    h * h * ast * ast +
    k * k * bst * bst +
    l * l * cst * cst +
    2 * h * k * ast * bst * cosGs +
    2 * h * l * ast * cst * cosBs +
    2 * k * l * bst * cst * cosAs
  if (invD2 <= EPS) return Number.POSITIVE_INFINITY
  return 1 / Math.sqrt(invD2)
}

/**
 * Outward normal of plane (hk0) in the ab Cartesian frame
 * (a along +x, b in xy). Used for 2D Wulff sketches from BFDH.
 */
export function planeNormalAb(
  cell: CellParams,
  h: number,
  k: number,
): { nx: number; ny: number } {
  const g = gammaRad(cell)
  const sin = Math.sin(g)
  const cos = Math.cos(g)
  const s = Math.abs(sin) < 1e-9 ? 1 : sin
  // xf = x/a − y cosγ /(a sinγ); yf = y /(b sinγ)
  // grad (h xf + k yf)
  const nx = h / cell.a
  const ny = (-h * cos) / (cell.a * s) + k / (cell.b * s)
  const L = Math.hypot(nx, ny)
  if (L < EPS) return { nx: 1, ny: 0 }
  return { nx: nx / L, ny: ny / L }
}
