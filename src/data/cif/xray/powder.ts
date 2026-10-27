/**
 * Client-side teaching PXRD: Bragg sticks from cell + fractional sites.
 * Intensities use a simple structure-factor model + LP; not Rietveld-grade.
 */

import { dHkl } from '../../morphology/dHkl'
import { reflectionGate, type ExtinctionMode } from '../../morphology/extinctions'
import type { CellParams, Operator } from '../../types'
import type { CifAtomSite, ExpandedStructure } from '../types'
import { formFactor } from './formFactors'
import { lorentzPolarization, twoThetaDeg } from './bragg'

export interface PowderSite {
  element: string
  fractional: [number, number, number]
  occupancy: number
}

export interface PowderPeak {
  h: number
  k: number
  l: number
  /** Miller label, e.g. "1 0 −1" or "10 0 0" when |index|≥10. */
  hkl: string
  d: number
  twoTheta: number
  /** Relative intensity 0–100 after LP + merge. */
  intensity: number
  /** Structure-factor |F|² before LP (arbitrary units). */
  f2: number
  multiplicity: number
}

export interface PowderPattern {
  peaks: PowderPeak[]
  wavelengthA: number
  centering: import('../../morphology/centering').LatticeCentering
  extinctionMode: ExtinctionMode
  siteCount: number
  maxH: number
  warnings: string[]
  truncated: boolean
}

export interface ComputePowderOptions {
  wavelengthA?: number
  twoThetaMin?: number
  twoThetaMax?: number
  /** Max |h|,|k|,|l| index (auto-capped). */
  maxH?: number
  /** Merge window in degrees 2θ. */
  mergeTolDeg?: number
  /** Symmetry operators for screw/glide conditions (optional). */
  operators?: readonly Operator[] | null
}

const MAX_SITES = 1200
const MAX_REFLECTIONS = 8000

/** Safe Miller label — spaces; works for |h|≥10. */
export function formatHkl(h: number, k: number, l: number): string {
  const f = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n))
  return `${f(h)} ${f(k)} ${f(l)}`
}

/** Unique wrapped sites from the expanded cell (preferred). */
export function sitesFromExpanded(structure: ExpandedStructure): PowderSite[] {
  const out: PowderSite[] = []
  for (const a of structure.atoms) {
    const occ =
      a.occupancy ??
      structure.asymmetric[a.auIndex]?.occupancy ??
      1
    out.push({
      element: a.element,
      fractional: [a.fractional[0], a.fractional[1], a.fractional[2]],
      occupancy: occ > 0 && occ <= 1.5 ? occ : 1,
    })
  }
  return out
}

/** Fallback: asymmetric unit only (underestimates multiplicity of F). */
export function sitesFromAsymmetric(atoms: CifAtomSite[]): PowderSite[] {
  return atoms.map((a) => ({
    element: a.element,
    fractional: [a.fractional[0], a.fractional[1], a.fractional[2]],
    occupancy: a.occupancy && a.occupancy > 0 ? a.occupancy : 1,
  }))
}

function pickMaxH(cell: CellParams, wavelengthA: number, twoThetaMax: number, siteCount: number): number {
  const tmax = Math.min(89, twoThetaMax / 2)
  const sin = Math.sin((tmax * Math.PI) / 180)
  const dMin = sin > 1e-6 ? wavelengthA / (2 * sin) : wavelengthA / 2
  const extents = [cell.a, cell.b, cell.c]
  let h = Math.ceil(Math.max(...extents) / Math.max(dMin, 0.4)) + 1
  h = Math.min(12, Math.max(3, h))
  if (siteCount > 600) h = Math.min(h, 6)
  if (siteCount > 900) h = Math.min(h, 5)
  return h
}

function structureFactor2(
  sites: PowderSite[],
  h: number,
  k: number,
  l: number,
  d: number,
): number {
  const s = 1 / (2 * d)
  let re = 0
  let im = 0
  const twoPi = 2 * Math.PI
  for (const site of sites) {
    const f = formFactor(site.element, s) * site.occupancy
    const phase = twoPi * (h * site.fractional[0] + k * site.fractional[1] + l * site.fractional[2])
    re += f * Math.cos(phase)
    im += f * Math.sin(phase)
  }
  return re * re + im * im
}

function indexSum(h: number, k: number, l: number): number {
  return Math.abs(h) + Math.abs(k) + Math.abs(l)
}

/**
 * Compute a relative powder pattern for teaching.
 * Uses full-cell sites when provided so lattice extinctions emerge from F≈0;
 * also skips centering / operator-forbidden indices for speed when known.
 */
