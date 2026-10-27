import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  HABIT_PRESETS,
  classifyHabit,
} from '../data/morphology/habit'
import {
  activeFaceLabels,
  teachingFaces2D,
  wulffPolygon2D,
  type FaceSpec,
} from '../data/morphology/wulff2d'
import {
  applyFormRates,
  rankBfdh,
  uniqueFormRates,
  type BfdhResult,
} from '../data/morphology/bfdh'
import { parseCif } from '../data/cif/parseCif'
import {
  CorsBlockedError,
  CsdManualError,
  NotFoundError,
  fetchRemoteCif,
} from '../data/cif/fetchRemoteCif'

const VB = 320
const PAD = 28
const PLOT = VB - 2 * PAD

const BFDH_CHIPS: ReadonlyArray<{ id: string; short: string }> = [
  { id: '9008565', short: 'Si · Fd-3m' },
  { id: '9000001', short: 'PbS · Fm-3m' },
  { id: '1010962', short: 'Calcite · R-3c' },
  { id: '9011577', short: 'Graphite · P63/mmc' },
  { id: '1507756', short: 'BaTiO₃ · P4mm' },
  { id: '1100303', short: 'Organic · P-1' },
  { id: '1010916', short: 'Apatite · P63/m' },
]

function rateBarMax(Ra: number, Rb: number, Rc: number) {
  return Math.max(Ra, Rb, Rc, 0.01)
}

