import { useMemo, useRef, useState, type ReactElement } from 'react'
import OverlayBody, { REF_COLOR, type OverlayEntry } from './OverlayAnalysis'
import { OVERLAY_COLORS } from '../SequenceStrip'
import type { MacroModel } from '../../../data/pdb/macro'
import type { AnalysisTab } from '../../../data/cif/cifRoute'
import {
  analyzeStructure, fullReportCsv, resLabel, sectionCsv, CHI_DEFS, RAMA_SOURCE, NOTES,
  type ProteinRow, type NucleicRow, type BasePair, type Step, type RamaCategory, type Residue, summarizeGeom, type GeomItem, type GeomTypeSummary,
} from '../../../data/pdb/analysis'
import { AngleScatter, Histogram, PuckerWheel, SeriesPlot, downloadCsv, type Pt } from './plots'
import type { AnalysisFocus } from './types'
import { GeometryView } from './GeometryView'
import NaEquations from './NaEquationsLazy'

export interface StructureAnalysisPanelProps {
  model: MacroModel
  tab: AnalysisTab
  onTab: (t: AnalysisTab) => void
  onClose: () => void
  focus: AnalysisFocus | null
  onFocus: (f: AnalysisFocus | null) => void
  /** Residue keys (chain|seq|comp) of the focused ligand pocket = "current 3D selection". */
  pocketKeys: string[] | null
  pocketLabel: string | null
  /** Other structures loaded for comparison (sequence strip). ≥1 enables the overlay toggle. */
  compare?: { key: string; label: string; model: MacroModel }[]
}

const f1 = (v: number | null | undefined, d = 1) => (v == null ? '—' : v.toFixed(d))
const TAB_LABEL: Record<AnalysisTab, string> = { rama: 'Backbone φ/ψ/ω', chi: 'Side chains χ', na: 'NA torsions', pucker: 'Sugar pucker', bp: 'Base pairs', step: 'Steps', geom: 'Bonds & angles' }

