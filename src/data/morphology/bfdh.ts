/**
 * Bravais–Friedel–Donnay–Harker (BFDH) morphological ranking.
 * Geometric heuristic: morphological importance ∝ d_DH; relative growth R ∝ 1/d_DH.
 * Not attachment-energy or kinetic morphology.
 */

import type { CellParams } from '../types'
import {
  centeringFromHm,
  effectiveCentering,
  harkerOrder,
  type LatticeCentering,
} from './centering'
import { dHkl, planeNormalAb } from './dHkl'
import type { FaceSpec } from './wulff2d'

export type BfdhFace = {
  /** Canonical form label, e.g. "{100}" */
  form: string
  h: number
  k: number
  l: number
  /** Smallest n with (nh nk nl) allowed */
  harkerN: number
  /** d of the Harker-corrected index (Å) */
  dDh: number
  /** Raw d_hkl before Harker multiply (Å) */
  dRaw: number
  /** Relative growth rate ∝ 1/d_DH (normalized so max among top set ≈ 1) */
  relativeR: number
  centering: LatticeCentering
}

export type BfdhResult = {
  centering: LatticeCentering
  faces: BfdhFace[]
  /** 2D Wulff face specs from ab-plane (hk0) slice of the ranking */
  faces2d: FaceSpec[]
  note: string
}

function gcd2(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y) {
    const t = y
    y = x % y
    x = t
  }
  return x || 1
}

function gcd3(a: number, b: number, c: number): number {
  return gcd2(gcd2(a, b), c)
}

/** Reduce (hkl) by gcd and flip so first non-zero index is ≥ 0. */
export function canonicalHkl(
  h: number,
  k: number,
  l: number,
): [number, number, number] {
  let hh = Math.round(h)
  let kk = Math.round(k)
  let ll = Math.round(l)
  const g = gcd3(hh, kk, ll)
  hh /= g
  kk /= g
  ll /= g
  if (hh < 0 || (hh === 0 && kk < 0) || (hh === 0 && kk === 0 && ll < 0)) {
    hh = -hh
    kk = -kk
    ll = -ll
  }
  return [hh, kk, ll]
}

export function formLabel(h: number, k: number, l: number): string {
  const [hh, kk, ll] = canonicalHkl(h, k, l)
  return `{${hh}${kk}${ll}}`
}

export type RankBfdhOptions = {
  /** Max |h|,|k|,|l| to enumerate (default 2) */
  maxIndex?: number
  /** How many unique forms to keep (default 12) */
  topN?: number
  hm?: string | null
  centering?: LatticeCentering
}

/**
 * Rank unique {hkl} forms by decreasing Donnay–Harker d-spacing.
 */
export function rankBfdh(
  cell: CellParams,
  opts: RankBfdhOptions = {},
): BfdhResult {
  const maxIndex = opts.maxIndex ?? 2
  const topN = opts.topN ?? 12
  const centering =
    opts.centering ??
    effectiveCentering(opts.hm ?? null, cell)

  type Raw = {
    h: number
    k: number
    l: number
    form: string
    harkerN: number
    dDh: number
    dRaw: number
  }
  const best = new Map<string, Raw>()

  for (let h = -maxIndex; h <= maxIndex; h++) {
    for (let k = -maxIndex; k <= maxIndex; k++) {
      for (let l = -maxIndex; l <= maxIndex; l++) {
        if (h === 0 && k === 0 && l === 0) continue
        const [ch, ck, cl] = canonicalHkl(h, k, l)
        const form = formLabel(ch, ck, cl)
        const n = harkerOrder(centering, ch, ck, cl)
        if (n == null) continue
        const dRaw = dHkl(cell, ch, ck, cl)
        const dDh = dHkl(cell, n * ch, n * ck, n * cl)
        if (!Number.isFinite(dDh) || dDh <= 0) continue
        const prev = best.get(form)
        if (!prev || dDh > prev.dDh + 1e-9) {
          best.set(form, {
            h: ch,
            k: ck,
            l: cl,
            form,
            harkerN: n,
            dDh,
            dRaw,
          })
        }
      }
    }
  }

  const sorted = [...best.values()].sort((a, b) => b.dDh - a.dDh)
  const top = sorted.slice(0, topN)
  const dMax = top[0]?.dDh ?? 1
  const faces: BfdhFace[] = top.map((f) => ({
    ...f,
    relativeR: dMax / f.dDh,
    centering,
  }))

  const faces2d = bfdhFaces2D(cell, faces)

  const rawCentering = centeringFromHm(opts.hm ?? null)
  const note =
    rawCentering === 'R' && centering === 'P'
      ? 'BFDH on rhombohedral axes (R setting treated as primitive — no hexagonal −h+k+l=3n filter). Geometric heuristic only.'
      : centering === 'P'
        ? 'BFDH ranks faces by d_hkl (primitive lattice — no Harker multiply). Geometric heuristic only.'
        : `BFDH with ${centering}-centering Harker correction (lowest allowed multiple). Geometric heuristic — not attachment energy.`

  return { centering, faces, faces2d, note }
}

