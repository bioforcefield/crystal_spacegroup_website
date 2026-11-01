/** Sequence comparison across loaded structures + sequence-based Cα superposition. */
import type { Vec3 } from '../types'
import { alignMultiple, conservation, identityOf } from './align'
import { kabsch, applySuperposition, type Superposition } from './kabsch'
import type { ChainSequence, SeqResidue } from './sequence'

export interface ChainAlignment {
  /** One row per input chain; null = gap. */
  rows: (SeqResidue | null)[][]
  strings: string[]
  /** Identity of each row vs row 0 (active), over the shorter sequence. */
  identity: number[]
  conservation: number[]
}

export function alignChains(chains: ChainSequence[]): ChainAlignment {
  const kind = chains[0]?.kind ?? 'protein'
  const seqs = chains.map((c) => c.residues.map((r) => r.code).join(''))
  const { rows: strings } = alignMultiple(seqs, { kind })
  const rows = strings.map((s, i) => {
    let p = 0
    return [...s].map((ch) => (ch === '-' ? null : chains[i]!.residues[p++]!))
  })
  const identity = strings.map((s) => identityOf(strings[0]!, s).identity)
  return { rows, strings, identity, conservation: conservation(strings) }
}

export interface OverlayResult { rmsd: number; n: number; segments: Vec3[][]; /** Final fit (mobile → reference frame). */ sp?: Superposition }

/** Superpose row `k` onto row 0 using aligned, observed Cα/C1' pairs; returns the moved trace. */
export function superposeRow(al: ChainAlignment, k: number): OverlayResult | null {
  const fixed: Vec3[] = [], mobile: Vec3[] = []
  const A = al.rows[0]!, B = al.rows[k]!
  for (let c = 0; c < A.length; c++) {
    const a = A[c], b = B[c]
    if (a?.observed && b?.observed && a.center && b.center) { fixed.push(a.center); mobile.push(b.center) }
  }
  if (fixed.length < 3) return null
  let sp = kabsch(mobile, fixed)
  // one outlier-trimming pass (like a simple iterative fit): keep pairs within 2.5×RMSD (min 2 Å)
  const cut = Math.max(2, 2.5 * sp.rmsd)
  const keepF: Vec3[] = [], keepM: Vec3[] = []
  mobile.forEach((m, i) => {
    const t = applySuperposition(sp, m), f = fixed[i]!
    if (Math.hypot(t[0] - f[0], t[1] - f[1], t[2] - f[2]) <= cut) { keepF.push(f); keepM.push(m) }
  })
  if (keepF.length >= 3 && keepF.length < fixed.length) sp = kabsch(keepM, keepF)
  // full-pair RMSD after the final fit
  let ss = 0
  mobile.forEach((m, i) => { const t = applySuperposition(sp, m), f = fixed[i]!; ss += (t[0] - f[0]) ** 2 + (t[1] - f[1]) ** 2 + (t[2] - f[2]) ** 2 })
  const segments: Vec3[][] = []
  let cur: Vec3[] = []
  let prev: Vec3 | null = null
  for (const r of B) {
    if (!r?.observed || !r.center) continue
    const t = applySuperposition(sp, r.center)
    if (prev && Math.hypot(t[0] - prev[0], t[1] - prev[1], t[2] - prev[2]) > 7.5) { if (cur.length > 1) segments.push(cur); cur = [] }
    cur.push(t)
    prev = t
  }
  if (cur.length > 1) segments.push(cur)
  return { rmsd: Math.sqrt(ss / mobile.length), n: mobile.length, segments, sp }
}
