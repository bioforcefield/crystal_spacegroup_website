import { useEffect, useState, type ChangeEvent } from 'react'
import {
  COD_TEACHING_CHIPS,
  loadCodSamplesManifest,
  type CodSampleMeta,
} from '../../data/cif/codSamples'
import { hasConfiguredCodProxy } from '../../data/cif/fetchRemoteCif'

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
}

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
}: CifLoadPanelProps) {
  const [extras, setExtras] = useState<CodSampleMeta[]>([])
  const proxyReady = hasConfiguredCodProxy()

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
      // parent Load still needed if only onCodeInputChange
    }
  }

  const chipIds = new Set(COD_TEACHING_CHIPS.map((c) => c.id))
  const more = extras.filter((s) => !chipIds.has(s.id)).slice(0, 8)

  return (
    <section className="seed-box cif-upload">
      <h2>Load by code · COD / CSD</h2>
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

      <p className="hint">
        <strong>COD</strong>: chips above load instantly from this site&apos;s
        cache (works on GitHub Pages). Other numeric ids stream when{' '}
        {proxyReady ? (
          <span>a COD proxy is configured for this build</span>
        ) : (
          <span>
            <code>VITE_COD_PROXY</code> is set at build time (Cloudflare Worker:{' '}
            <code>scripts/cod-cors-worker.js</code>)
          </span>
        )}
        ; otherwise open the CIF and paste. Local <code>vite</code> / preview
        use <code>/cod-proxy</code>.
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
            placeholder="Paste CIF contents here…"
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