export default function StructureAnalysisPanel({ model, tab, onTab, onClose, focus, onFocus, pocketKeys, pocketLabel, compare }: StructureAnalysisPanelProps) {
  const [overlayPref, setOverlayPref] = useState(true)
  const comparing = !!compare && compare.length > 0
  const overlayOn = comparing && overlayPref
  const ovEntries: OverlayEntry[] = useMemo(() => comparing ? [
    { key: 'active', label: (model.pdbId ?? 'structure').toUpperCase(), model, color: REF_COLOR },
    ...compare!.map((e, k) => ({ key: e.key, label: e.label, model: e.model, color: OVERLAY_COLORS[k % OVERLAY_COLORS.length]! })),
  ] : [], [comparing, compare, model])
  const fullCsvRef = useRef<(() => string) | null>(null)
  const full = useMemo(() => analyzeStructure(model), [model])
  const chains = useMemo(() => [...new Set(full.residues.filter((r) => r.kind !== 'other').map((r) => r.chain))], [full])
  const [scope, setScope] = useState<string>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [ramaCat, setRamaCat] = useState<RamaCategory>('general')
  const [chiRes, setChiRes] = useState<string>('all')
  const [showLig, setShowLig] = useState(false)

  const inSel = useMemo(() => {
    const pocket = scope === 'pocket' && pocketKeys ? new Set(pocketKeys) : null
    const lo = from.trim() === '' ? -Infinity : Number(from), hi = to.trim() === '' ? Infinity : Number(to)
    return (r: Residue) => {
      if (pocket) return pocket.has(r.key)
      if (scope.startsWith('chain:') && r.chain !== scope.slice(6)) return false
      return !(r.num < lo || r.num > hi)
    }
  }, [scope, pocketKeys, from, to])
  const protein = useMemo(() => full.protein.filter((r) => inSel(r.res)), [full, inSel])
  const nucleic = useMemo(() => full.nucleic.filter((r) => inSel(r.res)), [full, inSel])
  const pairs = useMemo(() => full.pairs.filter((p) => inSel(p.r1) || inSel(p.r2)), [full, inSel])
  const steps = useMemo(() => full.steps.filter((s) => inSel(s.bp1.r1) && inSel(s.bp2.r1)), [full, inSel])
  const selText = scope === 'pocket' ? `ligand pocket ${pocketLabel ?? ''}` : `${scope === 'all' ? 'all chains' : `chain ${scope.slice(6)}`}${from || to ? `, residues ${from || '…'}–${to || '…'}` : ''}`
  const meta = { pdbId: model.pdbId, filter: selText }
  const id = (model.pdbId ?? 'structure').toUpperCase()
  const geom = useMemo(() => [...full.geom, ...(showLig ? full.ligGeom : [])].filter((g) => inSel(g.res)), [full, inSel, showLig])
  const a = { protein, nucleic, pairs, steps, form: full.form, geom }

  const resById = useMemo(() => new Map(full.residues.map((r) => [r.key, r])), [full])
  const pick = (key: string) => {
    const r = resById.get(key)
    if (!r) return
    if (focus?.key === key) { onFocus(null); return }
    onFocus({ key, label: resLabel(r), center: r.atoms.get('CA') ?? r.atoms.get("C1'") ?? r.centroid })
  }
  const hasProt = full.protein.length > 0, hasNa = full.nucleic.length > 0
  const tabs = (['rama', 'chi', 'na', 'pucker', 'bp', 'step', 'geom'] as AnalysisTab[]).filter((t) => (t === 'geom' ? hasProt || hasNa : t === 'rama' || t === 'chi' ? hasProt : hasNa))
  const cur = tabs.includes(tab) ? tab : tabs[0]

  const csvBtn = (section: Parameters<typeof sectionCsv>[0], label: string) => (
    <button type="button" className="btn btn-small" data-testid={`ana-csv-${section}`}
      onClick={() => downloadCsv(`${id}_${section}.csv`, sectionCsv(section, a, meta))}>{label} CSV</button>
  )
  return (
    <aside className="cif-analysis-drawer" aria-label="Structure analysis" data-testid="analysis-drawer">
      <header className="ana-head">
        <h2>Structure analysis · {id}</h2>
        <span className="ana-head-actions">
          <button type="button" className="btn btn-small" data-testid="ana-csv-full" onClick={() => (overlayOn && fullCsvRef.current ? downloadCsv(`${id}_overlay_report.csv`, fullCsvRef.current()) : downloadCsv(`${id}_structure_report.csv`, fullReportCsv(a, meta)))}>Full report CSV</button>
          <button type="button" className="btn btn-small" data-testid="ana-print" onClick={() => printReport(id, a, selText, full.form)}>Printable report</button>
          <button type="button" className="btn btn-small" onClick={onClose} aria-label="Close structure analysis">✕</button>
        </span>
      </header>
      <div className="ana-sel" role="group" aria-label="Selection">
        <label>Selection{' '}
          <select value={scope} onChange={(e) => setScope(e.target.value)} data-testid="ana-scope">
            <option value="all">All chains</option>
            {chains.map((c) => <option key={c} value={`chain:${c}`}>Chain {c}</option>)}
            {pocketKeys && <option value="pocket">3D selection: pocket of {pocketLabel}</option>}
          </select>
        </label>
        <label>Residues <input size={5} value={from} onChange={(e) => setFrom(e.target.value)} placeholder="from" inputMode="numeric" disabled={scope === 'pocket'} /></label>
        <label>– <input size={5} value={to} onChange={(e) => setTo(e.target.value)} placeholder="to" inputMode="numeric" disabled={scope === 'pocket'} /></label>
        <span className="muted">{protein.length} aa · {nucleic.length} nt · computed in {full.ms.toFixed(0)} ms</span>
        {comparing && (
          <label className="ana-overlay-toggle" title="Draw every structure loaded in the sequence strip on the same plots">
            <input type="checkbox" checked={overlayPref} onChange={(e) => setOverlayPref(e.target.checked)} data-testid="ana-overlay-toggle" /> Overlay all loaded structures ({compare!.length + 1})
          </label>
        )}
        {focus && <span className="ana-focus">Centred: <strong>{focus.label}</strong> <button type="button" className="btn btn-small" onClick={() => onFocus(null)}>Clear</button></span>}
      </div>
      <nav className="ana-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={t === cur} className={`seg${t === cur ? ' is-on' : ''}`} onClick={() => onTab(t)} data-testid={`ana-tab-${t}`}>{TAB_LABEL[t]}</button>
        ))}
      </nav>
      {!tabs.length && <p className="muted">No standard protein or nucleic-acid residues in this entry.</p>}
      {overlayOn && cur && <div className="ana-body"><OverlayBody entries={ovEntries} tab={cur} inSel={inSel} focus={focus} onFocus={onFocus} meta={{ pdbId: ovEntries.map((e) => e.label).join(' vs '), filter: selText }} fullCsvRef={fullCsvRef} showLig={showLig} onShowLig={setShowLig} /></div>}
      {!overlayOn && <div className="ana-body">
        {cur === 'rama' && <RamaSection rows={protein} cat={ramaCat} onCat={setRamaCat} pick={pick} sel={focus?.key ?? null} csv={csvBtn('backbone', 'Backbone')} />}
        {cur === 'chi' && <ChiSection rows={protein} resType={chiRes} onResType={setChiRes} pick={pick} sel={focus?.key ?? null} csv={csvBtn('chi', 'χ')} />}
        {cur === 'na' && <NaSection rows={nucleic} pick={pick} sel={focus?.key ?? null} csv={csvBtn('na', 'NA torsion')} />}
        {cur === 'pucker' && <PuckerSection rows={nucleic} pick={pick} sel={focus?.key ?? null} csv={csvBtn('na', 'Pucker + torsion')} />}
        {cur === 'bp' && <BpSection pairs={pairs} pick={pick} sel={focus?.key ?? null} csv={csvBtn('bp', 'Base-pair')} />}
        {cur === 'geom' && <GeometryView series={[{ key: 'active', label: id, color: REF_COLOR, items: geom, idOf: (k) => k }]} pick={pick} sel={focus?.key ?? null} csv={csvBtn('geom', 'Bonds & angles')} showLig={showLig} onShowLig={setShowLig} />}
        {cur === 'step' && <StepSection steps={steps} form={full.form} pick={pick} sel={focus?.key ?? null} csv={csvBtn('step', 'Step')} />}
      </div>}
    </aside>
  )
}

