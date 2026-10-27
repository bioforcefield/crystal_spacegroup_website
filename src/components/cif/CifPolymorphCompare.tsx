import type { ChangeEvent } from 'react'
import type { ExpandedStructure } from '../../data/cif/types'
import type { PowderPeak } from '../../data/cif/xray/powder'
import type { PeakShiftRow } from '../../data/cif/xray/peakCompare'
import {
  POLYMORPH_PAIRS,
  type PolymorphPair,
} from '../../data/cif/xray/polymorphPairs'

export interface CifPolymorphCompareProps {
  uid: string
  structure: ExpandedStructure
  formB: {
    structure: ExpandedStructure
    label: string
    codId: string | null
    sourceNote: string
    pairId: string | null
  } | null
  patternBPeaks: PowderPeak[] | null
  topsA: PowderPeak[]
  topsB: PowderPeak[]
  shiftRows: PeakShiftRow[]
  busyB: boolean
  errorB: string | null
  codBInput: string
  setCodBInput: (v: string) => void
  pasteBOpen: boolean
  setPasteBOpen: (v: boolean | ((o: boolean) => boolean)) => void
  pasteBText: string
  setPasteBText: (v: string) => void
  activePairId: string | null
  activePair: PolymorphPair | null
  pairChemistryMismatch: boolean
  onLoadCodId?: (id: string) => void
  setPairAsB: (pair: PolymorphPair) => void
  loadPairIntoMap: (pair: PolymorphPair) => void
  loadFormBCod: (id: string, pairId?: string | null, labelHint?: string) => void
  loadPasteB: () => void
  onFileB: (e: ChangeEvent<HTMLInputElement>) => void
  clearFormB: () => void
}

