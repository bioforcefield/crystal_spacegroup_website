import { useMemo, useState, type ReactNode } from 'react'
import type { ExpandedStructure } from '../../../data/cif/types'
import { analyzeSmallMolecule, analysisCsv, type Focus, type Ref, type SmallMolAnalysis, type Src } from '../../../data/cif/smallmol/analysis'
import { BV_TABLE_NOTE, SM_REFERENCES } from '../../../data/cif/smallmol/references'
import { Histogram, downloadCsv } from './plots'

export type SmTab = 'summary' | 'bonds' | 'angles' | 'torsions' | 'hbonds' | 'contacts' | 'coord' | 'hist'
const TAB_LABEL: Record<SmTab, string> = { summary: 'Summary', bonds: 'Bonds', angles: 'Angles', torsions: 'Torsions', hbonds: 'H-bonds', contacts: 'Short contacts', coord: 'Coordination / BVS', hist: 'Distributions' }

export interface SmallMolAnalysisPanelProps {
  structure: ExpandedStructure
  cifText: string
  title: string
  onClose: () => void
  focus: Focus | null
  onFocus: (f: Focus | null) => void
}

/** Superscript symmetry code after an atom label: O1^i → O1ⁱ rendered as <sup>. */
function Lbl({ r }: { r: Ref }) {
  const [base, code] = r.label.split('^')
  return <>{base}{code && <sup>{code}</sup>}</>
}

type Cell = ReactNode
interface Row { key: string; cells: Cell[]; focus?: Focus; codes: string[] }

const MAX_ROWS = 400