function Table({ cols, rows, keys, pick, sel }: { cols: string[]; rows: (string | number | null)[][]; keys: string[]; pick: (k: string) => void; sel: string | null }) {
  return (
    <div className="ana-table-wrap">
      <table className="ana-table">
        <thead><tr>{cols.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={keys[i] + i} className={sel === keys[i] ? 'is-sel' : undefined} tabIndex={0} onClick={() => pick(keys[i]!)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(keys[i]!) } }}>
              {r.map((v, j) => <td key={j} className={typeof v === 'number' ? 'num' : undefined}>{typeof v === 'number' ? v.toFixed(Math.abs(v) < 10 && cols[j]!.includes('Å') ? 2 : 1) : v ?? '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RamaSection({ rows, cat, onCat, pick, sel, csv }: { rows: ProteinRow[]; cat: RamaCategory; onCat: (c: RamaCategory) => void; pick: (k: string) => void; sel: string | null; csv: ReactElement }) {
  const pts: Pt[] = rows.filter((r) => r.phi != null && r.psi != null && r.category === cat).map((r) => ({
    x: r.phi!, y: r.psi!, id: r.res.key, cls: r.rama ?? undefined, label: `${resLabel(r.res)} φ ${f1(r.phi)}° ψ ${f1(r.psi)}° · ${r.rama}`,
  }))
  const withPP = rows.filter((r) => r.phi != null && r.psi != null)
  const nOut = withPP.filter((r) => r.rama === 'outlier'), nFav = withPP.filter((r) => r.rama === 'favored').length
  const cis = rows.filter((r) => r.cis)
  return (
    <>
      <p className="ana-summary">
        {withPP.length} residues with φ/ψ · {withPP.length ? ((100 * nFav) / withPP.length).toFixed(1) : 0}% in approx. favored regions · {nOut.length} outlier{nOut.length === 1 ? '' : 's'}
        {nOut.length > 0 && <>: {nOut.slice(0, 8).map((r) => <button key={r.res.key} type="button" className="ana-chip" onClick={() => pick(r.res.key)}>{resLabel(r.res)}</button>)}</>}
        {' '}· {cis.length} cis peptide{cis.length === 1 ? '' : 's'}{cis.length > 0 && ` (${cis.map((r) => resLabel(r.res)).join(', ')})`}
      </p>
      <div className="ana-row" role="group" aria-label="Ramachandran category">
        {(['general', 'gly', 'pro', 'prepro'] as RamaCategory[]).map((c) => (
          <button key={c} type="button" className={`seg${c === cat ? ' is-on' : ''}`} aria-pressed={c === cat} onClick={() => onCat(c)}>
            {c === 'general' ? 'General' : c === 'gly' ? 'Gly' : c === 'pro' ? 'Pro' : 'pre-Pro'} ({withPP.filter((r) => r.category === c).length})
          </button>
        ))}
        {csv}
      </div>
      <div className="ana-plots">
        <AngleScatter title={`Ramachandran — ${cat}`} name={`rama-${cat}`} pts={pts} rama={cat} xl="φ (°)" yl="ψ (°)" onPick={pick} selected={sel} />
        <Histogram title="ω distribution" name="omega-hist" values={rows.filter((r) => r.omega != null).map((r) => r.omega!)} xl="ω (°)" info="ω = CA(i)–C(i)–N(i+1)–CA(i+1); trans ≈ 180°, cis ≈ 0° (|ω| < 30° flagged cis)." />
      </div>
      <Table cols={['Residue', 'φ', 'ψ', 'ω', 'cis/trans', 'Category', 'Ramachandran']} keys={rows.map((r) => r.res.key)} pick={pick} sel={sel}
        rows={rows.map((r) => [resLabel(r.res), r.phi, r.psi, r.omega, r.cis ? 'cis' : r.omega != null ? 'trans' : '—', r.category, r.rama ?? '—'])} />
      <p className="muted ana-note" title={RAMA_SOURCE}>{NOTES.backbone}</p>
    </>
  )
}

function ChiSection({ rows, resType, onResType, pick, sel, csv }: { rows: ProteinRow[]; resType: string; onResType: (s: string) => void; pick: (k: string) => void; sel: string | null; csv: ReactElement }) {
  const types = [...new Set(rows.filter((r) => r.chi[0] != null).map((r) => r.res.comp))].sort()
  const rs = rows.filter((r) => r.chi[0] != null && (resType === 'all' || r.res.comp === resType))
  const nChi = resType === 'all' ? 4 : (CHI_DEFS[resType]?.length ?? 4)
  const vals = (k: number) => rs.filter((r) => r.chi[k] != null).map((r) => r.chi[k]!)
  const pts: Pt[] = rs.filter((r) => r.chi[0] != null && r.chi[1] != null).map((r) => ({ x: r.chi[0]!, y: r.chi[1]!, id: r.res.key, label: `${resLabel(r.res)} χ1 ${f1(r.chi[0])}° χ2 ${f1(r.chi[1])}° ${r.rotamer ?? ''}` }))
  return (
    <>
      <div className="ana-row">
        <label>Residue type{' '}
          <select value={resType} onChange={(e) => onResType(e.target.value)} data-testid="ana-chi-res">
            <option value="all">All ({rows.filter((r) => r.chi[0] != null).length})</option>
            {types.map((t) => <option key={t} value={t}>{t} ({rows.filter((r) => r.res.comp === t && r.chi[0] != null).length})</option>)}
          </select>
        </label>
        {csv}
      </div>
      <div className="ana-plots">
        {[0, 1, 2, 3].slice(0, nChi).map((k) => vals(k).length > 0 && (
          <Histogram key={k} title={`χ${k + 1} distribution`} name={`chi${k + 1}-hist${resType === 'all' ? '' : `-${resType}`}`} values={vals(k)} xl={`χ${k + 1} (°)`}
            info={k > 0 ? 'Asp χ2, Glu χ3, Phe/Tyr χ2 folded to [−90°, 90°] (symmetric terminal groups).' : 'Staggered minima at +60° (p), 180° (t), −60° (m).'} />
        ))}
        {pts.length > 0 && <AngleScatter title="χ1 vs χ2" name={`chi1-chi2${resType === 'all' ? '' : `-${resType}`}`} pts={pts} xl="χ1 (°)" yl="χ2 (°)" onPick={pick} selected={sel} />}
      </div>
      <Table cols={['Residue', 'χ1', 'χ2', 'χ3', 'χ4', 'Rotamer']} keys={rs.map((r) => r.res.key)} pick={pick} sel={sel}
        rows={rs.map((r) => [resLabel(r.res), r.chi[0], r.chi[1], r.chi[2], r.chi[3], r.rotamer ?? '—'])} />
      <p className="muted ana-note">{NOTES.chi}</p>
    </>
  )
}

const NA_T = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'chi'] as const
const NA_G: Record<string, string> = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', zeta: 'ζ', chi: 'χ' }
function NaSection({ rows, pick, sel, csv }: { rows: NucleicRow[]; pick: (k: string) => void; sel: string | null; csv: ReactElement }) {
  return (
    <>
      <div className="ana-row">{csv}<span className="muted">{rows.filter((r) => r.glyco === 'syn').length} syn · {rows.filter((r) => r.glyco === 'anti').length} anti</span></div>
      <div className="ana-plots">
        {NA_T.map((t) => <Histogram key={t} title={`${NA_G[t]} distribution`} name={`na-${t}-hist`} values={rows.filter((r) => r[t] != null).map((r) => r[t]!)} xl={`${NA_G[t]} (°)`} />)}
      </div>
      <Table cols={['Residue', 'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'χ', 'anti/syn']} keys={rows.map((r) => r.res.key)} pick={pick} sel={sel}
        rows={rows.map((r) => [resLabel(r.res), r.alpha, r.beta, r.gamma, r.delta, r.epsilon, r.zeta, r.chi, r.glyco ?? '—'])} />
      <p className="muted ana-note">{NOTES.na}</p>
    </>
  )
}

function PuckerSection({ rows, pick, sel, csv }: { rows: NucleicRow[]; pick: (k: string) => void; sel: string | null; csv: ReactElement }) {
  const rs = rows.filter((r) => r.P != null)
  const counts = new Map<string, number>()
  for (const r of rs) counts.set(r.pucker!, (counts.get(r.pucker!) ?? 0) + 1)
  return (
    <>
      <p className="ana-summary">{[...counts].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · ') || 'No complete sugars.'}</p>
      <div className="ana-row">{csv}</div>
      <div className="ana-plots">
        <PuckerWheel pts={rs.map((r) => ({ x: r.P!, y: 0, tm: r.tm!, id: r.res.key, label: `${resLabel(r.res)} P ${f1(r.P)}° τm ${f1(r.tm)}° ${r.pucker}` }))} onPick={pick} selected={sel} />
        <Histogram title="Phase angle P" name="pucker-P-hist" values={rs.map((r) => r.P!)} range={[0, 360]} bin={18} xl="P (°)" />
        <SeriesPlot title="P along sequence" name="pucker-P-series" labels={rs.map((r) => resLabel(r.res))} ids={rs.map((r) => r.res.key)} values={rs.map((r) => r.P!)} unit="°" onPick={pick} />
      </div>
      <NaEquations kind="pucker" />
      <Table cols={['Residue', 'P', 'τm', 'Pucker', 'δ']} keys={rs.map((r) => r.res.key)} pick={pick} sel={sel} rows={rs.map((r) => [resLabel(r.res), r.P, r.tm, r.pucker, r.delta])} />
    </>
  )
}

const BP_P = [['shear', 'Shear', 'Å'], ['stretch', 'Stretch', 'Å'], ['stagger', 'Stagger', 'Å'], ['buckle', 'Buckle', '°'], ['propeller', 'Propeller', '°'], ['opening', 'Opening', '°']] as const
function BpSection({ pairs, pick, sel, csv }: { pairs: BasePair[]; pick: (k: string) => void; sel: string | null; csv: ReactElement }) {
  if (!pairs.length) return <p className="muted">No Watson–Crick base pairs found in this selection.</p>
  return (
    <>
      <div className="ana-row">{csv}<span className="muted">{pairs.length} Watson–Crick pairs</span></div>
      <div className="ana-plots">
        {BP_P.map(([k, n, u]) => (
          <SeriesPlot key={k} title={`${n} per pair`} name={`bp-${k}`} labels={pairs.map((p) => p.label)} ids={pairs.map((p) => p.r1.key)} values={pairs.map((p) => p[k])} unit={u} onPick={pick} ref0={0} />
        ))}
        {BP_P.map(([k, n, u]) => (
          <Histogram key={`h${k}`} title={`${n} distribution`} name={`bp-${k}-hist`} values={pairs.map((p) => p[k])} range={u === 'Å' ? [-2, 2] : [-40, 40]} bin={u === 'Å' ? 0.2 : 4} xl={`${n} (${u})`} />
        ))}
      </div>
      <NaEquations kind="bp" />
      <Table cols={['Pair', 'Shear Å', 'Stretch Å', 'Stagger Å', 'Buckle', 'Propeller', 'Opening']} keys={pairs.map((p) => p.r1.key)} pick={pick} sel={sel}
        rows={pairs.map((p) => [p.label, p.shear, p.stretch, p.stagger, p.buckle, p.propeller, p.opening])} />
      <p className="muted ana-note">{NOTES.bp}</p>
    </>
  )
}

const ST_P = [['shift', 'Shift', 'Å'], ['slide', 'Slide', 'Å'], ['rise', 'Rise', 'Å'], ['tilt', 'Tilt', '°'], ['roll', 'Roll', '°'], ['twist', 'Twist', '°']] as const
function StepSection({ steps, form, pick, sel, csv }: { steps: Step[]; form: string | null; pick: (k: string) => void; sel: string | null; csv: ReactElement }) {
  if (!steps.length) return <p className="muted">No consecutive base-pair steps in this selection.</p>
  const mean = (k: (typeof ST_P)[number][0]) => steps.reduce((s, x) => s + x[k], 0) / steps.length
  return (
    <>
      <p className="ana-summary" data-testid="ana-form">Helical form hint: <strong>{form ?? '—'}</strong> · mean rise {mean('rise').toFixed(2)} Å · mean twist {mean('twist').toFixed(1)}° (B-DNA ≈ 3.3 Å / 36°; A-DNA ≈ 2.8 Å / 32°, slide ≈ −1.5 Å)</p>
      <div className="ana-row">{csv}</div>
      <div className="ana-plots">
        {ST_P.map(([k, n, u]) => (
          <SeriesPlot key={k} title={`${n} per step`} name={`step-${k}`} labels={steps.map((s) => s.label)} ids={steps.map((s) => s.bp1.r1.key)} values={steps.map((s) => s[k])} unit={u} onPick={pick} />
        ))}
      </div>
      <NaEquations kind="step" />
      <Table cols={['Step', 'Shift Å', 'Slide Å', 'Rise Å', 'Tilt', 'Roll', 'Twist']} keys={steps.map((s) => s.bp1.r1.key)} pick={pick} sel={sel}
        rows={steps.map((s) => [s.label, s.shift, s.slide, s.rise, s.tilt, s.roll, s.twist])} />
      <p className="muted ana-note">{NOTES.bp}</p>
    </>
  )
}

function esc(s: string) { return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!) }
function geomSection(items: GeomItem[], tbl: (t: string, c: string[], r: (string | number | null | undefined)[][]) => string): string {
  if (!items.length) return ''
  const sum = summarizeGeom(items)
  const f = (v: number | null, k: string) => (v == null ? '—' : v.toFixed(k === 'bond' ? 3 : 1))
  const out = items.filter((g) => g.z != null && Math.abs(g.z) > 4).sort((p, q) => Math.abs(q.z!) - Math.abs(p.z!))
  const hists = sum.map((t) => geomHistSvg(t, items.filter((g) => g.group === t.group && g.type === t.type).map((g) => g.value))).join('')
  return `<h2>Bonds &amp; angles</h2><p>${esc(GEOM_REPORT_NOTE)}</p>`
    + tbl('Summary per type', ['Type', 'Kind', 'n', 'Mean', 'SD', 'Target', 'σ', 'RMS-Z', '|Z|>4'], sum.map((t) => [t.type, t.kind, String(t.n), t.kind === 'torsion' ? '—' : f(t.mean, t.kind), t.kind === 'torsion' ? '—' : f(t.sd, t.kind), f(t.ideal, t.kind), f(t.sigma, t.kind), t.rmsZ == null ? '—' : t.rmsZ.toFixed(2), String(t.outliers)]))
    + (out.length ? tbl(`Outliers (|Z| > 4, ${out.length})`, ['Type', 'Atoms', 'Value', 'Target', 'Z'], out.slice(0, 500).map((g) => [g.type, g.atoms, f(g.value, g.kind), f(g.ideal, g.kind), g.z!.toFixed(1)])) : '<p>No |Z| &gt; 4 outliers.</p>')
    + `<div>${hists}</div>`
}
const GEOM_REPORT_NOTE = 'Targets: Engh & Huber (2001) via Berkholz et al. (2009) for general peptide/backbone; peptide links to Pro and disulfides from the CCP4 Monomer Library (mon_lib_list.cif, links PTRANS and disulf). Gly acceptors use the general targets. χSS (CB–SG–SG–CB) is shown as a distribution only (CCP4 target ±90°).'
/** Minimal static histogram SVG for the printable report (one per geometry type). */
function geomHistSvg(t: GeomTypeSummary, vals: number[]): string {
  const W = 300, H = 140, L = 34, B = 26
  let lo: number, hi: number, bin: number
  if (t.kind === 'torsion') { lo = -180; hi = 180; bin = 10 }
  else if (t.kind === 'angle') { const c = t.ideal ?? t.mean; lo = Math.floor(c - 15); hi = Math.ceil(c + 15); bin = 1 }
  else { const c = t.ideal ?? t.mean; lo = +(c - 0.15).toFixed(2); hi = +(c + 0.15).toFixed(2); bin = 0.01 }
  const nb = Math.max(1, Math.round((hi - lo) / bin)), cnt = new Array(nb).fill(0)
  for (const v of vals) { const i = Math.min(nb - 1, Math.max(0, Math.floor((v - lo) / bin))); cnt[i]++ }
  const mx = Math.max(1, ...cnt), x = (v: number) => L + ((v - lo) / (hi - lo)) * (W - L - 6), bw = (W - L - 6) / nb
  const bars = cnt.map((c, i) => `<rect x="${(L + i * bw).toFixed(1)}" y="${(H - B - (c / mx) * (H - B - 18)).toFixed(1)}" width="${Math.max(0.5, bw - 0.5).toFixed(1)}" height="${((c / mx) * (H - B - 18)).toFixed(1)}" fill="#2563eb"/>`).join('')
  const ideal = t.ideal != null ? `<line x1="${x(t.ideal)}" x2="${x(t.ideal)}" y1="16" y2="${H - B}" stroke="#dc2626" stroke-dasharray="3 2"/>` : ''
  const u = t.kind === 'bond' ? 'Å' : '°'
  return `<svg class="ana-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><text x="${W / 2}" y="11" font-size="10" text-anchor="middle">${esc(t.type)} (n=${vals.length})</text>${bars}${ideal}<line x1="${L}" x2="${W - 6}" y1="${H - B}" y2="${H - B}" stroke="#333"/><text x="${L}" y="${H - B + 12}" font-size="9">${lo}</text><text x="${W - 6}" y="${H - B + 12}" font-size="9" text-anchor="end">${hi}</text><text x="${W / 2}" y="${H - 4}" font-size="9" text-anchor="middle">${u}${t.ideal != null ? ' · red = target' : ''}</text></svg>`
}
function printReport(id: string, a: { protein: ProteinRow[]; nucleic: NucleicRow[]; pairs: BasePair[]; steps: Step[]; geom?: GeomItem[] }, sel: string, form: string | null) {
  const svgs = [...document.querySelectorAll<SVGSVGElement>('.cif-analysis-drawer svg.ana-svg')].map((s) => s.outerHTML).join('')
  const tbl = (title: string, cols: string[], rows: (string | number | null | undefined)[][]) => rows.length
    ? `<h2>${esc(title)}</h2><table><thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((v) => `<td>${v == null ? '' : typeof v === 'number' ? v.toFixed(2) : esc(String(v))}</td>`).join('')}</tr>`).join('')}</tbody></table>` : ''
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${id} structure analysis</title><style>body{font:12px system-ui,sans-serif;margin:24px;color:#111}table{border-collapse:collapse;margin:6px 0 16px}td,th{border:1px solid #ccc;padding:2px 6px;text-align:right}th{background:#f1f5f9}svg{width:300px;height:auto;margin:4px;border:1px solid #e2e8f0}h1{font-size:18px}h2{font-size:14px;margin-top:18px}</style></head><body>
<h1>Structure analysis — PDB ${esc(id)}</h1><p>Selection: ${esc(sel)} · ${new Date().toISOString().slice(0, 10)} · crystalspacegroups.com${form ? ` · Helical form: ${esc(form)}` : ''}</p>
<p>${esc(NOTES.backbone)}<br>${esc(NOTES.chi)}<br>${esc(NOTES.na)}<br>${esc(NOTES.bp)}</p>
<div>${svgs}</div>
${tbl('Backbone', ['Residue', 'φ', 'ψ', 'ω', 'cis', 'Category', 'Rama'], a.protein.map((r) => [resLabel(r.res), r.phi, r.psi, r.omega, r.cis ? 'cis' : '', r.category, r.rama]))}
${tbl('Side chains', ['Residue', 'χ1', 'χ2', 'χ3', 'χ4', 'Rotamer'], a.protein.filter((r) => r.chi[0] != null).map((r) => [resLabel(r.res), ...r.chi, r.rotamer]))}
${tbl('Nucleic-acid torsions & pucker', ['Residue', 'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'χ', 'anti/syn', 'P', 'τm', 'Pucker'], a.nucleic.map((r) => [resLabel(r.res), r.alpha, r.beta, r.gamma, r.delta, r.epsilon, r.zeta, r.chi, r.glyco, r.P, r.tm, r.pucker]))}
${tbl('Base pairs', ['Pair', 'Shear', 'Stretch', 'Stagger', 'Buckle', 'Propeller', 'Opening'], a.pairs.map((p) => [p.label, p.shear, p.stretch, p.stagger, p.buckle, p.propeller, p.opening]))}
${tbl('Steps', ['Step', 'Shift', 'Slide', 'Rise', 'Tilt', 'Roll', 'Twist'], a.steps.map((s) => [s.label, s.shift, s.slide, s.rise, s.tilt, s.roll, s.twist]))}
${geomSection(a.geom ?? [], tbl)}
<script>setTimeout(()=>print(),300)</script></body></html>`
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
}