function FaceRateBars({
  Ra,
  Rb,
  Rc,
}: {
  Ra: number
  Rb: number
  Rc: number
}) {
  const max = rateBarMax(Ra, Rb, Rc)
  const rows: { label: string; value: number; color: string }[] = [
    { label: 'R{100}', value: Ra, color: '#38bdf8' },
    { label: 'R{010}', value: Rb, color: '#a78bfa' },
    { label: 'R{110}', value: Rc, color: '#f472b6' },
  ]
  return (
    <svg
      className="teach-svg"
      viewBox="0 0 320 140"
      role="img"
      aria-label={`Relative growth rates: R100 ${Ra.toFixed(2)}, R010 ${Rb.toFixed(2)}, R110 ${Rc.toFixed(2)}`}
    >
      <title>Relative face growth rates</title>
      {rows.map((r, i) => {
        const y = 22 + i * 38
        const w = (r.value / max) * 220
        return (
          <g key={r.label}>
            <text x={8} y={y + 12} className="teach-axis-label">
              {r.label}
            </text>
            <rect
              x={72}
              y={y}
              width={220}
              height={18}
              rx={4}
              className="teach-bar-track"
            />
            <rect
              x={72}
              y={y}
              width={Math.max(2, w)}
              height={18}
              rx={4}
              fill={r.color}
              opacity={0.9}
            />
            <text x={300} y={y + 13} textAnchor="end" className="teach-axis-label">
              {r.value.toFixed(2)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function WulffOutline({
  faces,
  habitLabel,
}: {
  faces: FaceSpec[]
  habitLabel: string
}) {
  const result = useMemo(() => wulffPolygon2D(faces), [faces])
  const labels = activeFaceLabels(result)

  const pts = result.vertices
  let poly = ''
  if (pts.length >= 3) {
    const xs = pts.map((v) => v.x)
    const ys = pts.map((v) => v.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const span = Math.max(maxX - minX, maxY - minY, 1e-6)
    const scale = PLOT / span
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    poly = pts
      .map((v) => {
        const x = VB / 2 + (v.x - cx) * scale
        const y = VB / 2 - (v.y - cy) * scale
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }

  const edgeLabels: { x: number; y: number; text: string }[] = []
  if (pts.length >= 3) {
    const xs = pts.map((v) => v.x)
    const ys = pts.map((v) => v.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const span = Math.max(maxX - minX, maxY - minY, 1e-6)
    const sc = PLOT / span
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const toSvg = (x: number, y: number) => ({
      x: VB / 2 + (x - cx) * sc,
      y: VB / 2 - (y - cy) * sc,
    })
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]!
      const b = pts[(i + 1) % pts.length]!
      const shared =
        a.faces.find((f) => b.faces.includes(f)) ?? a.faces[0]
      const mx = (a.x + b.x) / 2
      const my = (a.y + b.y) / 2
      const L = Math.hypot(mx, my) || 1
      const ox = mx + (mx / L) * 0.12 * span
      const oy = my + (my / L) * 0.12 * span
      const p = toSvg(ox, oy)
      if (!edgeLabels.some((e) => e.text === shared && Math.hypot(e.x - p.x, e.y - p.y) < 20)) {
        edgeLabels.push({ x: p.x, y: p.y, text: shared })
      }
    }
  }

  return (
    <svg
      className="teach-svg teach-wulff-svg"
      viewBox={`0 0 ${VB} ${VB}`}
      role="img"
      aria-label={`2D Wulff outline habit ${habitLabel}. Active faces: ${labels.join(', ') || 'none'}. Aspect ${result.aspect.toFixed(2)}.`}
    >
      <title>2D crystal outline from relative growth rates</title>
      <rect
        x={PAD}
        y={PAD}
        width={PLOT}
        height={PLOT}
        className="teach-plot-frame"
        rx={8}
      />
      <line
        x1={VB / 2}
        y1={PAD + 8}
        x2={VB / 2}
        y2={VB - PAD - 8}
        className="teach-axis-guide"
      />
      <line
        x1={PAD + 8}
        y1={VB / 2}
        x2={VB - PAD - 8}
        y2={VB / 2}
        className="teach-axis-guide"
      />
      {poly ? (
        <polygon points={poly} className="teach-crystal-poly" />
      ) : (
        <text x={VB / 2} y={VB / 2} textAnchor="middle" className="teach-axis-label">
          Adjust rates
        </text>
      )}
      {edgeLabels.map((e, i) => (
        <text
          key={`${e.text}-${i}`}
          x={e.x}
          y={e.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="teach-face-label"
        >
          {e.text}
        </text>
      ))}
      <text x={VB / 2} y={18} textAnchor="middle" className="teach-axis-label">
        {habitLabel} · aspect {result.aspect.toFixed(2)}
      </text>
    </svg>
  )
}

function runBfdhFromCifText(text: string): {
  result: BfdhResult
  label: string
  cellLine: string
} {
  const parsed = parseCif(text)
  const result = rankBfdh(parsed.cell, {
    hm: parsed.spaceGroupName,
    maxIndex: 2,
    topN: 12,
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
  return { result, label, cellLine }
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

function BfdhPredictSection() {
  const [codId, setCodId] = useState('9008565')
  const [paste, setPaste] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [label, setLabel] = useState<string | null>(null)
  const [cellLine, setCellLine] = useState<string | null>(null)
  const [bfdh, setBfdh] = useState<BfdhResult | null>(null)
  const [rates, setRates] = useState<Record<string, number>>({})
  const [enabled, setEnabled] = useState<Record<string, boolean>>({})
  const [seedKey, setSeedKey] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const applyText = (text: string, sourceNote: string) => {
    try {
      const { result, label: lab, cellLine: cell } = runBfdhFromCifText(text)
      const seeded = seedRates(result.faces2d)
      setBfdh(result)
      setRates(seeded.rates)
      setEnabled(seeded.enabled)
      setSeedKey((k) => k + 1)
      setLabel(lab)
      setCellLine(cell)
      setStatus(sourceNote)
      setError(null)
    } catch (e) {
      setBfdh(null)
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
            Harker corrections here cover <strong>lattice centering</strong>{' '}
            (P/A/B/C/I/F/R). R lattices on <em>rhombohedral</em> axes (CIF{' '}
            <code>RS</code> / <code>:R</code>) are treated as primitive; hexagonal
            R still uses −h+k+l = 3n. Screw and glide extinctions are not applied.
          </li>
          <li>
            The outline is a <strong>2D ab-plane slice</strong> of ranked forms,
            not a full 3D Wulff construction for arbitrary point groups.
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
            <WulffOutline
              faces={outlineFaces}
              habitLabel={`${ratesDirty ? 'Adjusted' : 'BFDH'} · ${habit.label}`}
            />
            <p className="teach-caption">
              Outline faces:{' '}
              <strong>{activeLabels.join(' · ') || '—'}</strong>. Aspect ≈{' '}
              {outline?.aspect.toFixed(2) ?? '—'}.
              {outlineFaces.length < 3
                ? ' Enable at least three half-planes to draw an outline.'
                : null}
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

export default function MorphologyPage() {
  const [Ra, setRa] = useState(1)
  const [Rb, setRb] = useState(1)
  const [Rc, setRc] = useState(1.55)

  const faces = useMemo(() => teachingFaces2D(Ra, Rb, Rc), [Ra, Rb, Rc])
  const result = useMemo(() => wulffPolygon2D(faces), [faces])
  const labels = activeFaceLabels(result)
  const habit = classifyHabit({
    aspect: result.aspect || 1,
    hasDiagonalFaces: labels.includes('{110}'),
    orthoRatio: Rb / Math.max(Ra, 1e-9),
  })

  const applyPreset = (id: string) => {
    const p = HABIT_PRESETS.find((x) => x.id === id)
    if (!p) return
    setRa(p.Ra)
    setRb(p.Rb)
    setRc(p.Rc)
  }

  return (
    <div className="teach-page morph-page">
      <header className="teach-hero">
        <p className="eyebrow">Crystal growth · shape</p>
        <h1>Crystal morphology</h1>
        <p className="teach-lead">
          Habit is the outer shape a crystal tends to show — which faces appear
          and how large they are. In a simple kinetic picture,{' '}
          <strong>slower-growing faces dominate</strong> the outline because the
          distance from the center to a face scales with its growth rate (Wulff /
          relative-velocity idea).
        </p>
      </header>

      <section className="teach-section" aria-labelledby="morph-ideas">
        <h2 id="morph-ideas">Ideas in brief</h2>
        <ul className="teach-bullets">
          <li>
            <strong>Habit vs morphology.</strong> Habit is the overall
            appearance (cube, needle, plate). Morphology includes the set of
            Miller faces {'{'}hkl{'}'} and their relative areas.
          </li>
          <li>
            <strong>Miller faces.</strong> Each flat side is a lattice plane.
            Relative growth rates of those faces set the aspect.
          </li>
          <li>
            <strong>Wulff / relative velocity (2D schematic).</strong> Draw each
            face at distance ∝ growth rate from a common center; the inner
            envelope is the crystal outline. This page uses a 2D slice with
            {'{'}100{'}'}, {'{'}010{'}'}, and {'{'}110{'}'} — not a full 3D Wulff
            for arbitrary point groups.
          </li>
          <li>
            <strong>BFDH vs attachment energy vs kinetic morphologies.</strong>{' '}
            BFDH ranks faces by lattice spacing; attachment-energy models use
            binding strength; kinetic morphologies follow face speeds under
            supersaturation and additives. All are models — real habits also
            depend on solvent, impurities, and transport.
          </li>
        </ul>
      </section>

      <section className="teach-section teach-interactive" aria-labelledby="morph-live">
        <h2 id="morph-live">Interactive · 2D outline from face rates</h2>
        <p className="teach-caption">
          Teaching schematic: drag the relative growth rates. When R{'{'}110{'}'}{' '}
          drops, diagonals cut the corners (octagon). Stretch R{'{'}010{'}'} vs
          R{'{'}100{'}'} for prism → plate → needle.
        </p>

        <div className="teach-preset-row" role="group" aria-label="Habit presets">
          {HABIT_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="teach-preset-btn"
              onClick={() => applyPreset(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="teach-grid-2">
          <div className="teach-panel">
            <div className="teach-habit-badge" data-habit={habit.kind}>
              {habit.label}
            </div>
            <p className="teach-habit-blurb">{habit.blurb}</p>
            <WulffOutline faces={faces} habitLabel={habit.label} />
          </div>

          <div className="teach-panel">
            <h3 className="teach-subhead">Relative growth rates</h3>
            <label className="teach-slider-label" htmlFor="morph-ra">
              R{'{'}100{'}'} (left/right) · {Ra.toFixed(2)}
            </label>
            <input
              id="morph-ra"
              type="range"
              min={0.4}
              max={5}
              step={0.05}
              value={Ra}
              onChange={(e) => setRa(Number(e.target.value))}
              aria-valuemin={0.4}
              aria-valuemax={5}
              aria-valuenow={Ra}
            />
            <label className="teach-slider-label" htmlFor="morph-rb">
              R{'{'}010{'}'} (top/bottom) · {Rb.toFixed(2)}
            </label>
            <input
              id="morph-rb"
              type="range"
              min={0.4}
              max={5}
              step={0.05}
              value={Rb}
              onChange={(e) => setRb(Number(e.target.value))}
              aria-valuemin={0.4}
              aria-valuemax={5}
              aria-valuenow={Rb}
            />
            <label className="teach-slider-label" htmlFor="morph-rc">
              R{'{'}110{'}'} (diagonals) · {Rc.toFixed(2)}
            </label>
            <input
              id="morph-rc"
              type="range"
              min={0.55}
              max={5}
              step={0.05}
              value={Rc}
              onChange={(e) => setRc(Number(e.target.value))}
              aria-valuemin={0.55}
              aria-valuemax={5}
              aria-valuenow={Rc}
            />

            <FaceRateBars Ra={Ra} Rb={Rb} Rc={Rc} />

            <p className="teach-caption">
              Bar lengths compare the three family rates. Faces on the outline:{' '}
              <strong>{labels.join(' · ') || '—'}</strong>. Aspect ratio ≈{' '}
              {result.aspect.toFixed(2)}.
            </p>
          </div>
        </div>
      </section>

      <BfdhPredictSection />

      <section className="teach-section" aria-labelledby="morph-habits">
        <h2 id="morph-habits">Common habits from rate ratios</h2>
        <div className="teach-cards">
          <article className="teach-card">
            <h3>Cube</h3>
            <p>
              Equal orthogonal rates; diagonals far from the center so corners
              stay sharp.
            </p>
          </article>
          <article className="teach-card">
            <h3>Prism</h3>
            <p>
              Mild anisotropy stretches one axis — rectangular outline in this
              2D model.
            </p>
          </article>
          <article className="teach-card">
            <h3>Plate</h3>
            <p>
              One direction much faster: the crystal flattens or elongates into
              a lath/plate habit.
            </p>
          </article>
          <article className="teach-card">
            <h3>Needle</h3>
            <p>
              Extreme rate contrast → highly elongated habit. Additives often
              poison fast faces to reshape products.
            </p>
          </article>
        </div>
      </section>

      <footer className="teach-footer">
        <p>
          Schematic 2D Wulff / relative-velocity model for teaching. The BFDH
          tool ranks faces from the cell and lattice centering, then lets you
          adjust those rates interactively — see the disclaimer on that section.
        </p>
        <p>
          <Link to="/kinetics">Crystal kinetics</Link>
          {' · '}
          <Link to="/cif">CIF map</Link>
          {' · '}
          <Link to="/pubs">Publications</Link>
          {' · '}
          <Link to="/">Home</Link>
        </p>
      </footer>
    </div>
  )
}
