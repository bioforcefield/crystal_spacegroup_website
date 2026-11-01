/** Compare mode for the Structure analysis drawer: every loaded structure on the same plots. */
import { useMemo, useState, type MutableRefObject, type ReactElement } from 'react'
import type { MacroModel } from '../../../data/pdb/macro'
import type { AnalysisTab } from '../../../data/cif/cifRoute'
import type { Vec3 } from '../../../data/types'
import {
  analyzeStructure, overlayFullReportCsv, overlaySectionCsv, resLabel, NOTES, RAMA_SOURCE,
  type ProteinRow, type NucleicRow, type BasePair, type Step, type RamaCategory, type Residue, type ReportInput, type StructureAnalysis, type CsvSection,
} from '../../../data/pdb/analysis'
import { chainSequences, type ChainSequence } from '../../../data/pdb/sequence'
import { alignChains, superposeRow, type OverlayResult } from '../../../data/pdb/compare'
import { applySuperposition } from '../../../data/pdb/kabsch'
import { OverlayHistogram, OverlayLegend, OverlayScatter, OverlaySeries, PuckerWheel, downloadCsv, type OvPt, type OvSeries } from './plots'
import type { AnalysisFocus } from './types'

export const REF_COLOR = '#2563eb'
export interface OverlayEntry { key: string; label: string; model: MacroModel; color: string }
export interface OverlayStruct extends OvSeries {
  idx: number
  full: StructureAnalysis
  chain: string | null
  /** residue key → alignment column (null when no alignment). */
  col: Map<string, number> | null
  fit: OverlayResult | null
  a: ReportInput
}

const SEP = '::'
/** Focus/point id: reference residues keep their plain key (3D highlight unchanged); others are prefixed. */
export const ovId = (s: { idx: number; key: string }, resKey: string) => (s.idx === 0 ? resKey : `${s.key}${SEP}${resKey}`)
export function parseOvId(id: string): { entry: string | null; resKey: string } {
  const i = id.indexOf(SEP)
  return i < 0 ? { entry: null, resKey: id } : { entry: id.slice(0, i), resKey: id.slice(i + SEP.length) }
}

/** Analyse every entry; align the default chain of each to the reference (same rule as the sequence strip). */
export function buildOverlay(entries: OverlayEntry[]): { structs: Omit<OverlayStruct, 'a'>[]; aligned: boolean; nCols: number } {
  const seqs = entries.map((e) => chainSequences(e.model))
  const ref = seqs[0]?.[0]
  const chosen: (ChainSequence | undefined)[] = seqs.map((l, i) => (i === 0 ? ref : l.find((c) => c.kind === ref?.kind) ?? l[0]))
  const ok = chosen.every(Boolean) && entries.length > 1
  const aln = ok ? alignChains(chosen as ChainSequence[]) : null
  const structs = entries.map((e, i) => {
    const full = analyzeStructure(e.model)
    const ch = chosen[i]
    const col = aln ? new Map<string, number>() : null
    if (aln && col) aln.rows[i]!.forEach((r, c) => { if (r?.key) col.set(r.key, c) })
    const fit = aln && i > 0 ? superposeRow(aln, i) : null
    return { key: e.key, label: `${e.label}${ch ? ` · ${ch.chain}` : ''}`, color: e.color, idx: i, full, chain: ch?.chain ?? null, col, fit }
  })
  return { structs, aligned: !!aln, nCols: aln ? aln.rows[0]!.length : 0 }
}

const f1 = (v: number | null | undefined, d = 1) => (v == null ? '—' : v.toFixed(d))
const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : '—')
const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null)

