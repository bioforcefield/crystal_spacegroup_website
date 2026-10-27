import {
  useCallback,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import { Link } from 'react-router-dom'
import CifStructureScene, {
  CellParamsBadge,
  type CifPlacementMode,
  type CifVisibility,
} from '../components/CifStructureScene'
import {
  countDemoElements,
  elementsDemoForStructure,
} from '../data/cif/demoWithCifCell'
import { expandStructure } from '../data/cif/expandStructure'
import {
  CorsBlockedError,
  CsdManualError,
  fetchRemoteCif,
  NotFoundError,
} from '../data/cif/fetchRemoteCif'
import { parseCif } from '../data/cif/parseCif'
import { operatorColor } from '../data/cif/operatorColors'
import {
  csdAccessStructuresUrl,
  parseStructureCode,
} from '../data/cif/structureCode'
import type { ExpandedStructure } from '../data/cif/types'
import { isImproper } from '../data/math'

const SAMPLE_URL = `${import.meta.env.BASE_URL}samples/acetic_p21c.cif`

export default function CifExplorerPage() {
  const [structure, setStructure] = useState<ExpandedStructure | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedOp, setSelectedOp] = useState(1)
  const [visibility, setVisibility] = useState<CifVisibility>('molecules')
  const [placementMode, setPlacementMode] =
    useState<CifPlacementMode>('nearest')
  const [showSymmetryElements, setShowSymmetryElements] = useState(true)
  const [resetToken, setResetToken] = useState(0)
  const [busy, setBusy] = useState(false)
  const [codeInput, setCodeInput] = useState('1100303')
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [remoteHint, setRemoteHint] = useState<string | null>(null)
  const [remoteLink, setRemoteLink] = useState<string | null>(null)

  const loadText = useCallback((text: string, name: string) => {
    setBusy(true)
    setError(null)
    setRemoteHint(null)
    setRemoteLink(null)
    try {
      const parsed = parseCif(text)
      const expanded = expandStructure(parsed)
      setStructure(expanded)
      setFileName(name)
      setSelectedOp(1)
      setVisibility('molecules')
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

  const loadByCode = useCallback(async () => {
    const parsed = parseStructureCode(codeInput)
    if (!parsed.ok) {
      setError(parsed.error)
      setRemoteHint(null)
      setRemoteLink(null)
      return
    }
    setBusy(true)
    setError(null)
    setRemoteHint(null)
    setRemoteLink(null)
    try {
      if (parsed.code.kind === 'csd') {
        const url = csdAccessStructuresUrl(parsed.code.refcode)
        setRemoteLink(url)
        setRemoteHint(
          `CSD ${parsed.code.refcode}: CCDC has no free anonymous CIF stream. Open Access Structures, accept terms, download the CIF, then upload or paste it here.`,
        )
        setPasteOpen(true)
        setError(
          `CSD ${parsed.code.refcode} cannot be streamed from this static site (CCDC license). Use Access Structures → download → upload/paste.`,
        )
        return
      }
      const remote = await fetchRemoteCif(parsed.code.id)
      loadText(remote.text, remote.label)
    } catch (e) {
      if (e instanceof CsdManualError) {
        setRemoteLink(e.accessUrl)
        setRemoteHint(e.message)
        setPasteOpen(true)
        setError(e.message)
      } else if (e instanceof CorsBlockedError) {
        setRemoteLink(e.codUrl)
        setRemoteHint(
          `COD ${e.id} is public, but the browser blocked a direct fetch (no CORS on crystallography.net). Open the CIF, copy all, paste below — or upload the saved file. Local vite/preview can use /cod-proxy.`,
        )
        setPasteOpen(true)
        setError(e.message)
      } else if (e instanceof NotFoundError) {
        setError(e.message)
      } else {
        setError(e instanceof Error ? e.message : String(e))
      }
    } finally {
      setBusy(false)
    }
  }, [codeInput, loadText])

  const loadPaste = useCallback(() => {
    if (!pasteText.trim()) {
      setError('Paste CIF text first.')
      return
    }
    const guess = parseStructureCode(codeInput)
    const name =
      guess.ok ? `${guess.code.display} (pasted)` : 'pasted.cif'
    loadText(pasteText, name)
  }, [pasteText, codeInput, loadText])

  const selected = useMemo(() => {
    if (!structure) return null
    return (
      structure.operators.find((o) => o.index === selectedOp) ??
      structure.operators[0] ??
      null
    )
  }, [structure, selectedOp])

  const moleculesForOp = useMemo(() => {
    if (!structure) return new Map<number, number>()
    const m = new Map<number, number>()
    for (let id = 0; id < structure.moleculeCount; id++) {
      const op = structure.moleculeOpIndex[id]!
      m.set(op, (m.get(op) ?? 0) + 1)
    }
    return m
  }, [structure])

  /** Element overlays + Near targets — same operators as the expanded structure. */
  const elementDemo = useMemo(() => {
    if (!structure) return null
    return elementsDemoForStructure(structure) ?? null
  }, [structure])

  const elementCount = elementDemo ? countDemoElements(elementDemo) : 0
  const canShowElements = elementDemo != null && elementCount > 0

  const atomCountForOp = useCallback(
    (opIndex: number) =>
      structure ? structure.atoms.filter((a) => a.opIndex === opIndex).length : 0,
    [structure],
  )

  const onOpKeyDown = useCallback(
    (e: KeyboardEvent<HTMLUListElement>) => {
      if (!structure?.operators.length) return
      const ops = structure.operators
      const idx = ops.findIndex((o) => o.index === selectedOp)
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        const next = ops[(idx + 1) % ops.length]!
        setSelectedOp(next.index)
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        const next = ops[(idx - 1 + ops.length) % ops.length]!
        setSelectedOp(next.index)
      } else if (e.key === 'Home') {
        e.preventDefault()
        setSelectedOp(ops[0]!.index)
      } else if (e.key === 'End') {
        e.preventDefault()
        setSelectedOp(ops[ops.length - 1]!.index)
      }
    },
    [structure, selectedOp],
  )

  return (
    <div className="app layout-demo cif-explorer">
      <aside className="panel">
        <header className="panel-header">
          <div className="panel-nav-row">
            <Link to="/" className="back-link">
              ← All space groups
            </Link>
            <Link to="/sg/14" className="back-link cif-jump">
              Try P21/c
            </Link>
          </div>
          <p className="eyebrow">Application</p>
          <h1>CIF symmetry map</h1>
          <p className="blurb">
            Load a COD code, paste/upload a CSD or COD CIF, and explore intact
            molecules colored by the symmetry operator that generated each
            copy. Lattice a/b/c (and angles) label the unit-cell box.
          </p>
        </header>

        <section className="seed-box cif-upload">
          <h2>Load by code · COD / CSD</h2>
          <div className="cif-code-row">
            <input
              type="text"
              className="cif-code-input"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void loadByCode()
                }
              }}
              placeholder="1100303 or ACETAC01"
              aria-label="COD or CSD structure code"
              disabled={busy}
              autoCapitalize="characters"
              spellCheck={false}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void loadByCode()}
              disabled={busy}
            >
              Load
            </button>
          </div>
          <p className="hint">
            <strong>COD</strong> (e.g. <button type="button" className="linkish" onClick={() => setCodeInput('1100303')}>1100303</button>
            ): streams when same-origin cache/proxy allows; curated sample is
            bundled. Direct crystallography.net fetch may be CORS-blocked on
            GitHub Pages — then open the CIF and paste.
            <br />
            <strong>CSD</strong> (e.g. ACETAC01): no free anonymous API —
            download via{' '}
            <a
              href="https://www.ccdc.cam.ac.uk/structures/"
              target="_blank"
              rel="noreferrer"
            >
              CCDC Access Structures
            </a>
            , then upload/paste. We do not scrape CSD.
          </p>

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
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setPasteOpen((o) => !o)}
          >
            {pasteOpen ? 'Hide paste CIF' : 'Paste CIF text'}
          </button>
          {pasteOpen && (
            <div className="cif-paste">
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={8}
                placeholder="Paste CIF contents here…"
                aria-label="Paste CIF text"
                spellCheck={false}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={loadPaste}
                disabled={busy}
              >
                Parse pasted CIF
              </button>
            </div>
          )}
          {remoteHint && (
            <p className="cif-remote-hint">
              {remoteHint}
              {remoteLink && (
                <>
                  {' '}
                  <a href={remoteLink} target="_blank" rel="noreferrer">
                    Open source ↗
                  </a>
                </>
              )}
            </p>
          )}
          {fileName && (
            <p className="muted cif-filename">
              Loaded: <strong>{fileName}</strong>
            </p>
          )}
          {error && <p className="cif-error">{error}</p>}
          <p className="hint">
            Parsing runs in your browser — CIF text is not uploaded to our
            servers. COD data are public domain; CSD downloads follow CCDC
            terms on their site.
          </p>
        </section>

        {structure && (
          <>
            <section className="seed-box">
              <h2>Structure</h2>
              {(structure.metadata?.name || structure.metadata?.formula) && (
                <p className="cif-struct-name" title={structure.metadata.name ?? structure.metadata.formula}>
                  {structure.metadata.name ?? structure.metadata.formula}
                  {structure.metadata.name && structure.metadata.formula && (
                    <span className="cif-formula"> · {structure.metadata.formula}</span>
                  )}
                </p>
              )}
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
                {structure.metadata?.zPrime != null && (
                  <div>
                    <dt>Z′</dt>
                    <dd>
                      {structure.metadata.zPrime}
                      {structure.metadata.z != null ? ` (Z = ${structure.metadata.z})` : ''}
                      {structure.metadata.zPrimeSource === 'computed' ? ' · from Z/ops' : ''}
                    </dd>
                  </div>
                )}
                {structure.metadata?.resolutionA != null && (
                  <div>
                    <dt>Resolution</dt>
                    <dd>
                      {structure.metadata.resolutionA.toFixed(2)} Å
                      {structure.metadata.resolutionSource === 'theta' ? ' · from θmax' : ''}
                    </dd>
                  </div>
                )}
                <div>
                  <dt>AU atoms</dt>
                  <dd>{structure.asymmetric.length}</dd>
                </div>
                <div>
                  <dt>Molecules</dt>
                  <dd>
                    {structure.moleculeCount} intact ·{' '}
                    {structure.operators.length} operators ·{' '}
                    {structure.atoms.length} sites
                  </dd>
                </div>
              </dl>
              {structure.metadata?.literature && (
                <div className="cif-literature">
                  <h3>Literature</h3>
                  {structure.metadata.literature.title && (
                    <p className="cif-lit-title">{structure.metadata.literature.title}</p>
                  )}
                  {structure.metadata.literature.citation && (
                    <p className="hint">{structure.metadata.literature.citation}</p>
                  )}
                  {structure.metadata.literature.doi && (
                    <p className="hint">
                      <a href={`https://doi.org/${structure.metadata.literature.doi}`} target="_blank" rel="noreferrer">
                        doi:{structure.metadata.literature.doi} ↗
                      </a>
                    </p>
                  )}
                </div>
              )}
              {elementDemo?.geometryLimited && elementDemo.geometryNote && (
                <p className="hint cif-geometry-note">
                  Symmetry overlays: {elementDemo.geometryNote}
                </p>
              )}
              {structure.warnings.length > 0 && (
                <ul className="cif-warnings">
                  {structure.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className="ops cif-ops">
              <h2>Symmetry operators</h2>
              <p className="hint">
                Each row is one symmetry operator (xyz
                {structure.operatorSource === 'cif'
                  ? ', from the CIF'
                  : structure.operatorSource === 'demo'
                    ? ', ITA standard setting'
                    : ''}
                ). The swatch matches the 3D molecule copy. Select a row to
                highlight that image; Op 1 is the asymmetric unit (BASE).
              </p>
              <ul
                className="op-list"
                role="listbox"
                aria-label="Symmetry operators"
                tabIndex={0}
                onKeyDown={onOpKeyDown}
              >
                {structure.operators.map((op) => {
                  const active = op.index === selectedOp
                  const color = operatorColor(op.index)
                  const mols = moleculesForOp.get(op.index) ?? 0
                  const sites = atomCountForOp(op.index)
                  return (
                    <li key={op.index} role="option" aria-selected={active}>
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
                            {op.index === 1 ? ' · BASE' : ' · IMAGE'}
                            {' · '}
                            {isImproper(op.R) ? 'opposite hand' : 'same hand'}
                            {' · '}
                            {mols} mol · {sites} atoms
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>

            {selected && (
              <section className="matrix-section cif-op-detail">
                <h2>
                  Selected · op {selected.index}
                  <span
                    className="cif-op-dot"
                    style={{ background: operatorColor(selected.index) }}
                    aria-hidden
                  />
                </h2>
                <dl className="meta-grid">
                  <div>
                    <dt>xyz (ITA)</dt>
                    <dd className="mono">{selected.triplet}</dd>
                  </div>
                  <div>
                    <dt>Seitz</dt>
                    <dd className="mono">{selected.seitz}</dd>
                  </div>
                  <div>
                    <dt>Class</dt>
                    <dd>
                      {selected.label} · {selected.classId}
                    </dd>
                  </div>
                  <div>
                    <dt>Chirality</dt>
                    <dd>
                      {isImproper(selected.R)
                        ? 'Improper — opposite hand'
                        : 'Proper — same hand'}
                    </dd>
                  </div>
                </dl>
              </section>
            )}
          </>
        )}
      </aside>

      <main className="viewport">
        <div className="viewport-toolbar">
          <div className="legend-stack">
            <div className="legend class-legend">
              {structure ? (
                structure.operators.slice(0, 12).map((op) => (
                  <button
                    key={op.index}
                    type="button"
                    className={`legend-item cif-legend-op${op.index === selectedOp ? ' active' : ''}`}
                    onClick={() => setSelectedOp(op.index)}
                    title={op.triplet}
                  >
                    <span
                      className="swatch"
                      style={{ background: operatorColor(op.index) }}
                    />
                    op {op.index}
                    {op.index === 1 ? ' (AU)' : ''}
                  </button>
                ))
              ) : (
                <span className="legend-item muted">
                  Upload a CIF to map intact molecules by symmetry operator
                </span>
              )}
              {structure && structure.operators.length > 12 && (
                <span className="legend-item muted">
                  +{structure.operators.length - 12} more
                </span>
              )}
            </div>
            <div className="legend chirality">
              Ball ≈ element · tint ≈ operator · bonds keep each molecule intact
              (min-image unwrap)
              {canShowElements && showSymmetryElements
                ? ' · overlays: screws / glides / inversions / mirrors (loci on this cell)'
                : ''}
            </div>
            {elementDemo && showSymmetryElements && canShowElements && (
              <div className="legend elements-legend" aria-label="Symmetry element classes">
                {elementDemo.classLegendOrder
                  .filter((id) => id !== 'identity')
                  .map((id) => {
                    const cls = elementDemo.symmetryClasses[id]
                    if (!cls) return null
                    return (
                      <span key={id} className="legend-item">
                        <span
                          className="swatch"
                          style={{ background: cls.color }}
                        />
                        {cls.label}
                      </span>
                    )
                  })}
                {elementDemo.geometryLimited && (
                  <span className="legend-item muted" title={elementDemo.geometryNote}>
                    limited geometry
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="toolbar-actions">
            <div
              className="segmented"
              role="group"
              aria-label="Motif placement"
            >
              <button
                type="button"
                className={
                  placementMode === 'nearest' ? 'seg active' : 'seg'
                }
                onClick={() => setPlacementMode('nearest')}
                title="Place molecules near the selected element (may leave the cell)"
              >
                <span className="label-full">Nearest images</span>
                <span className="label-short">Near</span>
              </button>
              <button
                type="button"
                className={
                  placementMode === 'wrapped' ? 'seg active' : 'seg'
                }
                onClick={() => setPlacementMode('wrapped')}
                title="Wrap every atom into the unit cell [0,1)³"
              >
                <span className="label-full">In cell</span>
                <span className="label-short">Cell</span>
              </button>
            </div>
            <div className="segmented" role="group" aria-label="Copy visibility">
              <button
                type="button"
                className={visibility === 'molecules' ? 'seg active' : 'seg'}
                onClick={() => setVisibility('molecules')}
              >
                Molecules
              </button>
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
              className={`btn${showSymmetryElements && canShowElements ? ' btn-primary' : ''}`}
              onClick={() => setShowSymmetryElements((v) => !v)}
              disabled={!structure || !canShowElements}
              aria-pressed={showSymmetryElements && canShowElements}
              title={
                !structure
                  ? 'Load a CIF first'
                  : !elementDemo
                    ? 'Needs a resolvable space-group number (1–230)'
                    : elementCount === 0
                      ? 'No drawable loci for this group yet (operators still listed)'
                      : showSymmetryElements
                        ? 'Hide screw / glide / inversion overlays'
                        : 'Show screw / glide / inversion overlays'
              }
            >
              Symmetry elements
              {canShowElements ? (showSymmetryElements ? ' · on' : ' · off') : ''}
            </button>
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

        {/* Phone: horizontal operator chips */}
        {structure && (
          <div className="cif-op-chips" aria-label="Operators (touch)">
            {structure.operators.map((op) => (
              <button
                key={op.index}
                type="button"
                className={`op-chip${op.index === selectedOp ? ' active' : ''}${op.index === 1 ? ' is-base' : ''}`}
                style={{ ['--op-color' as string]: operatorColor(op.index) }}
                onClick={() => setSelectedOp(op.index)}
                title={op.triplet}
              >
                <span className="op-chip-swatch" />
                <span className="op-chip-label">
                  {op.index}. {op.triplet}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="viewport-body cif-viewport-body">
          <div className="canvas-wrap">
            {structure ? (
              <CifStructureScene
                structure={structure}
                selectedOp={selectedOp}
                visibility={visibility}
                placementMode={placementMode}
                resetToken={resetToken}
                elementDemo={elementDemo}
                showSymmetryElements={showSymmetryElements && canShowElements}
              />
            ) : (
              <div className="cif-empty">
                <p>
                  Drop in a <code>.cif</code> from CSD or COD, or load the
                  teaching sample, to see intact molecules colored by symmetry
                  operator.
                </p>
              </div>
            )}
          </div>
        </div>

        {structure && <CellParamsBadge cell={structure.cell} variant="strip" />}

        <footer className="viewport-footer">
          CIF explorer · intact molecules (covalent + min-image unwrap) ·
          {structure?.operatorSource === 'cif'
            ? 'operators from the CIF symmetry loop'
            : structure?.operatorSource === 'demo'
              ? 'operators from ITA (CIF had no symmetry loop)'
              : 'operators'}
          {structure?.spaceGroupNumber != null
            ? ` · teaching demo: /sg/${structure.spaceGroupNumber}`
            : ''}
          {placementMode === 'nearest'
            ? ' · Nearest images may sit just outside the cell'
            : ' · In cell wraps atoms into [0, 1)³'}
          {canShowElements && showSymmetryElements
            ? ` · ${elementCount} symmetry loci on CIF cell`
            : ''}
        </footer>
      </main>
    </div>
  )
}
