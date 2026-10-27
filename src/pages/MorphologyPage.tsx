import { useMemo, useState } from 'react'
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

const VB = 320
const PAD = 28
const PLOT = VB - 2 * PAD

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
  let scale = 1
  if (pts.length >= 3) {
    const xs = pts.map((v) => v.x)
    const ys = pts.map((v) => v.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const span = Math.max(maxX - minX, maxY - minY, 1e-6)
    scale = PLOT / span
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

  // Face mid-edge labels: for each unique label, find midpoint of that face segment
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
      // Push label slightly outward
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
      {/* axes */}
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
          Schematic 2D Wulff / relative-velocity model for teaching. Not a full
          3D equilibrium shape for arbitrary point groups, and not a fitted
          industrial morphology prediction.
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