export function summaryRows(structs: OverlayStruct[]): [string, ...string[]][] {
  const rows: [string, ...string[]][] = []
  const add = (name: string, f: (s: OverlayStruct) => string) => rows.push([name, ...structs.map(f)])
  add('Aligned chain', (s) => s.chain ?? '—')
  add('Amino acids', (s) => String(s.a.protein.length))
  add('Nucleotides', (s) => String(s.a.nucleic.length))
  const pp = (s: OverlayStruct) => s.a.protein.filter((r) => r.phi != null && r.psi != null)
  if (structs.some((s) => s.a.protein.length)) {
    add('Residues with φ/ψ', (s) => String(pp(s).length))
    add('Rama favored', (s) => pct(pp(s).filter((r) => r.rama === 'favored').length, pp(s).length))
    add('Rama outliers', (s) => String(pp(s).filter((r) => r.rama === 'outlier').length))
    add('cis peptides', (s) => String(s.a.protein.filter((r) => r.cis).length))
    add('Residues with χ1', (s) => String(s.a.protein.filter((r) => r.chi[0] != null).length))
  }
  if (structs.some((s) => s.a.nucleic.length)) {
    add('anti / syn', (s) => `${s.a.nucleic.filter((r) => r.glyco === 'anti').length} / ${s.a.nucleic.filter((r) => r.glyco === 'syn').length}`)
    add('WC base pairs', (s) => String(s.a.pairs.length))
    add('Mean rise (Å)', (s) => f1(mean(s.a.steps.map((x) => x.rise)), 2))
    add('Mean twist (°)', (s) => f1(mean(s.a.steps.map((x) => x.twist))))
    add('Helical form hint', (s) => s.a.form ?? '—')
  }
  add('Cα/C1′ RMSD vs reference', (s) => (s.idx === 0 ? 'ref' : s.fit ? `${s.fit.rmsd.toFixed(2)} Å (${s.fit.n})` : '—'))
  return rows
}

export interface OverlayBodyProps {
  entries: OverlayEntry[]
  tab: AnalysisTab
  inSel: (r: Residue) => boolean
  focus: AnalysisFocus | null
  onFocus: (f: AnalysisFocus | null) => void
  meta: { pdbId: string | null; filter: string }
  /** Set to a builder for the multi-structure full-report CSV (used by the drawer header button). */
  fullCsvRef?: MutableRefObject<(() => string) | null>
}

