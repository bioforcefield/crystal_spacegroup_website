import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { classifyHabit } from '../../data/morphology/habit'
import {
  activeFaceLabels,
  wulffPolygon2D,
  type FaceSpec,
} from '../../data/morphology/wulff2d'
import {
  applyFormRates,
  rankBfdh,
  uniqueFormRates,
  type BfdhResult,
} from '../../data/morphology/bfdh'
import { bfdhFaces3D } from '../../data/morphology/wulff3d'
import { parseCif } from '../../data/cif/parseCif'
import { expandStructure } from '../../data/cif/expandStructure'
import {
  CorsBlockedError,
  CsdManualError,
  NotFoundError,
  fetchRemoteCif,
} from '../../data/cif/fetchRemoteCif'
import WulffOutline2D from './WulffOutline2D'
import WulffHabit3D from './WulffHabit3D'

const BFDH_CHIPS: ReadonlyArray<{ id: string; short: string }> = [
  { id: '9008565', short: 'Si · Fd-3m' },
  { id: '9000001', short: 'PbS · Fm-3m' },
  { id: '1010962', short: 'Calcite · R-3c' },
  { id: '9011577', short: 'Graphite · P63/mmc' },
  { id: '1507756', short: 'BaTiO₃ · P4mm' },
  { id: '1100303', short: 'Organic · P-1' },
  { id: '1010916', short: 'Apatite · P63/m' },
]

