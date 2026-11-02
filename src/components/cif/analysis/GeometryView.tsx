/** "Bonds & angles" tab: distributions by type, Z vs literature targets, outliers. Single or overlay. */
import { useMemo, useState, type ReactNode } from 'react'
import { GEOM_GROUPS, resLabel, summarizeGeom, type GeomGroup, type GeomItem } from '../../../data/pdb/analysis'
import { Histogram, OverlayHistogram } from './plots'

export interface GeomSeries { key: string; label: string; color: string; items: GeomItem[]; idOf: (resKey: string) => string }

const RANGE: Record<string, [number, number]> = { 'C–C': [1.2, 1.65], 'C–N': [1.2, 1.6], 'C–O': [1.15, 1.55], 'C–S': [1.65, 1.95], 'S–S (disulfide)': [1.9, 2.2] }
function rangeOf(items: GeomItem[], kind: GeomItem['kind'], ideal: number | null, type: string): { range: [number, number]; bin: number } {
  if (kind === 'torsion') return { range: [-180, 180], bin: 10 }
  if (kind === 'angle') {
    const c = ideal ?? items.reduce((s, x) => s + x.value, 0) / Math.max(1, items.length)
    return { range: [Math.floor(c - 15), Math.ceil(c + 15)], bin: 1 }
  }
  if (RANGE[type]) return { range: RANGE[type]!, bin: 0.01 }
  if (ideal != null) return { range: [+(ideal - 0.15).toFixed(2), +(ideal + 0.15).toFixed(2)], bin: 0.01 }
  const v = items.map((x) => x.value)
  return { range: [Math.floor(Math.min(...v, 1) * 10) / 10, Math.ceil(Math.max(...v, 1.2) * 10) / 10], bin: 0.02 }
}

