import type { ChangeEvent } from 'react'

export interface CifLoadPanelProps {
  busy: boolean
  codeInput: string
  onCodeInputChange: (value: string) => void
  onLoadByCode: () => void
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
      <p className="hint">
        <strong>COD</strong> (e.g.{' '}
        <button
          type="button"
          className="linkish"
          onClick={() => onCodeInputChange('1100303')}
        >
          1100303
        </button>
        ): streams when same-origin cache/proxy allows; curated sample is
        bundled. Direct crystallography.net fetch may be CORS-blocked on GitHub
        Pages — then open the CIF and paste.
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
        Parsing runs in your browser — CIF text is not uploaded to our servers.
        COD data are public domain; CSD downloads follow CCDC terms on their
        site.
      </p>
    </section>
  )
}
