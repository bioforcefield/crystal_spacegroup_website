import { useEffect, useId, useState, type ChangeEvent } from 'react'
import {
  COD_TEACHING_CHIPS,
  loadCodSamplesManifest,
  type CodSampleMeta,
} from '../../data/cif/codSamples'
import {
  hasConfiguredCodSearch,
  searchCod,
  type CodSearchHit,
  type CodSearchKind,
} from '../../data/cif/codSearch'
import { hasConfiguredCodProxy } from '../../data/cif/fetchRemoteCif'
import { PDB_TEACHING_CHIPS } from '../../data/pdb/fetchPdb'
import { guessSearchKind, searchRcsb, type PdbSource, type SearchHit, type SearchKind } from '../../data/pdb/pdbLoad'

export interface CifLoadPanelProps {
  busy: boolean
  codeInput: string
  onCodeInputChange: (value: string) => void
  onLoadByCode: () => void
  /** Load a specific COD id (sets input + fetches). */
  onLoadCodId?: (id: string) => void
  onFile: (e: ChangeEvent<HTMLInputElement>) => void
  onLoadSample: () => void
  pasteOpen: boolean
  onTogglePaste: () => void
  pasteText: string
  onPasteTextChange: (value: string) => void
  onLoadPaste: () => void
  remoteHint: string | null
  remoteLink: string | null
  fileName: string | null
  error: string | null
  /** When true, collapse teaching chips behind "Try another structure". */
  structureLoaded?: boolean
  /** PDB ID input (RCSB mmCIF). */
  /** Switch to this load tab when it changes (e.g. after a bad /cif/pdb/<id> link). */
  modeHint?: 'pdb' | 'id' | null
  pdbInput?: string
  onPdbInputChange?: (v: string) => void
  onLoadPdb?: (id: string) => void
  pdbAsm?: number | null
  onPdbAsmChange?: (n: number | null) => void
  pdbSrc?: PdbSource
  onPdbSrcChange?: (s: PdbSource) => void
  recentPdb?: string[]
  pdbReplacedBy?: string[]
  pdbWarnings?: string[]
  pdbProgress?: string | null
  pdbProgressFrac?: number | null
  onAbortPdb?: () => void
}

type LoadMode = 'id' | 'name' | 'smiles' | 'pdb'

