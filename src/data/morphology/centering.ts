/**
 * Lattice centering + Donnay–Harker reflection conditions (lattice only).
 * Screw/glide extinctions beyond centering are not fully modelled.
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
      return ((-hh + kk + ll) % 3 + 3) % 3 === 0
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