function Table({ cols, rows, focus, onFocus, testid }: { cols: string[]; rows: Row[]; focus: Focus | null; onFocus: (f: Focus | null) => void; testid: string }) {
  const [all, setAll] = useState(false)
  const shown = all ? rows : rows.slice(0, MAX_ROWS)
  if (!rows.length) return <p className="muted" data-testid={`${testid}-empty`}>None found.</p>
  const pick = (r: Row) => { if (!r.focus) return; onFocus(focus?.key === r.focus.key ? null : r.focus) }
  return (
    <div className="ana-table-wrap">
      <table className="ana-table" data-testid={testid}>
        <thead><tr>{cols.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.key} className={focus && r.focus && focus.key === r.focus.key ? 'is-sel' : undefined} tabIndex={0} onClick={() => pick(r)}
              title={r.focus ? 'Highlight in 3D' : 'Atoms not loaded — no 3D highlight'}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(r) } }}>
              {r.cells.map((v, j) => <td key={j} className={j >= cols.length - (cols.length > 3 ? 4 : 2) ? 'num' : undefined}>{v ?? '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > MAX_ROWS && !all && <button type="button" className="btn btn-small" onClick={() => setAll(true)}>Show all {rows.length} rows</button>}
    </div>
  )
}

function Footnotes({ rows, a }: { rows: Row[]; a: SmallMolAnalysis }) {
  const used = new Set(rows.flatMap((r) => r.codes))
  const list = a.symCodes.filter((c) => used.has(c.code))
  if (!list.length) return null
  return (
    <p className="sm-symcodes" data-testid="sm-symcodes">
      Symmetry codes: {list.map((c, k) => <span key={c.code}>{k > 0 && '; '}<i>{c.code}</i>: {c.op}</span>)}
    </p>
  )
}

const codesOf = (...r: (Ref | null | undefined)[]) => r.filter((x): x is Ref => !!x && !!x.code).map((x) => x.code)
const f = (v: number | null | undefined, d: number) => (v == null || !Number.isFinite(v) ? '—' : v.toFixed(d))

export default function SmallMolAnalysisPanel({ structure, cifText, title, onClose, focus, onFocus }: SmallMolAnalysisPanelProps) {
  const t0 = performance.now()
  const a = useMemo(() => analyzeSmallMolecule(structure, cifText), [structure, cifText])
  const ms = useMemo(() => performance.now() - t0, [a]) // eslint-disable-line react-hooks/exhaustive-deps
  const [tab, setTab] = useState<SmTab>('summary')
  const hasCif = { bonds: a.bonds.cif.length > 0, angles: a.angles.cif.length > 0, torsions: a.torsions.cif.length > 0, hbonds: a.hbonds.cif.length > 0 }
  const anyCif = Object.values(hasCif).some(Boolean)
  const [src, setSrc] = useState<Src>(anyCif ? 'cif' : 'computed')
  const [torH, setTorH] = useState(false)
  const [filter, setFilter] = useState('')
  const tabs = (['summary', 'bonds', 'angles', 'torsions', 'hbonds', 'contacts', 'coord', 'hist'] as SmTab[]).filter((t) => t !== 'coord' || a.coordination.length > 0)
  const cur = tabs.includes(tab) ? tab : 'summary'
  const useCif = (k: keyof typeof hasCif) => src === 'cif' && hasCif[k]
  const fl = filter.trim().toLowerCase()
  const match = (...r: (Ref | null | undefined)[]) => !fl || r.some((x) => x && (x.label.toLowerCase().split('^')[0] === fl || x.label.toLowerCase().startsWith(fl)))

  const rows: Record<Exclude<SmTab, 'summary' | 'hist'>, { cols: string[]; rows: Row[]; note?: string }> = useMemo(() => {
    const B = useCif('bonds') ? a.bonds.cif : a.bonds.computed
    const A = useCif('angles') ? a.angles.cif : a.angles.computed
    const T = (useCif('torsions') ? a.torsions.cif : a.torsions.computed).filter((t) => torH || useCif('torsions') || !t.hasH)
    const H = useCif('hbonds') ? a.hbonds.cif : a.hbonds.computed
    return {
      bonds: { cols: ['Atom 1', 'Atom 2', 'Type', 'd (Å)'], rows: B.filter((r) => match(r.a, r.b)).map((r, i) => ({ key: `b${i}`, cells: [<Lbl r={r.a} />, <Lbl r={r.b} />, r.type, <>{r.text}{r.partial ? ' ◐' : ''}</>], focus: r.focus, codes: codesOf(r.a, r.b) })) },
      angles: { cols: ['Atom 1', 'Atom 2 (vertex)', 'Atom 3', 'Type', 'Angle (°)'], rows: A.filter((r) => match(r.a, r.b, r.c)).map((r, i) => ({ key: `a${i}`, cells: [<Lbl r={r.a} />, <Lbl r={r.b} />, <Lbl r={r.c} />, r.type, r.text], focus: r.focus, codes: codesOf(r.a, r.b, r.c) })) },
      torsions: { cols: ['Atom 1', 'Atom 2', 'Atom 3', 'Atom 4', 'Torsion (°)'], rows: T.filter((r) => match(r.a, r.b, r.c, r.d)).map((r, i) => ({ key: `t${i}`, cells: [<Lbl r={r.a} />, <Lbl r={r.b} />, <Lbl r={r.c} />, <Lbl r={r.d} />, r.text], focus: r.focus, codes: codesOf(r.a, r.b, r.c, r.d) })) },
      hbonds: {
        cols: ['D', 'H', 'A', 'D–H (Å)', 'H···A (Å)', 'D···A (Å)', '∠D–H···A (°)'],
        rows: H.filter((r) => match(r.d, r.h, r.a)).map((r, i) => ({ key: `h${i}`, cells: [<Lbl r={r.d} />, r.h ? <Lbl r={r.h} /> : <span className="muted">not modelled</span>, <Lbl r={r.a} />, r.text?.dh ?? f(r.dh, 2), r.text?.ha ?? f(r.ha, 2), r.text?.da ?? f(r.da, 3), r.text?.dha ?? f(r.dha, 0)], focus: r.focus, codes: codesOf(r.d, r.h, r.a) })),
        note: !a.summary.hModelled && !useCif('hbonds') ? 'No H atoms are modelled: N/O···N/O contacts of 2.4–3.2 Å (non-bonded, not 1,3) are listed as possible H-bonds.' : undefined,
      },
      contacts: { cols: ['Atom 1', 'Atom 2', 'd (Å)', 'Σr_vdW (Å)', 'Δ (Å)'], rows: a.contacts.filter((r) => match(r.a, r.b)).map((r, i) => ({ key: `c${i}`, cells: [<Lbl r={r.a} />, <Lbl r={r.b} />, <>{r.d.toFixed(3)}{r.partial ? ' ◐' : ''}</>, r.vdw.toFixed(2), r.delta.toFixed(3)], focus: r.focus, codes: codesOf(r.a, r.b) })) },
      coord: {
        cols: ['Centre', 'CN', 'Polyhedron', 'τ', '⟨d⟩ (Å)', 'Δ (Baur)', 'Ox.', 'BVS'],
        rows: a.coordination.filter((r) => match(r.centre, ...r.ligands.map((l) => l.ref))).map((r, i) => ({
          key: `m${i}`,
          cells: [<Lbl r={r.centre} />, r.cn, r.polyhedron, r.tau ? `${r.tau.name} ${r.tau.v.toFixed(2)}` : '—', r.meanD.toFixed(3), r.baurDelta.toFixed(4), r.ox != null ? `${r.ox > 0 ? '+' : ''}${r.ox}${r.oxSource === 'assumed' ? ' (assumed)' : ''}` : '—', r.bvs != null ? r.bvs.toFixed(2) : <span className="muted" title={r.bvsNote}>n/a</span>],
          focus: r.focus, codes: codesOf(r.centre, ...r.ligands.map((l) => l.ref)),
        })),
      },
    }
  }, [a, src, torH, fl]) // eslint-disable-line react-hooks/exhaustive-deps

  const s = a.summary
  const fileBase = title.replace(/[^A-Za-z0-9_.-]+/g, '_')
  const srcToggle = (k: keyof typeof hasCif) => hasCif[k] ? (
    <label className="sm-src">Source{' '}
      <select value={src} onChange={(e) => setSrc(e.target.value as Src)} data-testid="sm-src">
        <option value="cif">CIF-reported (_geom_*, with s.u.)</option>
        <option value="computed">Computed from coordinates</option>
      </select>
    </label>
  ) : <span className="muted">Computed from coordinates (no _geom_ table in this CIF)</span>

  const tableTab = (k: Exclude<SmTab, 'summary' | 'hist'>, extra?: ReactNode) => (
    <div>
      <div className="ana-sel" role="group">
        {k !== 'contacts' && k !== 'coord' ? srcToggle(k as keyof typeof hasCif) : null}
        {extra}
        <span className="muted">{rows[k].rows.length} rows</span>
      </div>
      {rows[k].note && <p className="muted">{rows[k].note}</p>}
      <Table cols={rows[k].cols} rows={rows[k].rows} focus={focus} onFocus={onFocus} testid={`sm-table-${k}`} />
      <Footnotes rows={rows[k].rows} a={a} />
      {k === 'coord' && <CoordDetail a={a} focus={focus} />}
    </div>
  )

  return (
    <aside className="cif-analysis-drawer sm-analysis" aria-label="Structure analysis" data-testid="sm-analysis-drawer">
      <header className="ana-head">
        <h2>Structure analysis · {title}</h2>
        <span className="ana-head-actions">
          <button type="button" className="btn btn-small" data-testid="sm-csv" onClick={() => downloadCsv(`${fileBase}_structure_analysis.csv`, analysisCsv(a, src))}>CSV</button>
          <button type="button" className="btn btn-small" data-testid="sm-print" onClick={() => printSmReport(title, a, src)}>Printable report</button>
          <button type="button" className="btn btn-small" onClick={onClose} aria-label="Close structure analysis">✕</button>
        </span>
      </header>
      <div className="ana-sel" role="group" aria-label="Filter">
        <label>Atom{' '}<input size={8} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="e.g. O1" data-testid="sm-filter" /></label>
        <span className="muted">{s.nAsu} ASU atoms · {s.ops} operators · computed in {ms.toFixed(0)} ms</span>
        {focus && <button type="button" className="btn btn-small" onClick={() => onFocus(null)}>Clear 3D highlight ({focus.label})</button>}
      </div>
      <nav className="ana-tabs" role="tablist" aria-label="Analysis sections">
        {tabs.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={cur === t} className={`seg${cur === t ? ' is-on' : ''}`} onClick={() => setTab(t)} data-testid={`sm-tab-${t}`}>
            {TAB_LABEL[t]}{t !== 'summary' && t !== 'hist' ? ` (${rows[t].rows.length})` : ''}
          </button>
        ))}
      </nav>
      <div className="ana-body">
        {cur === 'summary' && <SummaryView a={a} />}
        {cur === 'bonds' && tableTab('bonds')}
        {cur === 'angles' && tableTab('angles')}
        {cur === 'torsions' && tableTab('torsions', !useCif('torsions') && <label><input type="checkbox" checked={torH} onChange={(e) => setTorH(e.target.checked)} data-testid="sm-tor-h" /> include H</label>)}
        {cur === 'hbonds' && tableTab('hbonds')}
        {cur === 'contacts' && tableTab('contacts')}
        {cur === 'coord' && tableTab('coord')}
        {cur === 'hist' && <HistView a={a} />}
        <details className="sm-notes">
          <summary>Criteria, caveats &amp; sources</summary>
          <ul>{a.criteria.map((c) => <li key={c}>{c}</li>)}</ul>
          {a.caveats.length > 0 && <><h3>Caveats</h3><ul data-testid="sm-caveats">{a.caveats.map((c) => <li key={c}>{c}</li>)}</ul></>}
          <h3>Sources</h3>
          <ul>{SM_REFERENCES.map((r) => <li key={r.doi}>{r.text} <a href={`https://doi.org/${r.doi}`} target="_blank" rel="noreferrer">doi:{r.doi}</a></li>)}</ul>
          <p className="muted">{BV_TABLE_NOTE}</p>
        </details>
      </div>
    </aside>
  )
}

