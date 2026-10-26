/** Parse ITA general-position triplet strings into Seitz (R|t). */

import type { Mat3, Vec3 } from '../types'

const FRAC_MAP: Record<string, number> = {
  '½': 0.5,
  '¼': 0.25,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
}

/** Normalize Unicode minus / en-dash and strip spaces. */
export function normalizeTripletText(s: string): string {
  return s
    .replace(/[\u2212\u2013\u2014]/g, '-')
    .replace(/\s+/g, '')
}

function parseNumberToken(tok: string): number | null {
  if (tok in FRAC_MAP) return FRAC_MAP[tok]!
  const slash = tok.match(/^(\d+)\/(\d+)$/)
  if (slash) {
    const n = Number(slash[1])
    const d = Number(slash[2])
    if (d === 0) throw new Error(`bad fraction ${tok}`)
    return n / d
  }
  if (/^\d*\.?\d+$/.test(tok)) return Number(tok)
  return null
}

/**
 * Parse one coordinate expression (e.g. `-x+1/2`, `y+½`, `-z`).
 * Returns coefficients of x,y,z and a constant translation term.
 */
export function parseCoordExpr(expr: string): {
  coeffs: Vec3
  constTerm: number
} {
  const s = normalizeTripletText(expr)
  if (!s) throw new Error('empty coordinate expression')

  const coeffs: Vec3 = [0, 0, 0]
  let constTerm = 0

  // Split into signed terms: optional leading sign, then rest until next ±
  const terms = s.match(/[+-]?[^+-]+/g)
  if (!terms) throw new Error(`cannot parse coordinate: ${expr}`)

  for (let raw of terms) {
    let sign = 1
    if (raw.startsWith('+')) raw = raw.slice(1)
    else if (raw.startsWith('-')) {
      sign = -1
      raw = raw.slice(1)
    }
    if (!raw) continue

    const varMatch = raw.match(/^([xyz])(.*)$/i)
    if (varMatch) {
      const axis = varMatch[1]!.toLowerCase()
      const rest = varMatch[2] ?? ''
      const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
      let scale = 1
      if (rest) {
        // unusual forms like x*1/2 — not expected; reject trailing junk after var
        // unless empty (standard ITA has var alone in the term)
        throw new Error(`unexpected trailing "${rest}" after ${axis} in ${expr}`)
      }
      coeffs[idx] += sign * scale
      continue
    }

    const n = parseNumberToken(raw)
    if (n === null) throw new Error(`bad term "${raw}" in ${expr}`)
    constTerm += sign * n
  }

  return { coeffs, constTerm }
}

/** Parse full triplet `−x, y+½, −z+½` → { R, t }. */
export function parseTriplet(triplet: string): { R: Mat3; t: Vec3 } {
  const normalized = normalizeTripletText(triplet)
  const parts = normalized.split(',')
  if (parts.length !== 3) {
    throw new Error(`expected 3 components, got ${parts.length}: ${triplet}`)
  }

  const R: Mat3 = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ]
  const t: Vec3 = [0, 0, 0]

  for (let row = 0; row < 3; row++) {
    const { coeffs, constTerm } = parseCoordExpr(parts[row]!)
    R[row] = coeffs
    t[row] = constTerm
  }

  return { R, t }
}
