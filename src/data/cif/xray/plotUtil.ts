/** Pure helpers for the PXRD plot (display only; no physics). */
export function niceTicks(lo: number, hi: number, target = 6): number[] {
  const span = Math.max(1e-9, hi - lo)
  const raw = span / Math.max(1, target)
  const p = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? 10 * p
  const out: number[] = []
  for (let t = Math.ceil(lo / step - 1e-9) * step; t <= hi + 1e-9; t += step) out.push(+t.toFixed(6))
  return out
}
export interface LabelPeak { twoTheta: number; intensity: number; hkl: string }
/**
 * Pick up to `max` strongest peaks in [lo, hi] and place labels without overlap.
 * x/y are in plot px; labels are stacked upward when they would collide (greedy, strongest first).
 */
export function placePeakLabels<T extends LabelPeak>(
  peaks: T[], lo: number, hi: number, max: number,
  toX: (t: number) => number, toY: (i: number) => number, charW: number, lineH: number, minIntensity = 2,
): { peak: T; x: number; y: number; anchorY: number }[] {
  const cands = peaks.filter((p) => p.twoTheta >= lo && p.twoTheta <= hi && p.intensity >= minIntensity)
    .sort((a, b) => b.intensity - a.intensity).slice(0, max)
  const placed: { peak: T; x: number; y: number; anchorY: number; w: number }[] = []
  for (const p of cands) {
    const x = toX(p.twoTheta), anchorY = toY(p.intensity)
    const w = (p.hkl.length + 2) * charW
    let y = anchorY - 4
    for (let k = 0; k < 8; k++) {
      const hit = placed.find((q) => Math.abs(q.x - x) < (q.w + w) / 2 + 2 && Math.abs(q.y - y) < lineH)
      if (!hit) break
      y = hit.y - lineH
    }
    if (y < lineH) continue // no room: skip rather than overlap
    placed.push({ peak: p, x, y, anchorY, w })
  }
  return placed.map(({ peak, x, y, anchorY }) => ({ peak, x, y, anchorY }))
}
export function peaksCsv(rows: { form: string; peaks: { hkl: string; d: number; twoTheta: number; intensity: number; multiplicity: number }[] }[], wavelengthA: number): string {
  const lines = [`# Simulated PXRD peaks, wavelength ${wavelengthA.toFixed(5)} Å (crystalspacegroups.com)`, 'form,hkl,d_A,two_theta_deg,I_rel,multiplicity']
  for (const r of rows) for (const p of r.peaks) lines.push(`${r.form},"${p.hkl}",${p.d.toFixed(4)},${p.twoTheta.toFixed(3)},${p.intensity.toFixed(2)},${p.multiplicity}`)
  return lines.join('\n') + '\n'
}
