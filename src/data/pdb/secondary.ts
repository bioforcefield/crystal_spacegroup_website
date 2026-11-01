/** Secondary structure per Cα: deposited ranges, else a Cα-geometry "DSSP-lite". */
import type { Vec3 } from '../types'
import type { PdbAtomExtra, SsRange } from './mmcif'

export type SsCode = 'H' | 'E' | 'C'

const d = (p: Vec3, q: Vec3) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])

/** Cα-only heuristic: helix if i→i+3 ≈ 5–5.6 Å over a run; strand if extended with a non-local partner. */
export function dsspLite(ca: Vec3[], breaks: boolean[]): SsCode[] {
  const n = ca.length
  const out: SsCode[] = new Array(n).fill('C')
  const ok = (i: number, j: number) => { for (let k = i + 1; k <= j; k++) if (breaks[k]) return false; return true }
  const hel = new Array(n).fill(false)
  for (let i = 0; i + 3 < n; i++) {
    if (!ok(i, i + 3)) continue
    const d3 = d(ca[i]!, ca[i + 3]!), d2 = d(ca[i]!, ca[i + 2]!)
    if (d3 > 4.6 && d3 < 5.8 && d2 > 5.0 && d2 < 6.0) hel[i] = true
  }
  for (let i = 0; i < n; i++) {
    if (hel[i] && hel[i + 1]) for (let k = i; k <= Math.min(n - 1, i + 4); k++) out[k] = 'H'
  }
  // trim lone helices < 4
  for (let i = 0; i < n; ) {
    if (out[i] !== 'H') { i++; continue }
    let j = i; while (j < n && out[j] === 'H') j++
    if (j - i < 4) for (let k = i; k < j; k++) out[k] = 'C'
    i = j
  }
  for (let i = 1; i + 1 < n; i++) {
    if (out[i] === 'H' || !ok(i - 1, i + 1)) continue
    if (d(ca[i - 1]!, ca[i + 1]!) < 6.2) continue
    let partner = false
    for (let j = 0; j < n && !partner; j++) {
      if (Math.abs(j - i) < 4) continue
      const dd = d(ca[i]!, ca[j]!)
      if (dd > 4.2 && dd < 5.6 && j > 0 && j + 1 < n && d(ca[j - 1]!, ca[j + 1]!) > 6.2) partner = true
    }
    if (partner) out[i] = 'E'
  }
  // drop isolated strand residues
  for (let i = 0; i < n; i++) if (out[i] === 'E' && out[i - 1] !== 'E' && out[i + 1] !== 'E') out[i] = 'C'
  return out
}

export function assignSecondary(extras: PdbAtomExtra[], cart: Vec3[], ranges: SsRange[]): SsCode[] {
  const out: SsCode[] = extras.map(() => 'C')
  if (ranges.length) {
    extras.forEach((e, i) => {
      if (!e.ca) return
      const s = parseInt(e.seq, 10)
      for (const r of ranges) {
        if (r.chain === e.chain && s >= r.from && s <= r.to) { out[i] = r.kind === 'helix' ? 'H' : 'E'; break }
      }
    })
    return out
  }
  const byChain = new Map<string, number[]>()
  extras.forEach((e, i) => { if (e.ca) { const l = byChain.get(e.chain) ?? []; l.push(i); byChain.set(e.chain, l) } })
  for (const idx of byChain.values()) {
    const ca = idx.map((i) => cart[i]!)
    const breaks = ca.map((p, k) => k > 0 && d(p, ca[k - 1]!) > 4.3)
    const ss = dsspLite(ca, breaks)
    idx.forEach((i, k) => { out[i] = ss[k]! })
  }
  return out
}