function SummaryView({ a }: { a: SmallMolAnalysis }) {
  const s = a.summary
  const kv: [string, ReactNode][] = [
    ['Formula (CIF)', s.formulaCif ?? '—'],
    ['Asymmetric-unit contents', s.asuFormula],
    ['Unit-cell contents', s.cellContents],
    ['Z / Z′', `${s.z ?? '—'} / ${s.zPrime != null ? +s.zPrime.toFixed(3) : '—'}`],
    ['Cell volume', `${s.volume.toFixed(2)} Å³`],
    ['Density', <>{s.densityCalc.toFixed(3)} g cm⁻³ computed{s.densityCif != null ? ` · ${s.densityCif} CIF` : ''}{!s.hModelled ? <span className="muted"> (no H modelled)</span> : null}</>],
    ['Volume per non-H atom', s.vPerNonH != null ? <>{s.vPerNonH.toFixed(1)} Å³ <span className="muted">(organic crystals ≈ 18 Å³, Kempster–Lipson)</span></> : '—'],
    ['Packing coefficient', s.packing != null ? <>{s.packing.toFixed(3)} <span className="muted">(Kitaigorodskii; typical 0.65–0.77)</span></> : <span className="muted">{s.packingNote}</span>],
    ['Void (1.2 Å probe)', s.voidPct != null ? <>{s.voidPct.toFixed(1)} % <span className="muted">{s.packingNote}</span></> : '—'],
    ['Molecules / fragments in cell (viewer)', String(s.moleculesInCell)],
  ]
  const dimName = ['discrete', '1-D chain', '2-D layer', '3-D framework']
  return (
    <div data-testid="sm-summary">
      <table className="ana-table sm-kv"><tbody>{kv.map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>)}</tbody></table>
      <h3>Connected components of the asymmetric unit</h3>
      <table className="ana-table"><thead><tr><th>#</th><th>Contents</th><th>Atoms</th><th>Connectivity</th></tr></thead>
        <tbody>{s.components.map((c, k) => <tr key={k}><td>{k + 1}</td><td>{c.formula}</td><td className="num">{c.atoms.length}</td><td>{dimName[c.extended]}</td></tr>)}</tbody></table>
      <p className="muted">Connectivity follows covalent bonds (and CSD-style metal–ligand bonds) through symmetry: a fragment that reaches a lattice-translated copy of itself is polymeric (chain, layer or framework).</p>
    </div>
  )
}