export default function CifLoadPanel({
  busy,
  codeInput,
  onCodeInputChange,
  onLoadByCode,
  onLoadCodId,
  onFile,
  onLoadSample,
  pasteOpen,
  onTogglePaste,
  pasteText,
  onPasteTextChange,
  onLoadPaste,
  remoteHint,
  remoteLink,
  fileName,
  error,
  structureLoaded = false,
  modeHint = null,
  pdbInput = '',
  onPdbInputChange,
  onLoadPdb,
  pdbAsm = null,
  onPdbAsmChange,
  pdbSrc = 'rcsb',
  onPdbSrcChange,
  recentPdb = [],
  pdbReplacedBy = [],
  pdbWarnings = [],
  pdbProgress = null,
  pdbProgressFrac = null,
  onAbortPdb,
}: CifLoadPanelProps) {
  const [extras, setExtras] = useState<CodSampleMeta[]>([])
  const [mode, setMode] = useState<LoadMode>('id')
  useEffect(() => {
    if (modeHint && (modeHint !== 'pdb' || onLoadPdb)) setMode(modeHint)
  }, [modeHint, onLoadPdb])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchBusy, setSearchBusy] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchHits, setSearchHits] = useState<CodSearchHit[] | null>(null)
  const [searchMeta, setSearchMeta] = useState<{
    total: number
    capped: boolean
    kind: CodSearchKind
  } | null>(null)
  const proxyReady = hasConfiguredCodProxy()
  const searchReady = hasConfiguredCodSearch()
  const statusId = useId()
  const resultsLabelId = useId()

  useEffect(() => {
    let cancelled = false
    void loadCodSamplesManifest().then((m) => {
      if (!cancelled) setExtras(m.samples)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const pick = (id: string) => {
    if (onLoadCodId) onLoadCodId(id)
    else {
      onCodeInputChange(id)
    }
  }

  const chipIds = new Set(COD_TEACHING_CHIPS.map((c) => c.id))
  const more = extras.filter((s) => !chipIds.has(s.id)).slice(0, 8)

  const runSearch = async () => {
    const q = searchQuery.trim()
    if (!q) {
      setSearchError('Enter a name or SMILES string first.')
      setSearchHits(null)
      setSearchMeta(null)
      return
    }
    setSearchBusy(true)
    setSearchError(null)
    setSearchHits(null)
    setSearchMeta(null)
    try {
      const result = await searchCod(
        mode === 'name' ? { text: q } : { smile: q },
      )
      setSearchHits(result.hits)
      setSearchMeta({
        total: result.total,
        capped: result.capped,
        kind: result.query.kind,
      })
      if (result.hits.length === 0) {
        setSearchError(
          result.total === 0
            ? 'No COD entries matched. Try another name or a simpler SMILES.'
            : 'No usable hits in this page of results.',
        )
      }
    } catch (e) {
      setSearchHits([])
      setSearchMeta(null)
      setSearchError(e instanceof Error ? e.message : String(e))
    } finally {
      setSearchBusy(false)
    }
  }

  const modeTabs: { id: LoadMode; label: string }[] = [
    { id: 'id', label: 'COD id' },
    { id: 'name', label: 'Name' },
    { id: 'smiles', label: 'SMILES' },
    ...(onLoadPdb ? [{ id: 'pdb' as const, label: 'PDB ID' }] : []),
  ]

  return (
    <section className="seed-box cif-upload">
      <h2>Load by code · COD / CSD / PDB</h2>

      <div
        className="cif-load-modes"
        role="tablist"
        aria-label="COD load method"
      >
        {modeTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            className={
              mode === t.id ? 'cif-load-mode is-active' : 'cif-load-mode'
            }
            aria-selected={mode === t.id}
            disabled={busy}
            onClick={() => {
              setMode(t.id)
              setSearchError(null)
              if (t.id === 'id') {
                setSearchHits(null)
                setSearchMeta(null)
              }
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {mode === 'id' && (
        <div className="cif-code-row">
          <input
            type="text"
            className="cif-code-input"
            value={codeInput}
            onChange={(e) => onCodeInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onLoadByCode()
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
            onClick={onLoadByCode}
            disabled={busy}
          >
            Load
          </button>
        </div>
      )}

      {pdbReplacedBy.length > 0 && (
        <div className="cif-pdb-replaced" role="group" aria-label="Superseding entries">
          Superseded by:{' '}
          {pdbReplacedBy.map((r) => (
            <button key={r} type="button" className="cif-cod-chip" onClick={() => onLoadPdb?.(r)}>{r.toUpperCase()}</button>
          ))}
        </div>
      )}
      {pdbWarnings.map((w) => <p key={w} className="cif-pdb-warn" role="note">{w}</p>)}
      {mode === 'pdb' && onLoadPdb && (
        <div className="cif-pdb-load">
          <div className="cif-code-row">
            <input
              type="text"
              className="cif-code-input"
              value={pdbInput}
              onChange={(e) => onPdbInputChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onLoadPdb(pdbInput.trim())
                }
              }}
              placeholder="1CRN or RCSB link"
              aria-label="PDB ID or RCSB link"
              maxLength={200}
              disabled={busy}
              autoCapitalize="characters"
              spellCheck={false}
            />
            <button type="button" className="btn btn-primary" onClick={() => onLoadPdb(pdbInput.trim())} disabled={busy}>
              Load
            </button>
          </div>
          <div className="cif-pdb-opts" role="group" aria-label="PDB load options">
            <label title="Asymmetric unit (deposited coordinates) or a biological assembly file from RCSB">
              Model{' '}
              <select data-testid="pdb-asm" value={pdbAsm ?? 0} disabled={busy} onChange={(e) => onPdbAsmChange?.(Number(e.target.value) || null)}>
                <option value={0}>Asymmetric unit</option>
                {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>Biological assembly {n}</option>)}
              </select>
            </label>
            <label title="PDB-REDO re-refined coordinates (falls back to RCSB when the entry is not in PDB-REDO). Not used for assemblies.">
              <input type="checkbox" data-testid="pdb-redo" checked={pdbSrc === 'redo'} disabled={busy || !!pdbAsm} onChange={(e) => onPdbSrcChange?.(e.target.checked ? 'redo' : 'rcsb')} /> PDB-REDO
            </label>
          </div>
          {pdbProgress && (
            <div className="cif-pdb-progress" role="status" data-testid="pdb-progress">
              <progress max={1} value={pdbProgressFrac ?? undefined} />
              <span>{pdbProgress}</span>
              <button type="button" className="btn btn-sm" onClick={onAbortPdb}>Cancel</button>
            </div>
          )}
          <PdbSearch busy={busy} onLoad={onLoadPdb} />
          {recentPdb.length > 0 && (
            <div className="cif-cod-chips cif-pdb-recent" role="group" aria-label="Recently loaded PDB entries">
              <span className="muted">Recent:</span>
              {recentPdb.map((r) => (
                <button key={r} type="button" className="cif-cod-chip" disabled={busy} onClick={() => onLoadPdb(r)}>{r.toUpperCase()}</button>
              ))}
            </div>
          )}
          <p className="muted cif-pdb-note">
            Protein / nucleic-acid crystal structures from RCSB (mmCIF). Proteins crystallize only in the 65 Sohncke
            groups (no mirrors, glides or inversion).
          </p>
          <div className="cif-cod-chips cif-pdb-chips" role="group" aria-label="PDB teaching examples">
            {PDB_TEACHING_CHIPS.map((c) => (
              <button key={c.id} type="button" className="cif-cod-chip" disabled={busy} title={c.title} onClick={() => onLoadPdb(c.id)}>
                {c.id.toUpperCase()} · {c.short}
              </button>
            ))}
          </div>
        </div>
      )}

      {(mode === 'name' || mode === 'smiles') && (
        <div className="cif-cod-search">
          <div className="cif-code-row">
            <input
              type="text"
              className="cif-code-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void runSearch()
                }
              }}
              placeholder={
                mode === 'name'
                  ? 'urea, aspirin, caffeine…'
                  : 'c1ccccc1 or CCO…'
              }
              aria-label={
                mode === 'name'
                  ? 'COD name or keyword search'
                  : 'COD SMILES search'
              }
              disabled={busy || searchBusy}
              spellCheck={false}
              autoCapitalize="off"
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void runSearch()}
              disabled={busy || searchBusy}
            >
              {searchBusy ? 'Searching…' : 'Search'}
            </button>
          </div>
          <p className="hint cif-search-hint">
            {mode === 'name' ? (
              <>
                Searches COD metadata (names, mineral, bibliography). Pick a hit
                to load the CIF through the same cache/proxy path as COD ids.
              </>
            ) : (
              <>
                SMILES is sent to COD as a structure/substructure query (COD{' '}
                <code>smarts</code> API; subset of the database). Not a full
                SMARTS editor in this UI.
              </>
            )}{' '}
            {searchReady ? (
              <span>Search proxy ready ✓</span>
            ) : (
              <span>
                Needs the COD CORS worker (<code>/search</code>) or local{' '}
                <code>/cod-search</code> in vite — same setup as arbitrary COD
                ids.
              </span>
            )}
          </p>
          <div
            id={statusId}
            className="cif-search-status"
            role="status"
            aria-live="polite"
          >
            {searchBusy && <span>Searching COD…</span>}
            {!searchBusy && searchMeta && (
              <span>
                {searchMeta.total === 0
                  ? '0 matches'
                  : searchMeta.capped
                    ? `Showing ${searchHits?.length ?? 0} of ${searchMeta.total} matches`
                    : `${searchMeta.total} match${searchMeta.total === 1 ? '' : 'es'}`}
              </span>
            )}
            {!searchBusy && searchError && (
              <span className="cif-search-error">{searchError}</span>
            )}
          </div>
          {searchHits && searchHits.length > 0 && (
            <ul
              className="cif-search-results"
              aria-labelledby={resultsLabelId}
            >
              <li id={resultsLabelId} className="cif-search-results-label">
                Results — click to load
              </li>
              {searchHits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    className="cif-search-hit"
                    disabled={busy}
                    onClick={() => pick(h.id)}
                  >
                    <span className="cif-search-hit-id">COD {h.id}</span>
                    <span className="cif-search-hit-meta">
                      {[h.sg, h.formula, h.vol ? `V=${h.vol}` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    {h.name && (
                      <span className="cif-search-hit-name">{h.name}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {structureLoaded ? (
        <details className="cif-cod-try-another">
          <summary>Try another structure</summary>
          <div className="cif-cod-chips" role="group" aria-label="Cached COD teaching structures">
            {COD_TEACHING_CHIPS.map((c) => (
              <button
                key={c.id}
                type="button"
                className="cif-cod-chip"
                disabled={busy}
                onClick={() => pick(c.id)}
                title={`Load COD ${c.id} from same-origin cache`}
              >
                {c.short}
              </button>
            ))}
          </div>
          {more.length > 0 && (
            <details className="cif-cod-more">
              <summary>More cached COD ids ({extras.length} total)</summary>
              <div className="cif-cod-chips" role="group" aria-label="More cached COD ids">
                {extras.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="cif-cod-chip"
                    disabled={busy}
                    onClick={() => pick(s.id)}
                    title={s.hm ? `${s.label} · ${s.hm}` : s.label}
                  >
                    {s.id}
                    {s.ita != null ? ` · ${s.ita}` : ''}
                  </button>
                ))}
              </div>
            </details>
          )}
        </details>
      ) : (
        <>
          <div className="cif-cod-chips" role="group" aria-label="Cached COD teaching structures">
            {COD_TEACHING_CHIPS.map((c) => (
              <button
                key={c.id}
                type="button"
                className="cif-cod-chip"
                disabled={busy}
                onClick={() => pick(c.id)}
                title={`Load COD ${c.id} from same-origin cache`}
              >
                {c.short}
              </button>
            ))}
          </div>
          {more.length > 0 && (
            <details className="cif-cod-more">
              <summary>More cached COD ids ({extras.length} total)</summary>
              <div className="cif-cod-chips" role="group" aria-label="More cached COD ids">
                {extras.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="cif-cod-chip"
                    disabled={busy}
                    onClick={() => pick(s.id)}
                    title={s.hm ? `${s.label} · ${s.hm}` : s.label}
                  >
                    {s.id}
                    {s.ita != null ? ` · ${s.ita}` : ''}
                  </button>
                ))}
              </div>
            </details>
          )}
        </>
      )}

      <details className="cif-about-sources">
        <summary>About sources ⓘ</summary>
      <p className="hint">
        <strong>COD</strong>: chips load from this site&apos;s same-origin cache
        ({extras.length || '…'} curated CIFs — works on GitHub Pages). Status after
        Load shows <em>cache</em> / <em>proxy</em> / <em>fail</em>. Arbitrary ids
        and name/SMILES search stream when{' '}
        {proxyReady ? (
          <span>a COD proxy is configured for this build ✓</span>
        ) : (
          <span>
            you deploy <code>scripts/cod-cors-worker.js</code> and rebuild with{' '}
            <code>VITE_COD_PROXY</code>
          </span>
        )}
        . Local <code>vite</code> / preview use <code>/cod-proxy</code> and{' '}
        <code>/cod-search</code>.
        <br />
        <strong>CSD</strong> (e.g. ACETAC01): no free anonymous API — download
        via{' '}
        <a
          href="https://www.ccdc.cam.ac.uk/structures/"
          target="_blank"
          rel="noreferrer"
        >
          CCDC Access Structures
        </a>
        , then upload/paste. We do not scrape CSD.
      </p>
      </details>

      <h2>Upload · .cif / .pdb / .mae</h2>
      <label className="cif-file-label btn btn-primary">
        Choose file
        <input
          type="file"
          accept=".cif,.mcif,.pdb,.ent,.mae,.maegz,.gz,chemical/x-cif,chemical/x-pdb,text/plain"
          onChange={onFile}
          disabled={busy}
        />
      </label>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={onLoadSample}
        disabled={busy}
      >
        Load teaching sample (P21/c)
      </button>
      <button type="button" className="btn btn-ghost" onClick={onTogglePaste}>
        {pasteOpen ? 'Hide paste CIF' : 'Paste CIF text'}
      </button>
      {pasteOpen && (
        <div className="cif-paste">
          <textarea
            value={pasteText}
            onChange={(e) => onPasteTextChange(e.target.value)}
            rows={8}
            placeholder="Paste CIF, mmCIF, PDB or Maestro (.mae) contents here…"
            aria-label="Paste CIF text"
            spellCheck={false}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={onLoadPaste}
            disabled={busy}
          >
            Parse pasted CIF
          </button>
        </div>
      )}
      {remoteHint && (
        <p className="cif-remote-hint" role="status">
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
      {error && (
        <p className="cif-error" role="alert" aria-live="assertive">
          {error}
        </p>
      )}
      <p className="hint">
        Parsing runs in your browser — CIF text is not uploaded to our servers.
        COD data are public domain; CSD downloads follow CCDC terms on their
        site.
      </p>
    </section>
  )
}

/** RCSB search (keyword, name, UniProt accession or ligand code) with a click-to-load result list. */
function PdbSearch({ busy, onLoad }: { busy: boolean; onLoad: (id: string) => void }) {
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<SearchKind | 'auto'>('auto')
  const [hits, setHits] = useState<SearchHit[] | null>(null)
  const [total, setTotal] = useState(0)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const run = async (start = 0) => {
    if (!q.trim()) return
    setLoading(true)
    setErr(null)
    try {
      const r = await searchRcsb(q, { kind: kind === 'auto' ? guessSearchKind(q) : kind, rows: 10, start })
      setHits((h) => (start && h ? [...h, ...r.hits] : r.hits))
      setTotal(r.total)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'RCSB search failed — check your connection.')
    } finally {
      setLoading(false)
    }
  }
  return (
    <details className="cif-pdb-search">
      <summary>Search RCSB (name, keyword, UniProt, ligand)</summary>
      <div className="cif-code-row">
        <input type="search" className="cif-code-input" value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void run() } }}
          placeholder="e.g. lysozyme, P69905, HEM" aria-label="Search RCSB PDB" data-testid="pdb-search-input" />
        <select value={kind} onChange={(e) => setKind(e.target.value as SearchKind | 'auto')} aria-label="Search type">
          <option value="auto">Auto</option>
          <option value="text">Text</option>
          <option value="uniprot">UniProt</option>
          <option value="ligand">Ligand ID</option>
        </select>
        <button type="button" className="btn" onClick={() => void run()} disabled={loading || !q.trim()}>{loading ? '…' : 'Search'}</button>
      </div>
      {err && <p className="cif-pdb-warn" role="alert">{err}</p>}
      {hits && (
        <>
          <p className="muted">{total.toLocaleString()} entries{total > hits.length ? ` · showing ${hits.length}` : ''}</p>
          <ul className="cif-pdb-hits" data-testid="pdb-hits">
            {hits.map((h) => (
              <li key={h.id}>
                <button type="button" disabled={busy} onClick={() => onLoad(h.id)} title={`Load ${h.id.toUpperCase()}`}>
                  <img src={h.thumb} alt="" loading="lazy" width={56} height={56} onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
                  <span className="cif-hit-text">
                    <strong>{h.id.toUpperCase()}</strong> {h.title ?? ''}
                    <span className="muted">
                      {[h.method?.toLowerCase(), h.resolution != null ? `${h.resolution.toFixed(2)} Å` : null, h.organism].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {total > hits.length && <button type="button" className="btn btn-sm" disabled={loading} onClick={() => void run(hits.length)}>More results</button>}
        </>
      )}
    </details>
  )
}
