/** Per-chain polymer sequences (observed vs deposited SEQRES) for the sequence strip. */
import type { Vec3 } from '../types'
import type { MacroModel } from './macro'
import { isAmino, isNucleic } from './macro'
import type { SsCode } from './secondary'

const ONE: Record<string, string> = {
  ALA: 'A', ARG: 'R', ASN: 'N', ASP: 'D', CYS: 'C', GLN: 'Q', GLU: 'E', GLY: 'G', HIS: 'H', ILE: 'I', LEU: 'L', LYS: 'K',
  MET: 'M', PHE: 'F', PRO: 'P', SER: 'S', THR: 'T', TRP: 'W', TYR: 'Y', VAL: 'V', MSE: 'M', SEC: 'U', PYL: 'O',
  SEP: 'S', TPO: 'T', PTR: 'Y', HYP: 'P', MLY: 'K', CSO: 'C', CSD: 'C', KCX: 'K', LLP: 'K', CME: 'C', OCS: 'C',
  A: 'A', C: 'C', G: 'G', U: 'U', T: 'T', I: 'I', DA: 'A', DC: 'C', DG: 'G', DT: 'T', DU: 'U', DI: 'I',
}
export const oneLetter = (comp: string) => ONE[comp] ?? 'X'

export interface SeqResidue {
  comp: string
  code: string
  /** Auth residue number (+ins) or null when SEQRES gives none. */
  num: string | null
  observed: boolean
  ss: SsCode
  /** AnalysisFocus key chain|seq|comp (observed only). */
  key: string | null
  /** CA / C1' (or centroid) in the ASU site frame. */
  center: Vec3 | null
}
export interface ChainSequence { chain: string; kind: 'protein' | 'nucleic'; residues: SeqResidue[]; observedCount: number }

export function chainSequences(m: MacroModel): ChainSequence[] {
  type Obs = { comp: string; seq: string; ss: SsCode; center: Vec3 | null; sum: Vec3; n: number }
  const byChain = new Map<string, Obs[]>()
  const idx = new Map<string, Obs>()
  m.extras.forEach((e, i) => {
    if (e.water || !(isAmino(e.comp) || isNucleic(e.comp))) return
    const k = `${e.chain}|${e.seq}|${e.comp}`
    let o = idx.get(k)
    if (!o) {
      o = { comp: e.comp, seq: e.seq, ss: 'C', center: null, sum: [0, 0, 0], n: 0 }
      idx.set(k, o)
      let l = byChain.get(e.chain)
      if (!l) byChain.set(e.chain, (l = []))
      l.push(o)
    }
    const p = m.cart[i]!
    o.sum = [o.sum[0] + p[0], o.sum[1] + p[1], o.sum[2] + p[2]]
    o.n++
    if (e.atomName === 'CA' || e.atomName === "C1'") { o.center = p; if (e.ca) o.ss = m.ss[i] ?? 'C' }
  })
  const out: ChainSequence[] = []
  for (const [chain, obs] of byChain) {
    const kind = obs.filter((o) => isNucleic(o.comp)).length > obs.length / 2 ? 'nucleic' : 'protein'
    const mk = (o: Obs): SeqResidue => ({
      comp: o.comp, code: oneLetter(o.comp), num: o.seq, observed: true, ss: o.ss,
      key: `${chain}|${o.seq}|${o.comp}`, center: o.center ?? [o.sum[0] / o.n, o.sum[1] / o.n, o.sum[2] / o.n],
    })
    const dep = m.seqres?.get(chain)
    let residues: SeqResidue[]
    if (dep?.length) {
      const byNum = new Map(obs.map((o) => [o.seq, o]))
      const used = new Set<Obs>()
      residues = dep.map((d) => {
        const o = d.num != null ? byNum.get(d.num) : undefined
        if (o && o.comp === d.comp && !used.has(o)) { used.add(o); return mk(o) }
        return { comp: d.comp, code: oneLetter(d.comp), num: d.num, observed: false, ss: 'C', key: null, center: null }
      })
      if (used.size < obs.length / 2) residues = obs.map(mk) // numbering mismatch → observed only
    } else residues = obs.map(mk)
    out.push({ chain, kind, residues, observedCount: residues.filter((r) => r.observed).length })
  }
  return out.filter((c) => c.residues.length >= 2)
}