export function computePowderPattern(
  cell: CellParams,
  sites: PowderSite[],
  hmName: string | null | undefined,
  opts: ComputePowderOptions = {},
): PowderPattern {
  const wavelengthA = opts.wavelengthA ?? 1.5406
  const twoThetaMin = opts.twoThetaMin ?? 5
  const twoThetaMax = opts.twoThetaMax ?? 60
  const mergeTol = opts.mergeTolDeg ?? 0.08
  const warnings: string[] = []
  let truncated = false

  let used = sites
  if (sites.length > MAX_SITES) {
    used = sites.slice(0, MAX_SITES)
    truncated = true
    warnings.push(
      `Large cell (${sites.length} sites) — using first ${MAX_SITES} for speed; intensities are schematic.`,
    )
  }
  if (sites.length === 0) {
    return {
      peaks: [],
      wavelengthA,
      centering: 'P',
      extinctionMode: 'centering-only',
      siteCount: 0,
      maxH: 0,
      warnings: ['No atomic sites — cannot simulate a powder pattern.'],
      truncated: false,
    }
  }

  const gate = reflectionGate(hmName, cell, opts.operators)
  if (gate.mode === 'centering-only') {
    warnings.push(
      'Screw/glide extinctions: centering-only (no operator list) — conditions beyond lattice centering are not enforced here.',
    )
  }
  const maxH = opts.maxH ?? pickMaxH(cell, wavelengthA, twoThetaMax, used.length)

  type Raw = {
    h: number
    k: number
    l: number
    d: number
    twoTheta: number
    f2: number
    I: number
  }
  const raw: Raw[] = []
  let counted = 0

  for (let h = -maxH; h <= maxH; h++) {
    for (let k = -maxH; k <= maxH; k++) {
      for (let l = -maxH; l <= maxH; l++) {
        if (h === 0 && k === 0 && l === 0) continue
        if (!gate.allowed(h, k, l)) continue
        counted++
        if (counted > MAX_REFLECTIONS) {
          truncated = true
          warnings.push('hkl enumeration capped — raise 2θ max carefully on large cells.')
          break
        }
        const d = dHkl(cell, h, k, l)
        if (!Number.isFinite(d) || d <= 0) continue
        const tt = twoThetaDeg(d, wavelengthA)
        if (tt == null || tt < twoThetaMin || tt > twoThetaMax) continue
        const f2 = structureFactor2(used, h, k, l, d)
        if (f2 < 1e-6) continue
        const lp = lorentzPolarization(tt)
        const I = f2 * lp
        if (I < 1e-8) continue
        raw.push({ h, k, l, d, twoTheta: tt, f2, I })
      }
      if (truncated && counted > MAX_REFLECTIONS) break
    }
    if (truncated && counted > MAX_REFLECTIONS) break
  }

  raw.sort((a, b) => a.twoTheta - b.twoTheta)

  // Merge nearby 2θ into powder lines; keep strongest contributor's hkl as label,
  // tie-break toward lower |h|+|k|+|l|.
  const merged: PowderPeak[] = []
  for (const r of raw) {
    const last = merged[merged.length - 1]
    if (last && Math.abs(last.twoTheta - r.twoTheta) <= mergeTol) {
      const prevI = last.intensity
      const wI = prevI + r.I
      const wD = (last.d * prevI + r.d * r.I) / (wI || 1)
      const wT = (last.twoTheta * prevI + r.twoTheta * r.I) / (wI || 1)
      const preferNewLabel =
        r.I > prevI + 1e-12 ||
        (Math.abs(r.I - prevI) <= 1e-12 &&
          indexSum(r.h, r.k, r.l) < indexSum(last.h, last.k, last.l))
      if (preferNewLabel) {
        last.h = r.h
        last.k = r.k
        last.l = r.l
        last.hkl = formatHkl(r.h, r.k, r.l)
      }
      last.intensity = wI
      last.f2 += r.f2
      last.multiplicity += 1
      last.d = wD
      last.twoTheta = wT
    } else {
      merged.push({
        h: r.h,
        k: r.k,
        l: r.l,
        hkl: formatHkl(r.h, r.k, r.l),
        d: r.d,
        twoTheta: r.twoTheta,
        intensity: r.I,
        f2: r.f2,
        multiplicity: 1,
      })
    }
  }

  const maxI = Math.max(...merged.map((p) => p.intensity), 0)
  if (maxI > 0) {
    for (const p of merged) p.intensity = (p.intensity / maxI) * 100
  }

  const peaks = merged.filter((p) => p.intensity >= 0.15)
  peaks.sort((a, b) => a.twoTheta - b.twoTheta)

  if (peaks.length === 0) {
    warnings.push('No peaks in the selected 2θ window — try a wider range or check the cell.')
  }

  return {
    peaks,
    wavelengthA,
    centering: gate.centering,
    extinctionMode: gate.mode,
    siteCount: used.length,
    maxH,
    warnings,
    truncated,
  }
}

export function computePowderFromStructure(
  structure: ExpandedStructure,
  opts: ComputePowderOptions = {},
): PowderPattern {
  const sites = sitesFromExpanded(structure)
  return computePowderPattern(
    structure.cell,
    sites,
    structure.spaceGroupName,
    {
      ...opts,
      operators: opts.operators ?? structure.operators,
    },
  )
}