function CoordDetail({ a, focus }: { a: SmallMolAnalysis; focus: Focus | null }) {
  const c = a.coordination.find((r) => r.focus.key === focus?.key)
  if (!c) return <p className="muted">Click a centre to list its ligands and bond valences.</p>
  return (
    <div className="sm-coord-detail">
      <h3>{c.centre.label.replace('^', '')} — {c.cn} ligands</h3>
      <table className="ana-table"><thead><tr><th>Ligand</th><th>d (Å)</th><th>s (v.u.)</th></tr></thead>
        <tbody>{c.ligands.map((l, k) => <tr key={k}><td><Lbl r={l.ref} /></td><td className="num">{l.d.toFixed(3)}</td><td className="num">{l.s != null ? l.s.toFixed(3) : '—'}</td></tr>)}</tbody></table>
      {c.bvsNote && <p className="muted">{c.bvsNote}</p>}
    </div>
  )
}

function HistView({ a }: { a: SmallMolAnalysis }) {
  const bh = a.bondHist.slice(0, 8), ah = a.angleHist.slice(0, 8)
  const rng = (v: number[], pad: number, step: number): [number, number] => {
    const lo = Math.floor((Math.min(...v) - pad) / step) * step, hi = Math.ceil((Math.max(...v) + pad) / step) * step
    return [lo, hi > lo ? hi : lo + step]
  }
  return (
    <div>
      <h3>Bond lengths by element pair (computed)</h3>
      <div className="ana-plots">{bh.map((h) => <Histogram key={h.key} title={`${h.key} (n=${h.values.length}, mean ${(h.values.reduce((p, q) => p + q, 0) / h.values.length).toFixed(3)} Å)`} name={`bond-${h.key}`} values={h.values} range={rng(h.values, 0.03, 0.1)} bin={0.01} xl="d (Å)" />)}</div>
      <h3>Bond angles by element triple (computed)</h3>
      <div className="ana-plots">{ah.map((h) => <Histogram key={h.key} title={`${h.key} (n=${h.values.length}, mean ${(h.values.reduce((p, q) => p + q, 0) / h.values.length).toFixed(1)}°)`} name={`angle-${h.key}`} values={h.values} range={rng(h.values, 2, 10)} bin={1} xl="angle (°)" />)}</div>
      {(a.bondHist.length > 8 || a.angleHist.length > 8) && <p className="muted">Showing the 8 most populated types; the CSV lists every row.</p>}
    </div>
  )
}

