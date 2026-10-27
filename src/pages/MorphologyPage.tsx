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
import { rankBfdh, type BfdhResult } from '../data/morphology/bfdh'
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

function BfdhPredictSection() {
  const [codId, setCodId] = useState('9008565')
  const [paste, setPaste] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [label, setLabel] = useState<string | null>(null)
  const [cellLine, setCellLine] = useState<string | null>(null)
  const [bfdh, setBfdh] = useState<BfdhResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const applyText = (text: string, sourceNote: string) => {
    try {
      const { result, label: lab, cellLine: cell } = runBfdhFromCifText(text)
      setBfdh(result)
      setLabel(lab)
      setCellLine(cell)
      setStatus(sourceNote)
      setError(null)
    } catch (e) {
      setBfdh(null)
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

  const outlineFaces = bfdh?.faces2d ?? []
  const outline = useMemo(
    () => (outlineFaces.length ? wulffPolygon2D(outlineFaces) : null),
    [outlineFaces],
  )

  return (
    <section className="teach-section teach-interactive" aria-labelledby="morph-bfdh">
      <h2 id="morph-bfdh">Predict · BFDH from crystal</h2>
      <p className="teach-caption">
        Bravais–Friedel–Donnay–Harker ranks faces by lattice spacing with Harker
        corrections from lattice centering. Relative growth{' '}
        <strong>R ∝ 1/d<sub>DH</sub></strong>. This is a{' '}
        <strong>geometric heuristic</strong> from the cell alone — not attachment
        energy, not kinetic morphology, and not a full 3D Wulff for arbitrary
        point groups. The outline is an <strong>ab-plane 2D teaching slice</strong>{' '}
        of the ranked forms.
      </p>

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
            <WulffOutline
              faces={outlineFaces}
              habitLabel={`BFDH · ${bfdh.centering}`}
            />
            <p className="teach-caption">
              Outline faces:{' '}
              <strong>
                {outline
                  ? activeFaceLabels(outline).join(' · ') || '—'
                  : '—'}
              </strong>
              . Aspect ≈ {outline?.aspect.toFixed(2) ?? '—'}.
            </p>
          </div>
          <div className="teach-panel">
            <h3 className="teach-subhead">Ranked forms (top)</h3>
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
              Larger d<sub>DH</sub> → slower relative growth → more morphologically
              important. n<sub>H</sub> is the Harker multiple required by centering.
            </p>
          </div>
        </div>
      ) : (
        <p className="teach-caption">
          Load a cached chip (works offline on Pages), a COD id via proxy, or
          paste/upload a CIF to rank faces.
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
          Schematic 2D Wulff / relative-velocity model for teaching. BFDH
          predictor uses cell + centering only. Not a full 3D equilibrium shape
          for arbitrary point groups, and not a fitted industrial morphology
          prediction.
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
