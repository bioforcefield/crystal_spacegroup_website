import type { GeneralPoint, Vec3 } from './types'

/** Space groups (ITA number) where the 3D view offers a cell-multiples (supercell) input. */
export const SUPERCELL_ALLOWLIST: ReadonlySet<number> = new Set([5])
export const SUPERCELL_MAX = 5

export type CellMultiples = [number, number, number]
export const DEFAULT_MULTIPLES: CellMultiples = [1, 1, 1]

export function supercellEnabled(sgNumber: number): boolean {
  return SUPERCELL_ALLOWLIST.has(sgNumber)
}

export function clampMultiple(n: number): number {
  if (!Number.isFinite(n)) return 1
  return Math.min(SUPERCELL_MAX, Math.max(1, Math.round(n)))
}

export type ParseResult =
  | { ok: true; value: CellMultiples; clamped: boolean }
  | { ok: false; error: string }

/** Parse "1,1,3", "1x1x3", "1×1×3", "1 1 3" (empty → 1×1×1). Values clamped to 1..SUPERCELL_MAX. */
export function parseCellMultiples(input: string): ParseResult {
  const s = input.trim()
  if (s === '') return { ok: true, value: [1, 1, 1], clamped: false }
  const parts = s.split(/\s*[,x×X*\s]\s*/).filter((p) => p !== '')
  if (parts.length !== 3 || !parts.every((p) => /^\d+$/.test(p))) {
    return {
      ok: false,
      error: 'Enter three whole numbers, e.g. 1x1x3 or 1,1,3.',
    }
  }
  let clamped = false
  const v = parts.map((p) => {
    const n = parseInt(p, 10)
    const c = Math.min(SUPERCELL_MAX, Math.max(1, n))
    if (c !== n) clamped = true
    return c
  }) as CellMultiples
  return { ok: true, value: v, clamped }
}

export function isDefaultMultiples(m: CellMultiples): boolean {
  return m[0] === 1 && m[1] === 1 && m[2] === 1
}

/** Integer lattice translations [0..na)×[0..nb)×[0..nc), origin first. */
export function supercellTranslations(m: CellMultiples): Vec3[] {
  const out: Vec3[] = []
  for (let i = 0; i < m[0]; i++)
    for (let j = 0; j < m[1]; j++)
      for (let k = 0; k < m[2]; k++) out.push([i, j, k])
  return out
}

/**
 * Replicate points by lattice translations (centering is already in the
 * operator list, so Z includes it). `toCart` maps a fractional *vector*.
 */
export function replicatePoints(
  points: GeneralPoint[],
  m: CellMultiples,
  toCart: (f: Vec3) => Vec3,
): { point: GeneralPoint; t: Vec3 }[] {
  const out: { point: GeneralPoint; t: Vec3 }[] = []
  for (const t of supercellTranslations(m)) {
    const d = toCart(t)
    for (const p of points) {
      out.push({
        t,
        point: {
          ...p,
          fractional: [p.fractional[0] + t[0], p.fractional[1] + t[1], p.fractional[2] + t[2]],
          cartesian: [p.cartesian[0] + d[0], p.cartesian[1] + d[1], p.cartesian[2] + d[2]],
        },
      })
    }
  }
  return out
}