function esc(s: string) { return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!) }
const lab = (r: Ref | null | undefined) => (r ? esc(r.label).replace(/\^(\w+)$/, '<sup>$1</sup>') : '—')

export function printSmReport(title: string, a: SmallMolAnalysis, src: Src) {
  const pick = <T,>(x: { computed: T[]; cif: T[] }) => (src === 'cif' && x.cif.length ? { rows: x.cif, s: 'CIF-reported' } : { rows: x.computed, s: 'computed' })
  const tbl = (t: string, cols: string[], rows: string[][]) => rows.length ? `<h2>${esc(t)}</h2><table><thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((v) => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table>` : ''
  const s = a.summary
  const B = pick(a.bonds), A = pick(a.angles), T = pick(a.torsions), H = pick(a.hbonds)
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} structure analysis</title><style>body{font:12px system-ui,sans-serif;margin:24px;color:#111}table{border-collapse:collapse;margin:6px 0 16px}td,th{border:1px solid #ccc;padding:2px 6px;text-align:right}th{background:#f1f5f9}td:first-child,th:first-child{text-align:left}svg{width:300px;height:auto;margin:4px;border:1px solid #e2e8f0}h1{font-size:18px}h2{font-size:14px;margin-top:18px}</style></head><body>
<h1>Structure analysis — ${esc(title)}</h1><p>${new Date().toISOString().slice(0, 10)} · crystalspacegroups.com</p>
${tbl('Summary', ['Quantity', 'Value'], [
    ['Formula (CIF)', esc(s.formulaCif ?? '—')], ['ASU contents', esc(s.asuFormula)], ['Cell contents', esc(s.cellContents)], ['Z / Z′', `${s.z ?? '—'} / ${s.zPrime ?? '—'}`],
    ['V (Å³)', s.volume.toFixed(2)], ['Density calc / CIF (g cm⁻³)', `${s.densityCalc.toFixed(3)} / ${s.densityCif ?? '—'}`], ['V per non-H atom (Å³)', s.vPerNonH?.toFixed(1) ?? '—'],
    ['Packing coefficient', s.packing?.toFixed(3) ?? esc(s.packingNote ?? '—')], ['Void % (1.2 Å probe)', s.voidPct?.toFixed(1) ?? '—'],
    ['ASU components', esc(s.components.map((c) => `${c.formula}${c.extended ? ` (${c.extended}-D polymeric)` : ''}`).join('; '))],
  ])}
${tbl(`Bonds (${B.s})`, ['Atom 1', 'Atom 2', 'd (Å)'], B.rows.map((r) => [lab(r.a), lab(r.b), esc(r.text)]))}
${tbl(`Angles (${A.s})`, ['Atom 1', 'Atom 2', 'Atom 3', 'Angle (°)'], A.rows.map((r) => [lab(r.a), lab(r.b), lab(r.c), esc(r.text)]))}
${tbl(`Torsions (${T.s}${T.s === 'computed' ? ', non-H' : ''})`, ['Atom 1', 'Atom 2', 'Atom 3', 'Atom 4', 'Torsion (°)'], T.rows.filter((r) => T.s !== 'computed' || !r.hasH).map((r) => [lab(r.a), lab(r.b), lab(r.c), lab(r.d), esc(r.text)]))}
${tbl(`Hydrogen bonds (${H.s})`, ['D', 'H', 'A', 'D–H', 'H···A', 'D···A', '∠DHA'], H.rows.map((r) => [lab(r.d), lab(r.h), lab(r.a), esc(r.text?.dh ?? f(r.dh, 2)), esc(r.text?.ha ?? f(r.ha, 2)), esc(r.text?.da ?? f(r.da, 3)), esc(r.text?.dha ?? f(r.dha, 0))]))}
${tbl('Short contacts (d < Σ Bondi r_vdW)', ['Atom 1', 'Atom 2', 'd (Å)', 'Σr_vdW', 'Δ'], a.contacts.map((r) => [lab(r.a), lab(r.b), r.d.toFixed(3), r.vdw.toFixed(2), r.delta.toFixed(3)]))}
${tbl('Coordination and bond-valence sums', ['Centre', 'CN', 'Polyhedron', 'τ', '⟨d⟩', 'Δ', 'Ox.', 'BVS', 'Ligands'], a.coordination.map((r) => [lab(r.centre), String(r.cn), esc(r.polyhedron), r.tau ? `${r.tau.name} ${r.tau.v.toFixed(2)}` : '', r.meanD.toFixed(3), r.baurDelta.toFixed(4), r.ox != null ? `${r.ox}${r.oxSource === 'assumed' ? ' (assumed)' : ''}` : '', r.bvs?.toFixed(2) ?? 'n/a', r.ligands.map((l) => `${lab(l.ref)} ${l.d.toFixed(3)}`).join(', ')]))}
<h2>Symmetry codes</h2><p>${a.symCodes.map((c) => `<i>${c.code}</i>: ${esc(c.op)}`).join('; ') || 'none'}</p>
<h2>Criteria</h2><ul>${a.criteria.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
<h2>Caveats</h2><ul>${a.caveats.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
<h2>Sources</h2><ul>${SM_REFERENCES.map((r) => `<li>${esc(r.text)} doi:${r.doi}</li>`).join('')}</ul>
<script>setTimeout(()=>print(),300)</script></body></html>`
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
}