export function GeometryView({ series, pick, sel, csv, showLig, onShowLig, normalize, normBox }: {
  series: GeomSeries[]; pick: (id: string) => void; sel: string | null; csv: ReactNode
  showLig: boolean; onShowLig: (b: boolean) => void
  /** Overlay mode only. */
  normalize?: boolean; normBox?: ReactNode
}) {
  const overlay = series.length > 1
  const present = GEOM_GROUPS.filter((g) => g.id === 'lig-bond' ? showLig && series.some((s) => s.items.some((x) => x.group === g.id)) : series.some((s) => s.items.some((x) => x.group === g.id)))
  const [grp, setGrp] = useState<GeomGroup>('pbb-bond')
  const cur = present.find((g) => g.id === grp)?.id ?? present[0]?.id
  const sums = useMemo(() => series.map((s) => summarizeGeom(s.items.filter((x) => x.group === cur))), [series, cur])
  const types = [...new Set(sums.flatMap((l) => l.map((x) => x.type)))]
  const outliers = series.flatMap((s) => s.items.filter((x) => x.z != null && Math.abs(x.z) > 4).map((x) => ({ s, x })))
    .sort((a, b) => Math.abs(b.x.z!) - Math.abs(a.x.z!))
  const unit = (k: GeomItem['kind']) => (k === 'bond' ? 'Å' : '°')
  const fmtV = (v: number | null, k: GeomItem['kind']) => (v == null ? '—' : v.toFixed(k === 'bond' ? 3 : 1))
  return (
    <>
      <div className="ana-row" role="group" aria-label="Bond / angle type group">
        {present.map((g) => (
          <button key={g.id} type="button" className={`seg${g.id === cur ? ' is-on' : ''}`} aria-pressed={g.id === cur} onClick={() => setGrp(g.id)} data-testid={`geom-grp-${g.id}`}>{g.label}</button>
        ))}
        <label className="ana-norm" title="Adds a distance-based (covalent radii + 0.4 Å) element-pair distribution for ligands; no topology or targets">
          <input type="checkbox" checked={showLig} onChange={(e) => onShowLig(e.target.checked)} data-testid="geom-lig-toggle" /> Ligands (distance-based)
        </label>
        {normBox}{csv}
      </div>
      {!present.length && <p className="muted">No bonds found for this selection.</p>}
      {cur === 'lig-bond' && <p className="muted ana-note"><strong>Distance-based:</strong> ligand bonds are any intra-ligand atom pair closer than r<sub>cov</sub>(A)+r<sub>cov</sub>(B)+0.4 Å (Cordero et al. 2008 radii), grouped by element pair. No ideal values or Z-scores.</p>}
      <div className="ana-plots">
        {types.map((t) => {
          const all = series.flatMap((s) => s.items.filter((x) => x.group === cur && x.type === t))
          const sm = sums.flatMap((l) => l.filter((x) => x.type === t))[0]!
          // Mixed targets (e.g. Gly/Pro-specific backbone values): mark the most common (general) target.
          const cnt = new Map<string, { mu: number; sd: number | null; n: number }>()
          for (const x of all) if (x.ideal != null) { const k = `${x.ideal}|${x.sigma}`; const c = cnt.get(k) ?? { mu: x.ideal, sd: x.sigma, n: 0 }; c.n++; cnt.set(k, c) }
          const modal = [...cnt.values()].sort((p, q) => q.n - p.n)[0]
          const mixed = cnt.size > 1
          const ideal = modal && !(mixed && cur === 'psc-bond') ? { mu: modal.mu, sd: modal.sd } : undefined
          const { range, bin } = rangeOf(all, sm.kind, modal?.mu ?? null, t)
          const name = `geom-${cur}-${t}`.replace(/[^A-Za-z0-9-]+/g, '_')
          const xl = `${t} (${unit(sm.kind)})`
          const info = ideal ? `Dashed line / band: ${mixed ? 'most common ' : ''}target ${fmtV(ideal.mu, sm.kind)} ± ${ideal.sd} ${unit(sm.kind)}${mixed ? ' (residue-specific targets, e.g. Gly/Pro, used for Z)' : ''}` : mixed ? 'Residue-specific targets (Z computed per bond)' : 'No literature target: distribution only'
          return overlay
            ? <OverlayHistogram key={t} name={name} title={t} xl={xl} range={range} bin={bin} normalize={!!normalize} ideal={ideal} info={info}
              groups={series.map((s) => ({ key: s.key, label: s.label, color: s.color, values: s.items.filter((x) => x.group === cur && x.type === t).map((x) => x.value) }))} />
            : <Histogram key={t} name={name} title={t} xl={xl} range={range} bin={bin} ideal={ideal} info={info} values={all.map((x) => x.value)} />
        })}
      </div>
      <div className="ana-table-wrap">
        <table className="ana-table" data-testid="geom-summary">
          <thead><tr>{overlay && <th scope="col">Structure</th>}<th scope="col">Type</th><th scope="col">n</th><th scope="col">Mean</th><th scope="col">SD</th><th scope="col">Target ± σ</th><th scope="col">RMS-Z</th><th scope="col">|Z|&gt;4</th></tr></thead>
          <tbody>
            {series.flatMap((s, i) => sums[i]!.map((x) => (
              <tr key={s.key + x.type}>
                {overlay && <td><i className="ana-swatch" style={{ background: s.color }} aria-hidden="true" />{s.label.split(' · ')[0]}</td>}
                <td>{x.type}</td><td className="num">{x.n}</td><td className="num">{fmtV(x.mean, x.kind)}</td><td className="num">{fmtV(x.sd, x.kind)}</td>
                <td className="num">{x.ideal != null ? `${fmtV(x.ideal, x.kind)} ± ${x.sigma}` : x.nZ ? 'per residue' : '—'}</td>
                <td className="num">{x.rmsZ == null ? '—' : x.rmsZ.toFixed(2)}</td><td className="num">{x.nZ ? x.outliers : '—'}</td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
      <h3 className="ana-h3">Outliers |Z| &gt; 4 (all types){outliers.length ? ` — ${outliers.length}` : ''}</h3>
      {!outliers.length ? <p className="muted">None.</p> : (
        <div className="ana-table-wrap">
          <table className="ana-table" data-testid="geom-outliers">
            <thead><tr>{overlay && <th scope="col">Structure</th>}<th scope="col">Residue</th><th scope="col">Type</th><th scope="col">Atoms</th><th scope="col">Observed</th><th scope="col">Target</th><th scope="col">Z</th></tr></thead>
            <tbody>
              {outliers.slice(0, 300).map(({ s, x }, k) => {
                const id = s.idOf(x.res.key)
                return (
                  <tr key={k} className={sel === id ? 'is-sel' : undefined} tabIndex={0} onClick={() => pick(id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(id) } }}>
                    {overlay && <td><i className="ana-swatch" style={{ background: s.color }} aria-hidden="true" />{s.label.split(' · ')[0]}</td>}
                    <td>{resLabel(x.res)}</td><td>{x.type}</td><td>{x.atoms}</td>
                    <td className="num">{fmtV(x.value, x.kind)}</td><td className="num">{fmtV(x.ideal, x.kind)} ± {x.sigma}</td><td className="num">{x.z!.toFixed(1)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <details className="ana-defs" data-testid="geom-defs">
        <summary>Definitions &amp; sources</summary>
        <p>Bonds come from residue topology, not distance guessing: the Engh &amp; Huber per-residue bond list, plus the peptide C–N and phosphodiester O3′–P links between consecutive residues of a chain (a link longer than 2.0 Å is treated as a chain break). Disulfides are SG–SG pairs &lt; 2.5 Å. Coordinates are model 1, first alternate location only (altlocs are never mixed). Z = (observed − target)/σ; RMS-Z = √(mean Z²); |Z| &gt; 4 is listed as an outlier.</p>
        <ul>
          <li>Proteins: R. A. Engh &amp; R. Huber, “Structure quality and target parameters”, <i>International Tables for Crystallography</i> Vol. F, ch. 18.3 (2001; <a href="https://doi.org/10.1107/97809553602060000857" target="_blank" rel="noreferrer">doi:10.1107/97809553602060000857</a>), per-residue values; peptide-link values as tabulated by Berkholz et al. 2009. Original set: Engh &amp; Huber 1991, <i>Acta Cryst.</i> A47, 392 (<a href="https://doi.org/10.1107/S0108767391001071" target="_blank" rel="noreferrer">doi</a>).</li>
          <li>Nucleic acids (sugar–phosphate backbone): Gelbin et al. 1996, <i>J. Am. Chem. Soc.</i> 118, 519 (<a href="https://doi.org/10.1021/ja9528846" target="_blank" rel="noreferrer">doi</a>); Parkinson et al. 1996, <i>Acta Cryst.</i> D52, 57 (<a href="https://doi.org/10.1107/S0907444995011115" target="_blank" rel="noreferrer">doi</a>). Deoxyribose targets for DA/DC/DG/DT, ribose otherwise. Base geometry (Gilski et al. 2019, <a href="https://doi.org/10.1107/S2052520619002002" target="_blank" rel="noreferrer">doi</a>) is not scored here.</li>
          <li>Not Z-scored: disulfide S–S, C–N–CA when the next residue is Pro, modified residues, ligands.</li>
        </ul>
      </details>
    </>
  )
}