export default function CifPolymorphCompare({
  uid,
  structure,
  formB,
  topsA,
  topsB,
  shiftRows,
  busyB,
  errorB,
  codBInput,
  setCodBInput,
  pasteBOpen,
  setPasteBOpen,
  pasteBText,
  setPasteBText,
  activePairId,
  activePair,
  pairChemistryMismatch,
  onLoadCodId,
  setPairAsB,
  loadPairIntoMap,
  loadFormBCod,
  loadPasteB,
  onFileB,
  clearFormB,
}: CifPolymorphCompareProps) {
  return (
    <div className="cif-xray-compare" aria-labelledby="cif-xray-compare-heading">
      <h3 id="cif-xray-compare-heading" className="teach-subhead">
        Compare · polymorph
      </h3>
      <p className="hint">
        Form A is the structure in the 3D map. Curated chips{' '}
        <strong>Load pair into map</strong> by default (Form A → map, Form B →
        overlay) so chemistry stays matched. Use <em>Form B only</em> below if
        you want to keep the current map. Shared λ / 2θ / FWHM controls apply to
        both (powder recomputes shortly after you stop dragging).
      </p>

      <div
        className="cif-xray-pair-chips"
        role="group"
        aria-label="Curated polymorph pairs"
      >
        {POLYMORPH_PAIRS.map((pair) => (
          <button
            key={pair.id}
            type="button"
            className={`seg${activePairId === pair.id ? ' active' : ''}`}
            aria-pressed={activePairId === pair.id}
            disabled={busyB}
            title={
              onLoadCodId
                ? `${pair.note} Loads Form A into the map and Form B as overlay.`
                : `${pair.note} Sets Form B = ${pair.formB.label} (COD ${pair.formB.codId}).`
            }
            onClick={() =>
              onLoadCodId ? loadPairIntoMap(pair) : setPairAsB(pair)
            }
          >
            {pair.short}
          </button>
        ))}
      </div>

      {activePair && (
        <p className="hint cif-xray-pair-note">
          <strong>{activePair.chemistry}.</strong> {activePair.note} Form A
          target: {activePair.formA.label} (COD {activePair.formA.codId}
          {activePair.formA.hm ? `, ${activePair.formA.hm}` : ''}). Form B:{' '}
          {activePair.formB.label} (COD {activePair.formB.codId}
          {activePair.formB.hm ? `, ${activePair.formB.hm}` : ''}).
        </p>
      )}
      {pairChemistryMismatch && activePair && (
        <p className="teach-error" role="status">
          Map Form A formula ({structure.metadata?.formula ?? 'unknown'}) does
          not match this pair&apos;s chemistry ({activePair.chemistry}). Overlay
          still works, but for a true polymorph fingerprint click{' '}
          <strong>Load pair into map</strong>.
        </p>
      )}

      <div className="cif-xray-compare-actions">
        {activePair && onLoadCodId && (
          <button
            type="button"
            className="seg active"
            disabled={busyB}
            onClick={() => loadPairIntoMap(activePair)}
            title={`Load ${activePair.formA.label} into the 3D map and keep ${activePair.formB.label} as Form B`}
          >
            Load pair into map
          </button>
        )}
        {activePair && (
          <button
            type="button"
            className="seg"
            disabled={busyB}
            onClick={() => setPairAsB(activePair)}
            title={`Set Form B = ${activePair.formB.label} without changing the map`}
          >
            Form B only
          </button>
        )}
        {formB?.codId && onLoadCodId && (
          <button
            type="button"
            className="seg"
            disabled={busyB}
            onClick={() => onLoadCodId(formB.codId!)}
            title="Replace the 3D map with Form B (overlay stays until cleared)"
          >
            Open B in map
          </button>
        )}
        {formB && (
          <button type="button" className="seg" onClick={clearFormB}>
            Clear Form B
          </button>
        )}
      </div>

      <div className="cif-xray-b-load">
        <label className="teach-slider-label" htmlFor={`${uid}-codb`}>
          Form B COD id
        </label>
        <div className="cif-xray-b-row">
          <input
            id={`${uid}-codb`}
            type="text"
            inputMode="numeric"
            className="cif-code-input"
            value={codBInput}
            placeholder="e.g. 9011577"
            disabled={busyB}
            onChange={(e) => setCodBInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void loadFormBCod(codBInput, null)
              }
            }}
          />
          <button
            type="button"
            className="seg"
            disabled={busyB}
            onClick={() => void loadFormBCod(codBInput, null)}
          >
            {busyB ? 'Loading…' : 'Set Form B'}
          </button>
        </div>
        <div className="cif-xray-b-row">
          <label className="cif-file-label btn btn-ghost">
            Upload CIF as B
            <input
              type="file"
              accept=".cif,.mcif,chemical/x-cif,text/plain"
              onChange={(e) => void onFileB(e)}
              disabled={busyB}
            />
          </label>
          <button
            type="button"
            className="seg"
            disabled={busyB}
            aria-expanded={pasteBOpen}
            onClick={() => setPasteBOpen((o) => !o)}
          >
            {pasteBOpen ? 'Hide paste' : 'Paste CIF as B'}
          </button>
        </div>
        {pasteBOpen && (
          <div className="cif-paste cif-xray-paste-b">
            <textarea
              aria-label="Paste Form B CIF"
              rows={5}
              value={pasteBText}
              disabled={busyB}
              onChange={(e) => setPasteBText(e.target.value)}
              placeholder="Paste a second CIF here…"
              spellCheck={false}
            />
            <button
              type="button"
              className="seg"
              disabled={busyB}
              onClick={loadPasteB}
            >
              Use paste as Form B
            </button>
          </div>
        )}
        {formB && (
          <p className="hint">
            Form B loaded: {formB.label}
            {formB.codId ? ` · COD ${formB.codId}` : ''}
            {formB.structure.metadata?.formula
              ? ` · ${formB.structure.metadata.formula}`
              : ''}
            {formB.structure.spaceGroupName
              ? ` · ${formB.structure.spaceGroupName}`
              : ''}
            . {formB.sourceNote}
          </p>
        )}
        {errorB && (
          <p className="cif-error" role="alert">
            {errorB}
          </p>
        )}
      </div>

      {formB && (
        <>
          <h4 className="teach-subhead">Strongest peaks · A vs B</h4>
          <div className="cif-xray-ab-tables">
            <div className="cif-xray-table-scroll">
              <table>
                <caption className="sr-only">Form A strongest peaks</caption>
                <thead>
                  <tr>
                    <th scope="col">A hkl</th>
                    <th scope="col">2θ</th>
                    <th scope="col">I</th>
                  </tr>
                </thead>
                <tbody>
                  {topsA.map((p) => (
                    <tr key={`ta-${p.hkl}-${p.twoTheta.toFixed(2)}`}>
                      <td className="mono">{p.hkl}</td>
                      <td>{p.twoTheta.toFixed(2)}</td>
                      <td>{p.intensity.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="cif-xray-table-scroll">
              <table>
                <caption className="sr-only">Form B strongest peaks</caption>
                <thead>
                  <tr>
                    <th scope="col">B hkl</th>
                    <th scope="col">2θ</th>
                    <th scope="col">I</th>
                  </tr>
                </thead>
                <tbody>
                  {topsB.map((p) => (
                    <tr key={`tb-${p.hkl}-${p.twoTheta.toFixed(2)}`}>
                      <td className="mono">{p.hkl}</td>
                      <td>{p.twoTheta.toFixed(2)}</td>
                      <td>{p.intensity.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <details className="cif-xray-table">
            <summary>Peak shift highlight (A tops → B)</summary>
            <p className="hint">
              Prefer same (hkl) when indices exist. Rows marked{' '}
              <em>nearest-2θ</em> are <strong>not</strong> an index match — only
              the closest powder line within 2.5°.
            </p>
            <div className="cif-xray-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">A hkl</th>
                    <th scope="col">A 2θ</th>
                    <th scope="col">B hkl</th>
                    <th scope="col">B 2θ</th>
                    <th scope="col">Δ2θ</th>
                    <th scope="col">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftRows.map((row) => (
                    <tr key={`sh-${row.a.hkl}-${row.a.twoTheta.toFixed(2)}`}>
                      <td className="mono">{row.a.hkl}</td>
                      <td>{row.a.twoTheta.toFixed(2)}</td>
                      <td className="mono">{row.b?.hkl ?? '—'}</td>
                      <td>{row.b ? row.b.twoTheta.toFixed(2) : '—'}</td>
                      <td>
                        {row.deltaTwoTheta != null
                          ? `${row.deltaTwoTheta >= 0 ? '+' : ''}${row.deltaTwoTheta.toFixed(2)}°`
                          : '—'}
                      </td>
                      <td>
                        {row.match === 'hkl'
                          ? 'same hkl'
                          : row.match === 'nearest-2θ'
                            ? 'nearest-2θ (not index)'
                            : 'no match ≤2.5°'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  )
}