function runBfdhFromCifText(text: string): {
  result: BfdhResult
  label: string
  cellLine: string
  cell: { a: number; b: number; c: number; alphaDeg?: number; betaDeg?: number; gammaDeg?: number }
} {
  const parsed = parseCif(text)
  const expanded = expandStructure(parsed)
  const result = rankBfdh(parsed.cell, {
    hm: parsed.spaceGroupName,
    maxIndex: 3,
    topN: 12,
    operators: expanded.operators,
  })
  const c = parsed.cell
  const angles = [
    c.alphaDeg != null ? `α=${c.alphaDeg.toFixed(1)}°` : null,
    c.betaDeg != null ? `β=${c.betaDeg.toFixed(1)}°` : null,
    c.gammaDeg != null ? `γ=${c.gammaDeg.toFixed(1)}°` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const cellLine = `a=${c.a.toFixed(3)} b=${c.b.toFixed(3)} c=${c.c.toFixed(3)} Å${angles ? ` · ${angles}` : ''}`
  const label = [
    parsed.metadata?.formula,
    parsed.spaceGroupName,
    parsed.spaceGroupNumber != null ? `ITA ${parsed.spaceGroupNumber}` : null,
  ]
    .filter(Boolean)
    .join(' · ') || parsed.dataBlock || 'CIF'
  return { result, label, cellLine, cell: parsed.cell }
}

function seedRates(faces2d: FaceSpec[]) {
  const rates: Record<string, number> = {}
  const enabled: Record<string, boolean> = {}
  for (const u of uniqueFormRates(faces2d)) {
    rates[u.form] = u.rate
    enabled[u.form] = true
  }
  return { rates, enabled }
}

export default function MorphologyBfdhSection() {
  const [codId, setCodId] = useState('9008565')
  const [paste, setPaste] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [label, setLabel] = useState<string | null>(null)
  const [cellLine, setCellLine] = useState<string | null>(null)
  const [bfdh, setBfdh] = useState<BfdhResult | null>(null)
  const [bfdhCell, setBfdhCell] = useState<{ a: number; b: number; c: number; alphaDeg?: number; betaDeg?: number; gammaDeg?: number } | null>(null)
  const [rates, setRates] = useState<Record<string, number>>({})
  const [enabled, setEnabled] = useState<Record<string, boolean>>({})
  const [seedKey, setSeedKey] = useState(0)
  const [view3d, setView3d] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const applyText = (text: string, sourceNote: string) => {
    try {
      const { result, label: lab, cellLine: cell, cell: cellParams } = runBfdhFromCifText(text)
      const seeded = seedRates(result.faces2d)
      setBfdh(result)
      setBfdhCell(cellParams)
      setRates(seeded.rates)
      setEnabled(seeded.enabled)
      setSeedKey((k) => k + 1)
      setLabel(lab)
      setCellLine(cell)
      setStatus(sourceNote)
      setError(null)
    } catch (e) {
      setBfdh(null)
      setBfdhCell(null)
      setRates({})
      setEnabled({})
      setError(e instanceof Error ? e.message : String(e))
      setStatus(null)
    }
  }

  const loadCod = async (id: string) => {
    setBusy(true)
    setError(null)
    setStatus('Loading…')
    try {
      const remote = await fetchRemoteCif(id.trim())
      applyText(remote.text, `${remote.label} · ${remote.sourceNote}`)
      setCodId(id.trim())
    } catch (e) {
      setBfdh(null)
      setBfdhCell(null)
      setRates({})
      setEnabled({})
      if (e instanceof CorsBlockedError) {
        setError(
          `${e.message} Try a teaching chip (cached), paste/upload a CIF, or use the COD proxy build.`,
        )
      } else if (e instanceof CsdManualError) {
        setError(e.message)
      } else if (e instanceof NotFoundError) {
        setError(e.message)
      } else {
        setError(e instanceof Error ? e.message : String(e))
      }
      setStatus(null)
    } finally {
      setBusy(false)
    }
  }

  const onFile = async (ev: ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0]
    if (!file) return
    const text = await file.text()
    applyText(text, `Uploaded · ${file.name}`)
    ev.target.value = ''
  }

  const resetToBfdh = () => {
    if (!bfdh) return
    const seeded = seedRates(bfdh.faces2d)
    setRates(seeded.rates)
    setEnabled(seeded.enabled)
    setSeedKey((k) => k + 1)
  }

  const formList = useMemo(
    () => (bfdh ? uniqueFormRates(bfdh.faces2d) : []),
    [bfdh],
  )

  const outlineFaces = useMemo(() => {
    if (!bfdh) return []
    return applyFormRates(bfdh.faces2d, rates, enabled)
  }, [bfdh, rates, enabled])

  const faces3d = useMemo(() => {
    if (!bfdh || !bfdhCell) return []
    const ranked = bfdh.faces
      .map((f) => ({
        ...f,
        relativeR: rates[f.form] ?? f.relativeR,
      }))
      .filter((f) => enabled[f.form] !== false)
    return bfdhFaces3D(bfdhCell, ranked, 6)
  }, [bfdh, bfdhCell, rates, enabled])

  const outline = useMemo(
    () => (outlineFaces.length ? wulffPolygon2D(outlineFaces) : null),
    [outlineFaces],
  )

  const activeLabels = outline ? activeFaceLabels(outline) : []
  const r100 = rates['{100}']
  const r010 = rates['{010}']
  const orthoRatio =
    r100 != null && r100 > 0 && r010 != null
      ? r010 / r100
      : outline?.aspect ?? 1
  const habit = classifyHabit({
    aspect: outline?.aspect || 1,
    hasDiagonalFaces: activeLabels.some(
      (l) => l !== '{100}' && l !== '{010}' && l !== '{001}',
    ),
    orthoRatio,
  })

  const ratesDirty = useMemo(() => {
    if (!bfdh) return false
    for (const u of uniqueFormRates(bfdh.faces2d)) {
      if (Math.abs((rates[u.form] ?? u.rate) - u.rate) > 1e-6) return true
      if (enabled[u.form] === false) return true
    }
    return false
  }, [bfdh, rates, enabled])

  return (
    <section className="teach-section teach-interactive" aria-labelledby="morph-bfdh">
      <h2 id="morph-bfdh">Predict · BFDH from crystal</h2>
      <p className="teach-note">
        <strong>Note.</strong> BFDH (Bravais–Friedel–Donnay–Harker) ranks
        morphological importance by Donnay–Harker lattice spacing{' '}
        <strong>d<sub>DH</sub></strong>, with relative growth{' '}
        <strong>R ∝ 1/d<sub>DH</sub></strong>. It uses only the unit cell and
        lattice centering — a geometric ranking, not a surface-energy or kinetic
        model.
      </p>

      <aside className="teach-callout teach-callout-warn" role="note" aria-label="BFDH disclaimer">
        <p className="teach-callout-title">Disclaimer</p>
        <ul>
          <li>
            Teaching schematic only — not attachment-energy morphology, not
            kinetic habit, and not an industrial crystallization prediction.
          </li>
          <li>
            Harker corrections cover <strong>lattice centering</strong>{' '}
            (P/A/B/C/I/F/R). When CIF/SG <strong>operators</strong> are present,
            screw/glide reflection conditions are also applied; otherwise
            centering-only. R lattices on <em>rhombohedral</em> axes (CIF{' '}
            <code>RS</code> / <code>:R</code>) are treated as primitive; hexagonal
            R still uses −h+k+l = 3n.
          </li>
          <li>
            The default outline is a <strong>2D ab-plane slice</strong> of ranked
            forms. A simple interactive <strong>3D habit</strong> (toggle below)
            is a teaching Wulff polyhedron from the same rates — not a full
            morphological construction for arbitrary point groups.
          </li>
          <li>
            Rankings can disagree with experiment (solvent, additives, transport,
            and growth kinetics often dominate).
          </li>
        </ul>
      </aside>

      <div className="teach-preset-row" role="group" aria-label="Cached COD samples">
        {BFDH_CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            className="teach-preset-btn"
            disabled={busy}
            onClick={() => void loadCod(c.id)}
          >
            {c.short}
          </button>
        ))}
      </div>

      <div className="teach-bfdh-load">
        <label className="teach-slider-label" htmlFor="bfdh-cod">
          COD id
        </label>
        <div className="teach-bfdh-row">
          <input
            id="bfdh-cod"
            className="teach-input"
            value={codId}
            onChange={(e) => setCodId(e.target.value)}
            inputMode="numeric"
            placeholder="9008566"
            aria-label="COD entry id"
          />
          <button
            type="button"
            className="teach-preset-btn teach-btn-solid"
            disabled={busy || !codId.trim()}
            onClick={() => void loadCod(codId)}
          >
            {busy ? 'Loading…' : 'Load COD'}
          </button>
          <button
            type="button"
            className="teach-preset-btn"
            onClick={() => fileRef.current?.click()}
          >
            Upload CIF
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".cif,chemical/x-cif,text/plain"
            className="sr-only"
            onChange={(e) => void onFile(e)}
          />
        </div>

        <label className="teach-slider-label" htmlFor="bfdh-paste">
          Or paste CIF text
        </label>
        <textarea
          id="bfdh-paste"
          className="teach-textarea"
          rows={4}
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder="data_…&#10;_cell_length_a …"
        />
        <button
          type="button"
          className="teach-preset-btn"
          disabled={!paste.trim()}
          onClick={() => applyText(paste, 'Pasted CIF')}
        >
          Predict from paste
        </button>
      </div>

      {error ? <p className="teach-error" role="alert">{error}</p> : null}
      {status ? <p className="teach-caption">{status}</p> : null}

      {bfdh ? (
        <div className="teach-grid-2 teach-bfdh-result">
          <div className="teach-panel">
            <h3 className="teach-subhead">{label}</h3>
            <p className="teach-caption">
              {cellLine}
              <br />
              Centering <strong>{bfdh.centering}</strong> · {bfdh.note}
            </p>
            <div className="teach-habit-badge" data-habit={habit.kind}>
              {ratesDirty ? 'Adjusted · ' : 'BFDH · '}
              {habit.label}
            </div>
            <p className="teach-habit-blurb">{habit.blurb}</p>
            <div className="teach-preset-row" role="group" aria-label="Outline view">
              <button
                type="button"
                className={`teach-preset-btn${view3d ? '' : ' teach-btn-solid'}`}
                aria-pressed={!view3d}
                onClick={() => setView3d(false)}
              >
                2D outline
              </button>
              <button
                type="button"
                className={`teach-preset-btn${view3d ? ' teach-btn-solid' : ''}`}
                aria-pressed={view3d}
                onClick={() => setView3d(true)}
                disabled={faces3d.length < 4}
                title={
                  faces3d.length < 4
                    ? 'Need enough forms for a 3D habit'
                    : 'Show interactive 3D Wulff habit'
                }
              >
                3D habit
              </button>
            </div>
            {view3d ? (
              <WulffHabit3D
                faces={faces3d}
                habitLabel={`${ratesDirty ? 'Adjusted' : 'BFDH'} · ${habit.label}`}
              />
            ) : (
              <WulffOutline2D
                faces={outlineFaces}
                habitLabel={`${ratesDirty ? 'Adjusted' : 'BFDH'} · ${habit.label}`}
              />
            )}
            <p className="teach-caption">
              {view3d ? (
                <>
                  3D faces from top BFDH forms (with your rate tweaks). Orbit to
                  rotate. Schematic only.
                </>
              ) : (
                <>
                  2D ab-plane slice · outline faces:{' '}
                  <strong>{activeLabels.join(' · ') || '—'}</strong>. Aspect ≈{' '}
                  {outline?.aspect.toFixed(2) ?? '—'}.
                  {outlineFaces.length < 3
                    ? ' Enable at least three half-planes to draw an outline.'
                    : null}
                </>
              )}
            </p>
          </div>
          <div className="teach-panel">
            <div className="teach-bfdh-controls-head">
              <h3 className="teach-subhead">Interactive · rates from BFDH</h3>
              <button
                type="button"
                className="teach-preset-btn"
                onClick={resetToBfdh}
                disabled={!ratesDirty}
                title="Restore Donnay–Harker relative rates"
              >
                Reset to BFDH
              </button>
            </div>
            <p className="teach-caption">
              Sliders start at R ∝ 1/d<sub>DH</sub> for forms used in the 2D
              slice. Drag to explore “what if” vs the pure BFDH guess; uncheck a
              form to drop it from the outline.
            </p>
            <div key={seedKey} className="teach-bfdh-sliders">
              {formList.map((u) => {
                const val = rates[u.form] ?? u.rate
                const on = enabled[u.form] !== false
                const id = `bfdh-r-${u.form.replace(/[{}]/g, '')}`
                return (
                  <div key={u.form} className="teach-bfdh-slider-row">
                    <label className="teach-check" htmlFor={`${id}-on`}>
                      <input
                        id={`${id}-on`}
                        type="checkbox"
                        checked={on}
                        onChange={(e) =>
                          setEnabled((prev) => ({
                            ...prev,
                            [u.form]: e.target.checked,
                          }))
                        }
                      />
                      <span>{u.form}</span>
                    </label>
                    <label className="teach-slider-label" htmlFor={id}>
                      R{u.form} · {val.toFixed(2)}
                      <span className="teach-bfdh-seed">
                        {' '}
                        (BFDH {u.rate.toFixed(2)})
                      </span>
                    </label>
                    <input
                      id={id}
                      type="range"
                      min={0.3}
                      max={Math.max(3, u.rate * 2.5)}
                      step={0.05}
                      value={val}
                      disabled={!on}
                      onChange={(e) =>
                        setRates((prev) => ({
                          ...prev,
                          [u.form]: Number(e.target.value),
                        }))
                      }
                      aria-valuemin={0.3}
                      aria-valuemax={Math.max(3, u.rate * 2.5)}
                      aria-valuenow={val}
                    />
                  </div>
                )
              })}
            </div>

            <h3 className="teach-subhead">Ranked forms (BFDH)</h3>
            <div className="teach-table-wrap">
              <table className="teach-table">
                <thead>
                  <tr>
                    <th scope="col">Form</th>
                    <th scope="col">n<sub>H</sub></th>
                    <th scope="col">d<sub>DH</sub> (Å)</th>
                    <th scope="col">R ∝ 1/d</th>
                  </tr>
                </thead>
                <tbody>
                  {bfdh.faces.slice(0, 10).map((f) => (
                    <tr key={f.form}>
                      <td>{f.form}</td>
                      <td>{f.harkerN}</td>
                      <td>{f.dDh.toFixed(3)}</td>
                      <td>{f.relativeR.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="teach-caption">
              Table values are the pure BFDH ranking. Larger d<sub>DH</sub> →
              slower relative growth → more morphologically important.
              n<sub>H</sub> is the centering Harker multiple.
            </p>
          </div>
        </div>
      ) : (
        <p className="teach-caption">
          Load a cached chip (works offline on Pages), a COD id via proxy, or
          paste/upload a CIF to rank faces and open the interactive outline.
        </p>
      )}
    </section>
  )
}

