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
} from '../data/morphology/wulff2d'
import WulffOutline2D from '../components/morphology/WulffOutline2D'
import MorphologyBfdhSection from '../components/morphology/MorphologyBfdhSection'

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
            face as a half-plane at distance ∝ growth rate. This page uses{' '}
            {'{'}100{'}'}, {'{'}010{'}'}, and {'{'}110{'}'} — not a full 3D Wulff
            for arbitrary point groups. The BFDH section below can also show a
            simple interactive 3D habit from predicted rates.
          </li>
          <li>
            <strong>BFDH.</strong> A geometric ranking from the cell and
            centering (R ∝ 1/d<sub>DH</sub>). Useful for teaching; often wrong
            vs experiment when kinetics dominate.
          </li>
        </ul>
      </section>

      <section className="teach-section teach-interactive" aria-labelledby="morph-play">
        <h2 id="morph-play">Interactive · relative rates → habit</h2>
        <p className="teach-caption">
          Drag the sliders or pick a preset. The 2D outline updates from the
          half-plane construction; the badge names a common habit family.
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
            <WulffOutline2D faces={faces} habitLabel={habit.label} />
            <p className="teach-caption">
              Bar lengths compare the three family rates. Faces on the outline:{' '}
              <strong>{labels.join(' · ') || '—'}</strong>. Aspect ≈{' '}
              {result.aspect.toFixed(2)}.
            </p>
          </div>
          <div className="teach-panel">
            <FaceRateBars Ra={Ra} Rb={Rb} Rc={Rc} />
            <label className="teach-slider-label" htmlFor="morph-ra">
              R{'{'}100{'}'} · {Ra.toFixed(2)}
            </label>
            <input
              id="morph-ra"
              type="range"
              min={0.3}
              max={3}
              step={0.05}
              value={Ra}
              onChange={(e) => setRa(Number(e.target.value))}
            />
            <label className="teach-slider-label" htmlFor="morph-rb">
              R{'{'}010{'}'} · {Rb.toFixed(2)}
            </label>
            <input
              id="morph-rb"
              type="range"
              min={0.3}
              max={3}
              step={0.05}
              value={Rb}
              onChange={(e) => setRb(Number(e.target.value))}
            />
            <label className="teach-slider-label" htmlFor="morph-rc">
              R{'{'}110{'}'} · {Rc.toFixed(2)}
            </label>
            <input
              id="morph-rc"
              type="range"
              min={0.3}
              max={3}
              step={0.05}
              value={Rc}
              onChange={(e) => setRc(Number(e.target.value))}
            />
          </div>
        </div>
      </section>

      <MorphologyBfdhSection />

      <footer className="teach-footer">
        <p>
          Schematic 2D Wulff / relative-velocity model for teaching. The BFDH
          predictor adds a geometric ranking from the crystal cell; the optional
          3D habit is a simple polyhedron from those rates — not industrial
          morphology software.
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
