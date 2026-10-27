import { useCallback, useMemo, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import CifStructureScene from '../components/CifStructureScene'
import { expandStructure } from '../data/cif/expandStructure'
import { parseCif } from '../data/cif/parseCif'
import { operatorColor } from '../data/cif/operatorColors'
import type { ExpandedStructure } from '../data/cif/types'
import { isImproper } from '../data/math'

type Visibility = 'all' | 'selected' | 'asymmetric'

const SAMPLE_URL = `${import.meta.env.BASE_URL}samples/acetic_p21c.cif`

export default function CifExplorerPage() {
  const [structure, setStructure] = useState<ExpandedStructure | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedOp, setSelectedOp] = useState(1)
  const [visibility, setVisibility] = useState<Visibility>('all')
  const [resetToken, setResetToken] = useState(0)
  const [busy, setBusy] = useState(false)

  const loadText = useCallback((text: string, name: string) => {
    setBusy(true)
    setError(null)
    try {
      const parsed = parseCif(text)
      const expanded = expandStructure(parsed)
      setStructure(expanded)
      setFileName(name)
      setSelectedOp(1)
      setResetToken((t) => t + 1)
      if (!expanded.atoms.length) {
        setError('Parsed CIF but found no atoms to display.')
      }
    } catch (e) {
      setStructure(null)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [])

  const onFile = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const text = await file.text()
      loadText(text, file.name)
      e.target.value = ''
    },
    [loadText],
  )

  const loadSample = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(SAMPLE_URL)
      if (!res.ok) throw new Error(`Could not load sample (${res.status})`)
      const text = await res.text()
      loadText(text, 'acetic_p21c.cif (sample)')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }, [loadText])

  const selected = useMemo(() => {
    if (!structure) return null
    return (
      structure.operators.find((o) => o.index === selectedOp) ??
      structure.operators[0] ??
      null
    )
  }, [structure, selectedOp])

  const copyCount = structure
    ? new Set(structure.atoms.map((a) => a.opIndex)).size
    : 0

  return (
    <div className="app layout-demo cif-explorer">
      <aside className="panel">
        <header className="panel-header">
          <Link to="/" className="back-link">
            ← All space groups
          </Link>
          <p className="eyebrow">Application</p>
          <h1>CIF symmetry map</h1>
          <p className="blurb">
            Upload a crystal from CSD or COD as CIF. Each symmetry copy of the
            asymmetric unit is colored by the operator that generated it — so
            you can see how molecules are related.
          </p>
        </header>

        <section className="seed-box cif-upload">
          <h2>Upload · .cif</h2>
          <label className="cif-file-label btn btn-primary">
            Choose CIF file
            <input
              type="file"
              accept=".cif,.mcif,chemical/x-cif,text/plain"
              onChange={onFile}
              disabled={busy}
            />
          </label>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={loadSample}
            disabled={busy}
          >
            Load teaching sample (P21/c)
          </button>
          {fileName && (
            <p className="muted cif-filename">
              Loaded: <strong>{fileName}</strong>
            </p>
          )}
          {error && <p className="cif-error">{error}</p>}
          <p className="hint">
            Runs entirely in your browser. No data is uploaded to a server. Fair
            use of your own CSD/COD exports — we do not scrape databases.
          </p>
        </section>

        {structure && (
          <>
            <section className="seed-box">
              <h2>Structure</h2>
              <dl className="meta-grid">
                <div>
                  <dt>Space group</dt>
                  <dd>
                    {structure.spaceGroupNumber != null ? (
                      <Link to={`/sg/${structure.spaceGroupNumber}`}>
                        {structure.spaceGroupNumber}
                        {structure.spaceGroupName
                          ? ` · ${structure.spaceGroupName}`
                          : ''}{' '}
                        ↗
                      </Link>
                    ) : (
                      structure.spaceGroupName ?? 'unknown'
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Cell</dt>
                  <dd>
                    {structure.cell.a.toFixed(2)} × {structure.cell.b.toFixed(2)}{' '}
                    × {structure.cell.c.toFixed(2)} Å
                    {structure.cell.betaDeg && structure.cell.betaDeg !== 90
                      ? ` · β ${structure.cell.betaDeg}°`
                      : ''}
                  </dd>
                </div>
                <div>
                  <dt>AU atoms</dt>
                  <dd>{structure.asymmetric.length}</dd>
                </div>
                <div>
                  <dt>Copies</dt>
                  <dd>
                    {copyCount} · {structure.atoms.length} sites
                  </dd>
                </div>
              </dl>
              {structure.warnings.length > 0 && (
                <ul className="cif-warnings">
                  {structure.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className="ops">
              <h2>Symmetry operators</h2>
              <p className="hint">
                Click an operator to emphasize that molecule copy (emissive tint
                + bonds). Op 1 is the asymmetric unit (BASE).
              </p>
              <ul className="op-list">
                {structure.operators.map((op) => {
                  const active = op.index === selectedOp
                  const color = operatorColor(op.index)
                  return (
                    <li key={op.index}>
                      <button
                        type="button"
                        className={`op-row${active ? ' active' : ''}${op.index === 1 ? ' is-base' : ''}`}
                        style={{ ['--op-color' as string]: color }}
                        onClick={() => setSelectedOp(op.index)}
                        aria-pressed={active}
                      >
                        <span className="op-index">{op.index}</span>
                        <span className="op-swatch" title={op.label} />
                        <span className="op-body">
                          <span className="op-triplet">{op.triplet}</span>
                          <span className="op-label">
                            {op.label}
                            {op.index === 1 ? ' · BASE' : ''}
                            {active && op.index !== 1 ? ' · IMAGE' : ''}
                            {' · '}
                            {isImproper(op.R) ? 'opposite hand' : 'same hand'}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>

            {selected && (
              <section className="matrix-section">
                <h2>Selected · op {selected.index}</h2>
                <p className="hint">
                  {selected.triplet} · {selected.seitz}
                </p>
              </section>
            )}
          </>
        )}
      </aside>

      <main className="viewport">
        <div className="viewport-toolbar">
          <div className="legend-stack">
            <div className="legend class-legend">
              {structure
                ? structure.operators.slice(0, 12).map((op) => (
                    <span key={op.index} className="legend-item">
                      <span
                        className="swatch"
                        style={{ background: operatorColor(op.index) }}
                      />
                      op {op.index}
                      {op.index === 1 ? ' (AU)' : ''}
                    </span>
                  ))
                : (
                  <span className="legend-item muted">
                    Upload a CIF to map symmetry copies
                  </span>
                )}
              {structure && structure.operators.length > 12 && (
                <span className="legend-item muted">
                  +{structure.operators.length - 12} more
                </span>
              )}
            </div>
            <div className="legend chirality">
              Ball color ≈ element · emissive tint ≈ operator · bonds stay
              within each copy
            </div>
          </div>
          <div className="toolbar-actions">
            <div className="segmented" role="group" aria-label="Copy visibility">
              <button
                type="button"
                className={visibility === 'all' ? 'seg active' : 'seg'}
                onClick={() => setVisibility('all')}
              >
                All copies
              </button>
              <button
                type="button"
                className={visibility === 'selected' ? 'seg active' : 'seg'}
                onClick={() => setVisibility('selected')}
              >
                BASE + IMAGE
              </button>
              <button
                type="button"
                className={visibility === 'asymmetric' ? 'seg active' : 'seg'}
                onClick={() => setVisibility('asymmetric')}
              >
                AU only
              </button>
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => setResetToken((t) => t + 1)}
              disabled={!structure}
            >
              Reset view
            </button>
          </div>
        </div>

        <div className="viewport-body cif-viewport-body">
          <div className="canvas-wrap">
            {structure ? (
              <CifStructureScene
                structure={structure}
                selectedOp={selectedOp}
                visibility={visibility}
                resetToken={resetToken}
              />
            ) : (
              <div className="cif-empty">
                <p>
                  Drop in a <code>.cif</code> from CSD or COD, or load the
                  teaching sample, to see each symmetry-related molecule copy.
                </p>
              </div>
            )}
          </div>
        </div>

        <footer className="viewport-footer">
          CIF explorer · client-side parse · operators from ITA when the space
          group number is known, otherwise from the CIF loop
          {structure?.spaceGroupNumber != null
            ? ` · teaching demo: /sg/${structure.spaceGroupNumber}`
            : ''}
        </footer>
      </main>
    </div>
  )
}
