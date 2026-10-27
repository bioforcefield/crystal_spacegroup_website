/**
 * Lattice centering + Donnay–Harker reflection conditions (lattice only).
 * Screw/glide conditions live in extinctions.ts when operators are supplied.
 *
 * R lattices: hexagonal axes use −h+k+l=3n; rhombohedral axes (RS / :R)
 * are primitive — treat as P for extinctions.
 */

export type LatticeCentering = 'P' | 'A' | 'B' | 'C' | 'I' | 'F' | 'R'

/** First lattice letter from an HM / Hall-ish symbol, default P. */
export function centeringFromHm(hm: string | null | undefined): LatticeCentering {
  if (!hm) return 'P'
  const t = hm.trim().replace(/^['"]|['"]$/g, '')
  const m = t.match(/^([PABCIFRpabcifr])\b/)
  if (!m) {
    // Compact HM: "P21/c", "Fd-3m", "I4_1/amd"
    const c = t.charAt(0).toUpperCase()
    if ('PABCIFR'.includes(c)) return c as LatticeCentering
    return 'P'
  }
  return m[1]!.toUpperCase() as LatticeCentering
}

/**
 * True when an R lattice is described on rhombohedral axes (not hexagonal).
 * CIF/COD often mark this as "RS", ":R", or "rhombohedral".
 */
export function isRhombohedralSetting(hm: string | null | undefined): boolean {
  if (!hm) return false
  const t = hm.toUpperCase()
  if (/\bRS\b/.test(t)) return true
  if (/:\s*R\b/.test(t)) return true
  if (/RHOMB/.test(t)) return true
  return false
}

export type CellMetricHint = {
  a: number
  b: number
  c: number
  alphaDeg?: number
  betaDeg?: number
  gammaDeg?: number
}

/**
 * Heuristic: a≈b≈c and α≈β≈γ (not ~90°, not hexagonal γ≈120°) → rhombohedral metric.
 */
export function cellLooksRhombohedral(cell: CellMetricHint): boolean {
  const { a, b, c } = cell
  if (!(a > 0 && b > 0 && c > 0)) return false
  const abcClose =
    Math.abs(a - b) / a < 0.03 && Math.abs(a - c) / a < 0.03
  if (!abcClose) return false
  const al = cell.alphaDeg ?? 90
  const be = cell.betaDeg ?? 90
  const ga = cell.gammaDeg ?? 90
  const angClose = Math.abs(al - be) < 3 && Math.abs(al - ga) < 3
  if (!angClose) return false
  // Distinct from orthogonal cubic and from hexagonal (γ≈120, α=β=90)
  if (Math.abs(al - 90) < 4) return false
  if (Math.abs(ga - 120) < 5) return false
  return true
}

/**
 * Centering to use for lattice reflection conditions / BFDH Harker.
 * R on rhombohedral axes → P (primitive cell). Prefer HM markers; fall back to cell metric.
 */
export function effectiveCentering(
  hm: string | null | undefined,
  cell?: CellMetricHint | null,
): LatticeCentering {
  const c = centeringFromHm(hm)
  if (c !== 'R') return c
  if (isRhombohedralSetting(hm)) return 'P'
  // Hexagonal setting markers → keep R
  if (hm && (/\bHS\b/i.test(hm) || /:\s*H\b/i.test(hm) || /HEXAG/i.test(hm))) {
    return 'R'
  }
  if (cell && cellLooksRhombohedral(cell)) return 'P'
  return 'R'
}

/** True if (hkl) is allowed by lattice centering (not extinct). */
export function isAllowedByCentering(
  centering: LatticeCentering,
  h: number,
  k: number,
  l: number,
): boolean {
  const hh = Math.round(h)
  const kk = Math.round(k)
  const ll = Math.round(l)
  switch (centering) {
    case 'P':
      return true
    case 'A':
      return (kk + ll) % 2 === 0
    case 'B':
      return (hh + ll) % 2 === 0
    case 'C':
      return (hh + kk) % 2 === 0
    case 'I':
      return (hh + kk + ll) % 2 === 0
    case 'F':
      return (
        (hh % 2 === 0 && kk % 2 === 0 && ll % 2 === 0) ||
        (hh % 2 !== 0 && kk % 2 !== 0 && ll % 2 !== 0)
      )
    case 'R':
      // Hexagonal axes setting of rhombohedral: −h + k + l = 3n
      return (((-hh + kk + ll) % 3) + 3) % 3 === 0
    default:
      return true
  }
}

/**
 * Smallest positive integer n such that (nh, nk, nl) is allowed.
 * Caps at maxN (default 12); returns null if none found.
 */
export function harkerOrder(
  centering: LatticeCentering,
  h: number,
  k: number,
  l: number,
  maxN = 12,
): number | null {
  if (h === 0 && k === 0 && l === 0) return null
  for (let n = 1; n <= maxN; n++) {
    if (isAllowedByCentering(centering, n * h, n * k, n * l)) return n
  }
  return null
}