/**
 * Build a 2D Wulff face set from BFDH ranks using the ab-plane (hk0) slice,
 * falling back to ab-projections of general faces when few hk0 forms exist.
 */
export function bfdhFaces2D(
  cell: CellParams,
  ranked: BfdhFace[],
): FaceSpec[] {
  const hk0 = ranked.filter((f) => f.l === 0)
  const source =
    hk0.length >= 2
      ? hk0
      : ranked.filter((f) => !(f.h === 0 && f.k === 0))

  const out: FaceSpec[] = []
  const seen = new Set<string>()

  for (const f of source.slice(0, 8)) {
    const h = f.h
    const k = f.k
    // Sign variants in the ab plane for a closed outline
    const variants: [number, number][] = [
      [h, k],
      [-h, -k],
    ]
    if (h !== 0 && k !== 0) {
      variants.push([h, -k], [-h, k])
    } else if (h === 0 && k !== 0) {
      variants.push([0, -k])
    } else if (k === 0 && h !== 0) {
      variants.push([-h, 0])
    }

    for (const [hh, kk] of variants) {
      if (hh === 0 && kk === 0) continue
      const key = `${hh},${kk}`
      if (seen.has(key)) continue
      seen.add(key)
      const n = planeNormalAb(cell, hh, kk)
      out.push({
        label: f.form,
        nx: n.nx,
        ny: n.ny,
        rate: f.relativeR,
      })
    }
  }

  // Need ≥3 half-planes; pad with weak diagonals if sparse
  if (out.length < 3) {
    const s = Math.SQRT1_2
    const padR = (ranked[0]?.relativeR ?? 1) * 1.4
    out.push(
      { label: '{100}', nx: 1, ny: 0, rate: padR },
      { label: '{100}', nx: -1, ny: 0, rate: padR },
      { label: '{010}', nx: 0, ny: 1, rate: padR },
      { label: '{010}', nx: 0, ny: -1, rate: padR },
      { label: '{110}', nx: s, ny: s, rate: padR * 1.2 },
      { label: '{110}', nx: -s, ny: s, rate: padR * 1.2 },
      { label: '{110}', nx: s, ny: -s, rate: padR * 1.2 },
      { label: '{110}', nx: -s, ny: -s, rate: padR * 1.2 },
    )
  }

  return out
}

/** Unique form labels in order of first appearance, with their shared rate. */
export function uniqueFormRates(
  faces: FaceSpec[],
): { form: string; rate: number }[] {
  const out: { form: string; rate: number }[] = []
  const seen = new Set<string>()
  for (const f of faces) {
    if (seen.has(f.label)) continue
    seen.add(f.label)
    out.push({ form: f.label, rate: f.rate })
  }
  return out
}

/**
 * Rebuild face specs with per-form rate overrides and optional form enable flags.
 * Disabled forms are dropped; rates ≤ 0 fall back to a tiny epsilon so the
 * half-plane math stays defined when a slider is dragged to the floor.
 */
export function applyFormRates(
  faces: FaceSpec[],
  ratesByForm: Record<string, number>,
  enabledByForm?: Record<string, boolean>,
): FaceSpec[] {
  const out: FaceSpec[] = []
  for (const f of faces) {
    if (enabledByForm && enabledByForm[f.label] === false) continue
    const r = ratesByForm[f.label]
    const rate = Number.isFinite(r) && (r as number) > 0 ? (r as number) : f.rate
    out.push({ ...f, rate: Math.max(rate, 1e-6) })
  }
  return out
}