export default function OverlayBody({ entries, tab, inSel, focus, onFocus, meta, fullCsvRef }: OverlayBodyProps) {
  const base = useMemo(() => buildOverlay(entries), [entries])
  const structs: OverlayStruct[] = useMemo(() => base.structs.map((s) => ({
    ...s,
    a: {
      protein: s.full.protein.filter((r) => inSel(r.res)),
      nucleic: s.full.nucleic.filter((r) => inSel(r.res)),
      pairs: s.full.pairs.filter((p) => inSel(p.r1) || inSel(p.r2)),
      steps: s.full.steps.filter((x) => inSel(x.bp1.r1) && inSel(x.bp2.r1)),
      form: s.full.form,
    },
  })), [base, inSel])
  if (fullCsvRef) fullCsvRef.current = () => overlayFullReportCsv(structs.map((s) => ({ label: s.label, a: s.a })), meta)
  const [normalize, setNormalize] = useState(true)
  const [cat, setCat] = useState<RamaCategory>('general')
  const sel = focus?.key ?? null
  const byKey = useMemo(() => new Map(structs.map((s) => [s.key, s])), [structs])
  const resMaps = useMemo(() => structs.map((s) => new Map(s.full.residues.map((r) => [r.key, r]))), [structs])

  const pick = (id: string) => {
    if (focus?.key === id) { onFocus(null); return }
    const { entry, resKey } = parseOvId(id)
    const s = entry ? byKey.get(entry) : structs[0]
    if (!s) return
    const r = resMaps[s.idx]!.get(resKey)
    if (!r) return
    const c0: Vec3 = r.atoms.get('CA') ?? r.atoms.get("C1'") ?? r.centroid
    // non-reference residues are centred on their position in the superposed (reference) frame
    const center = s.idx === 0 ? c0 : s.fit?.sp ? applySuperposition(s.fit.sp, c0) : null
    if (!center) return
    onFocus({ key: id, label: s.idx === 0 ? resLabel(r) : `${s.label.split(' · ')[0]} ${resLabel(r)}`, center })
  }

  const series = structs.map(({ key, label, color }) => ({ key, label, color }))
  const csv = (section: CsvSection, label: string) => (
    <button type="button" className="btn btn-small" data-testid={`ana-csv-${section}`}
      onClick={() => downloadCsv(`overlay_${section}.csv`, overlaySectionCsv(section, structs.map((s) => ({ label: s.label, a: s.a })), meta))}>{label} CSV</button>
  )
  const normBox = (
    <label className="ana-norm" title="Structures differ in size: compare fractions rather than counts">
      <input type="checkbox" checked={normalize} onChange={(e) => setNormalize(e.target.checked)} data-testid="ana-normalize" /> Normalize (fraction)
    </label>
  )
  const hist = (name: string, title: string, get: (a: ReportInput) => number[], xl: string, extra?: { range?: [number, number]; bin?: number; info?: string }) => (
    <OverlayHistogram key={name} name={name} title={title} xl={xl} normalize={normalize} {...extra}
      groups={structs.map((s) => ({ key: s.key, label: s.label, color: s.color, values: get(s.a) }))} />
  )
  const xMax = Math.max(1, base.aligned ? base.nCols - 1 : Math.max(0, ...structs.map((s) => s.a.nucleic.length + s.a.pairs.length)))
  /** Per-residue line positions: alignment column when available, else index along the structure. */
  const lines = <T,>(get: (a: ReportInput) => T[], key: (t: T) => string, v: (t: T) => number, label: (t: T) => string) => {
    let xm = 1
    const ls = structs.map((s) => {
      const items = get(s.a)
      const useCol = !!s.col && items.every((t) => s.col!.has(key(t)))
      const pts = items.map((t, i) => ({ x: useCol ? s.col!.get(key(t))! : i, v: v(t), id: ovId(s, key(t)), label: label(t) }))
      if (!useCol) xm = Math.max(xm, items.length - 1)
      return { key: s.key, label: s.label, color: s.color, pts: pts.sort((p, q) => p.x - q.x), useCol }
    })
    const allCol = ls.every((l) => l.useCol)
    return { ls, xMax: allCol ? xMax : Math.max(xm, ...ls.filter((l) => l.useCol).map((l) => l.pts.at(-1)?.x ?? 0)), xLabel: allCol ? 'alignment position' : 'position along sequence (index; not aligned)' }
  }

  const table = (cols: string[], rows: { id: string; s: OverlayStruct; cells: (string | number | null)[] }[]) => (
    <div className="ana-table-wrap">
      <table className="ana-table">
        <thead><tr><th scope="col">Structure</th>{cols.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={sel === r.id ? 'is-sel' : undefined} tabIndex={0} onClick={() => pick(r.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(r.id) } }}>
              <td><i className="ana-swatch" style={{ background: r.s.color }} aria-hidden="true" />{r.s.label.split(' · ')[0]}</td>
              {r.cells.map((v, j) => <td key={j} className={typeof v === 'number' ? 'num' : undefined}>{typeof v === 'number' ? v.toFixed(Math.abs(v) < 10 && cols[j]!.includes('Å') ? 2 : 1) : v ?? '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
  const rowsOf = <T,>(get: (a: ReportInput) => T[], key: (t: T) => string, cells: (t: T) => (string | number | null)[]) =>
    structs.flatMap((s) => get(s.a).map((t) => ({ id: ovId(s, key(t)), s, cells: cells(t) })))

  const summary = summaryRows(structs)
  let body: ReactElement | null = null
  if (tab === 'rama') {
    const pts: OvPt[] = structs.flatMap((s) => s.a.protein.filter((r) => r.phi != null && r.psi != null && r.category === cat).map((r) => ({
      x: r.phi!, y: r.psi!, s: s.key, id: ovId(s, r.res.key), cls: r.rama ?? undefined, label: `${s.label.split(' · ')[0]} ${resLabel(r.res)} φ ${f1(r.phi)}° ψ ${f1(r.psi)}° · ${r.rama}`,
    })))
    body = (
      <>
        <div className="ana-row" role="group" aria-label="Ramachandran category">
          {(['general', 'gly', 'pro', 'prepro'] as RamaCategory[]).map((c) => (
            <button key={c} type="button" className={`seg${c === cat ? ' is-on' : ''}`} aria-pressed={c === cat} onClick={() => setCat(c)}>
              {c === 'general' ? 'General' : c === 'gly' ? 'Gly' : c === 'pro' ? 'Pro' : 'pre-Pro'}
            </button>
          ))}
          {normBox}{csv('backbone', 'Backbone')}
        </div>
        <div className="ana-plots">
          <OverlayScatter title={`Ramachandran — ${cat} (overlay)`} name={`rama-${cat}-overlay`} pts={pts} series={series} rama={cat} xl="φ (°)" yl="ψ (°)" onPick={pick} selected={sel} />
          {hist('omega-hist-overlay', 'ω distribution (overlay)', (a) => a.protein.filter((r) => r.omega != null).map((r) => r.omega!), 'ω (°)')}
        </div>
        {table(['Residue', 'φ', 'ψ', 'ω', 'Category', 'Ramachandran'], rowsOf((a) => a.protein, (r: ProteinRow) => r.res.key, (r) => [resLabel(r.res), r.phi, r.psi, r.omega, r.category, r.rama ?? '—']))}
        <p className="muted ana-note" title={RAMA_SOURCE}>{NOTES.backbone}</p>
      </>
    )
  } else if (tab === 'chi') {
    const pts: OvPt[] = structs.flatMap((s) => s.a.protein.filter((r) => r.chi[0] != null && r.chi[1] != null).map((r) => ({
      x: r.chi[0]!, y: r.chi[1]!, s: s.key, id: ovId(s, r.res.key), label: `${s.label.split(' · ')[0]} ${resLabel(r.res)} χ1 ${f1(r.chi[0])}° χ2 ${f1(r.chi[1])}°`,
    })))
    body = (
      <>
        <div className="ana-row">{normBox}{csv('chi', 'χ')}</div>
        <div className="ana-plots">
          {[0, 1, 2, 3].map((k) => structs.some((s) => s.a.protein.some((r) => r.chi[k] != null)) && hist(`chi${k + 1}-hist-overlay`, `χ${k + 1} distribution (overlay)`, (a) => a.protein.filter((r) => r.chi[k] != null).map((r) => r.chi[k]!), `χ${k + 1} (°)`))}
          {pts.length > 0 && <OverlayScatter title="χ1 vs χ2 (overlay)" name="chi1-chi2-overlay" pts={pts} series={series} xl="χ1 (°)" yl="χ2 (°)" onPick={pick} selected={sel} />}
        </div>
        {table(['Residue', 'χ1', 'χ2', 'χ3', 'χ4', 'Rotamer'], rowsOf((a) => a.protein.filter((r) => r.chi[0] != null), (r: ProteinRow) => r.res.key, (r) => [resLabel(r.res), r.chi[0], r.chi[1], r.chi[2], r.chi[3], r.rotamer ?? '—']))}
        <p className="muted ana-note">{NOTES.chi}</p>
      </>
    )
  } else if (tab === 'na') {
    const T = [['alpha', 'α'], ['beta', 'β'], ['gamma', 'γ'], ['delta', 'δ'], ['epsilon', 'ε'], ['zeta', 'ζ'], ['chi', 'χ']] as const
    body = (
      <>
        <div className="ana-row">{normBox}{csv('na', 'NA torsion')}</div>
        <div className="ana-plots">{T.map(([t, g]) => hist(`na-${t}-hist-overlay`, `${g} distribution (overlay)`, (a) => a.nucleic.filter((r) => r[t] != null).map((r) => r[t]!), `${g} (°)`))}</div>
        {table(['Residue', 'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'χ', 'anti/syn'], rowsOf((a) => a.nucleic, (r: NucleicRow) => r.res.key, (r) => [resLabel(r.res), r.alpha, r.beta, r.gamma, r.delta, r.epsilon, r.zeta, r.chi, r.glyco ?? '—']))}
        <p className="muted ana-note">{NOTES.na}</p>
      </>
    )
  } else if (tab === 'pucker') {
    const L = lines((a) => a.nucleic.filter((r) => r.P != null), (r: NucleicRow) => r.res.key, (r) => r.P!, (r) => resLabel(r.res))
    const ref = structs[0]!
    body = (
      <>
        <div className="ana-row">{normBox}{csv('na', 'Pucker + torsion')}</div>
        <div className="ana-plots">
          <PuckerWheel pts={ref.a.nucleic.filter((r) => r.P != null).map((r) => ({ x: r.P!, y: 0, tm: r.tm!, id: r.res.key, label: `${resLabel(r.res)} P ${f1(r.P)}° τm ${f1(r.tm)}° ${r.pucker}` }))} onPick={pick} selected={sel} />
          {hist('pucker-P-hist-overlay', 'Phase angle P (overlay)', (a) => a.nucleic.filter((r) => r.P != null).map((r) => r.P!), 'P (°)', { range: [0, 360], bin: 18 })}
          <OverlaySeries title="P along sequence (overlay)" name="pucker-P-series-overlay" lines={L.ls} xMax={L.xMax} xLabel={L.xLabel} unit="°" onPick={pick} />
        </div>
        {table(['Residue', 'P', 'τm', 'Pucker', 'δ'], rowsOf((a) => a.nucleic.filter((r) => r.P != null), (r: NucleicRow) => r.res.key, (r) => [resLabel(r.res), r.P, r.tm, r.pucker, r.delta]))}
        <p className="muted ana-note">Pucker wheel shows the reference structure only; histogram and series overlay all structures.</p>
      </>
    )
  } else if (tab === 'bp') {
    const P = [['shear', 'Shear', 'Å'], ['stretch', 'Stretch', 'Å'], ['stagger', 'Stagger', 'Å'], ['buckle', 'Buckle', '°'], ['propeller', 'Propeller', '°'], ['opening', 'Opening', '°']] as const
    body = (
      <>
        <div className="ana-row">{normBox}{csv('bp', 'Base-pair')}</div>
        <div className="ana-plots">
          {P.map(([k, n, u]) => { const L = lines((a) => a.pairs, (p: BasePair) => p.r1.key, (p) => p[k], (p) => p.label); return <OverlaySeries key={k} title={`${n} per pair (overlay)`} name={`bp-${k}-overlay`} lines={L.ls} xMax={L.xMax} xLabel={L.xLabel} unit={u} onPick={pick} ref0={0} /> })}
          {P.map(([k, n, u]) => hist(`bp-${k}-hist-overlay`, `${n} distribution (overlay)`, (a) => a.pairs.map((p) => p[k]), `${n} (${u})`, { range: u === 'Å' ? [-2, 2] : [-40, 40], bin: u === 'Å' ? 0.2 : 4 }))}
        </div>
        {table(['Pair', 'Shear Å', 'Stretch Å', 'Stagger Å', 'Buckle', 'Propeller', 'Opening'], rowsOf((a) => a.pairs, (p: BasePair) => p.r1.key, (p) => [p.label, p.shear, p.stretch, p.stagger, p.buckle, p.propeller, p.opening]))}
        <p className="muted ana-note">{NOTES.bp}</p>
      </>
    )
  } else if (tab === 'step') {
    const P = [['shift', 'Shift', 'Å'], ['slide', 'Slide', 'Å'], ['rise', 'Rise', 'Å'], ['tilt', 'Tilt', '°'], ['roll', 'Roll', '°'], ['twist', 'Twist', '°']] as const
    body = (
      <>
        <div className="ana-row">{csv('step', 'Step')}</div>
        <div className="ana-plots">
          {P.map(([k, n, u]) => { const L = lines((a) => a.steps, (s: Step) => s.bp1.r1.key, (s) => s[k], (s) => s.label); return <OverlaySeries key={k} title={`${n} per step (overlay)`} name={`step-${k}-overlay`} lines={L.ls} xMax={L.xMax} xLabel={L.xLabel} unit={u} onPick={pick} /> })}
        </div>
        {table(['Step', 'Shift Å', 'Slide Å', 'Rise Å', 'Tilt', 'Roll', 'Twist'], rowsOf((a) => a.steps, (s: Step) => s.bp1.r1.key, (s) => [s.label, s.shift, s.slide, s.rise, s.tilt, s.roll, s.twist]))}
        <p className="muted ana-note">{NOTES.bp}</p>
      </>
    )
  }
  return (
    <div className="ana-overlay" data-testid="ana-overlay">
      <OverlayLegend series={series} />
      <div className="ana-table-wrap">
        <table className="ana-table ana-summary-table" data-testid="ana-overlay-summary">
          <thead><tr><th scope="col">Summary</th>{structs.map((s) => <th key={s.key} scope="col"><i className="ana-swatch" style={{ background: s.color }} aria-hidden="true" />{s.label}</th>)}</tr></thead>
          <tbody>{summary.map(([n, ...v]) => <tr key={n}><th scope="row">{n}</th>{v.map((x, i) => <td key={i} className="num">{x}</td>)}</tr>)}</tbody>
        </table>
      </div>
      {!base.aligned && <p className="muted ana-note">No sequence alignment available — per-residue series use each structure's own index.</p>}
      {body}
    </div>
  )
}
