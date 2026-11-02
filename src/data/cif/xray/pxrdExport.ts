/** Publication-style standalone SVG of a simulated PXRD pattern (export only; no UI chrome). */
import { envelopePolyline, lorentzEnvelope } from './envelope'
import { niceTicks, placePeakLabels } from './plotUtil'
import type { PowderPattern } from './powder'

export interface PxrdExportOpts {
  patternA: PowderPattern
  patternB?: PowderPattern | null
  labelA: string
  labelB?: string
  lo: number
  hi: number
  fwhm: number
  wavelengthA: number
  /** Label (hkl) only peaks with I ≥ threshold (% of max). */
  threshold?: number
  background: 'white' | 'dark'
  title?: string
}
/** Default (hkl) label threshold, % of max (inline, enlarged and export). */
export const PXRD_LABEL_THRESHOLD_DEFAULT = 50
export const EXPORT_SIZE = { w: 1200, h: 720 }
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function pxrdExportSvg(opts: PxrdExportOpts): string {
  const o = { ...opts, threshold: opts.threshold ?? PXRD_LABEL_THRESHOLD_DEFAULT }
  const { w, h } = EXPORT_SIZE
  const white = o.background === 'white'
  const ink = white ? '#111827' : '#e5e7eb', grid = white ? '#e5e7eb' : '#334155'
  const colA = white ? '#1d4ed8' : '#7dd3fc', colB = white ? '#c2410c' : '#fdba74'
  const F = 22
  const B = { x0: 100, y0: 96, x1: w - 40, y1: h - 90 }
  const dx = o.hi - o.lo || 1
  const X = (t: number) => B.x0 + ((t - o.lo) / dx) * (B.x1 - B.x0)
  const Y = (i: number) => B.y1 - (i / 105) * (B.y1 - B.y0)
  const poly = (p: PowderPattern) => {
    const e = lorentzEnvelope(p.peaks.map((q) => ({ twoTheta: q.twoTheta, intensity: q.intensity })), o.lo, o.hi, o.fwhm, 1600)
    return e.x.length ? envelopePolyline(e.x, e.y, B, { xmin: o.lo, xmax: o.hi, ymin: 0, ymax: 105 }) : ''
  }
  const out: string[] = []
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="Helvetica, Arial, sans-serif">`)
  out.push(`<rect width="${w}" height="${h}" fill="${white ? '#ffffff' : '#0b1220'}"/>`)
  const title = o.title ?? `Simulated PXRD — ${o.labelA}${o.patternB ? ` vs ${o.labelB ?? 'B'}` : ''}`
  out.push(`<text x="${B.x0}" y="40" font-size="${F + 4}" font-weight="700" fill="${ink}">${esc(title)}</text>`)
  out.push(`<text x="${B.x0}" y="72" font-size="${F - 4}" fill="${ink}">λ = ${o.wavelengthA.toFixed(4)} Å · FWHM ${o.fwhm.toFixed(2)}° · (hkl) labels for I ≥ ${Math.round(o.threshold)}% of max</text>`)
  for (const t of niceTicks(o.lo, o.hi, 10)) {
    out.push(`<line x1="${X(t)}" x2="${X(t)}" y1="${B.y0}" y2="${B.y1}" stroke="${grid}" stroke-width="1"/>`)
    out.push(`<line x1="${X(t)}" x2="${X(t)}" y1="${B.y1}" y2="${B.y1 + 8}" stroke="${ink}" stroke-width="2"/>`)
    out.push(`<text x="${X(t)}" y="${B.y1 + 8 + F}" font-size="${F - 2}" text-anchor="middle" fill="${ink}">${Number.isInteger(t) ? t : t.toFixed(1)}</text>`)
  }
  for (const v of [0, 25, 50, 75, 100]) {
    out.push(`<line x1="${B.x0}" x2="${B.x1}" y1="${Y(v)}" y2="${Y(v)}" stroke="${grid}" stroke-width="1"/>`)
    out.push(`<text x="${B.x0 - 12}" y="${Y(v) + 7}" font-size="${F - 2}" text-anchor="end" fill="${ink}">${v}</text>`)
  }
  out.push(`<rect x="${B.x0}" y="${B.y0}" width="${B.x1 - B.x0}" height="${B.y1 - B.y0}" fill="none" stroke="${ink}" stroke-width="2"/>`)
  out.push(`<text x="${(B.x0 + B.x1) / 2}" y="${h - 22}" font-size="${F}" text-anchor="middle" fill="${ink}">2θ (°)</text>`)
  out.push(`<text x="30" y="${(B.y0 + B.y1) / 2}" font-size="${F}" text-anchor="middle" fill="${ink}" transform="rotate(-90 30 ${(B.y0 + B.y1) / 2})">Intensity (a.u.)</text>`)
  out.push(`<line x1="${B.x0}" x2="${B.x1}" y1="${Y(o.threshold)}" y2="${Y(o.threshold)}" stroke="${ink}" stroke-opacity="0.35" stroke-width="1.5" stroke-dasharray="8 6"/>`)
  if (o.patternB) { const pb = poly(o.patternB); if (pb) out.push(`<polyline points="${pb}" fill="none" stroke="${colB}" stroke-width="2.5"/>`) }
  const pa = poly(o.patternA)
  if (pa) out.push(`<polyline points="${pa}" fill="none" stroke="${colA}" stroke-width="3"/>`)
  for (const l of placePeakLabels(o.patternA.peaks, o.lo, o.hi, 60, X, Y, (F - 4) * 0.55, F - 2, o.threshold)) {
    if (l.anchorY - l.y > 10) out.push(`<line x1="${l.x}" x2="${l.x}" y1="${l.y + 3}" y2="${l.anchorY - 4}" stroke="${ink}" stroke-opacity="0.5" stroke-width="1"/>`)
    out.push(`<text x="${l.x}" y="${l.y}" font-size="${F - 4}" text-anchor="middle" fill="${ink}">(${esc(l.peak.hkl)})</text>`)
  }
  if (o.patternB) {
    out.push(`<line x1="${B.x1 - 260}" x2="${B.x1 - 230}" y1="${B.y0 + 24}" y2="${B.y0 + 24}" stroke="${colA}" stroke-width="3"/><text x="${B.x1 - 222}" y="${B.y0 + 30}" font-size="${F - 4}" fill="${ink}">A · ${esc(o.labelA)}</text>`)
    out.push(`<line x1="${B.x1 - 260}" x2="${B.x1 - 230}" y1="${B.y0 + 52}" y2="${B.y0 + 52}" stroke="${colB}" stroke-width="2.5"/><text x="${B.x1 - 222}" y="${B.y0 + 58}" font-size="${F - 4}" fill="${ink}">B · ${esc(o.labelB ?? 'B')}</text>`)
  }
  out.push('</svg>')
  return out.join('')
}
