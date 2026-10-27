import { useId, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  growthRate,
  inductionTime,
  nucleationRate,
  seriesToPolyline,
  sigmaGrid,
  sizeVsTime,
  type GrowthMechanism,
} from '../data/kinetics/models'

const BOX = { x0: 48, y0: 16, x1: 300, y1: 168 }
const VB_W = 320
const VB_H = 200

function PlotFrame({
  title,
  ariaLabel,
  xLabel,
  yLabel,
  children,
}: {
  title: string
  ariaLabel: string
  xLabel: string
  yLabel: string
  children: ReactNode
}) {
  return (
    <svg
      className="teach-svg"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      role="img"
      aria-label={ariaLabel}
    >
      <title>{title}</title>
      <rect
        x={BOX.x0}
        y={BOX.y0}
        width={BOX.x1 - BOX.x0}
        height={BOX.y1 - BOX.y0}
        className="teach-plot-frame"
        rx={6}
      />
      <text
        x={(BOX.x0 + BOX.x1) / 2}
        y={VB_H - 6}
        textAnchor="middle"
        className="teach-axis-label"
      >
        {xLabel}
      </text>
      <text
        x={14}
        y={(BOX.y0 + BOX.y1) / 2}
        textAnchor="middle"
        className="teach-axis-label"
        transform={`rotate(-90 14 ${(BOX.y0 + BOX.y1) / 2})`}
      >
        {yLabel}
      </text>
      {children}
    </svg>
  )
}

function NucleationPlot({
  gamma,
  mode,
}: {
  gamma: number
  mode: 'rate' | 'induction'
}) {
  const sigmas = useMemo(() => sigmaGrid(1.2, 80), [])
  const ys = useMemo(() => {
    if (mode === 'rate') {
      return sigmas.map((s) => nucleationRate(s, gamma, { B: 0.85 }))
    }
    return sigmas.map((s) =>
      Math.min(inductionTime(s, gamma, { B: 0.85, eps: 1e-5 }), 1e5),
    )
  }, [sigmas, gamma, mode])

  const ymax = Math.max(...ys, 1e-12)
  // For induction, clamp the y-domain so the early drop is visible
  const domain =
    mode === 'rate'
      ? { xmin: 0, xmax: 1.2, ymin: 0, ymax: ymax * 1.05 }
      : {
          xmin: 0,
          xmax: 1.2,
          ymin: 0,
          ymax: Math.min(ymax, ys[Math.floor(ys.length * 0.15)]! * 3 || ymax),
        }

  const poly = seriesToPolyline(sigmas, ys, BOX, domain)

  return (
    <PlotFrame
      title={mode === 'rate' ? 'Nucleation rate vs supersaturation' : 'Induction time vs supersaturation'}
      ariaLabel={
        mode === 'rate'
          ? `Nucleation rate rising with supersaturation at interfacial energy proxy ${gamma.toFixed(2)}`
          : `Induction time falling with supersaturation at interfacial energy proxy ${gamma.toFixed(2)}`
      }
      xLabel="σ (supersaturation)"
      yLabel={mode === 'rate' ? 'J (rel.)' : 'τ (rel.)'}
    >
      <polyline points={poly} className="teach-curve teach-curve-a" fill="none" />
      <circle
        cx={BOX.x0 + ((0.5 - domain.xmin) / (domain.xmax - domain.xmin)) * (BOX.x1 - BOX.x0)}
        cy={
          BOX.y1 -
          ((ys[Math.round((0.5 / 1.2) * (sigmas.length - 1))]! - domain.ymin) /
            (domain.ymax - domain.ymin || 1)) *
            (BOX.y1 - BOX.y0)
        }
        r={3.5}
        className="teach-curve-dot"
      />
    </PlotFrame>
  )
}

function GrowthPlot({
  mechanisms,
}: {
  mechanisms: GrowthMechanism[]
}) {
  const sigmas = useMemo(() => sigmaGrid(1.0, 70), [])
  const colors: Record<GrowthMechanism, string> = {
    spiral: '#38bdf8',
    birth: '#f472b6',
    rough: '#a3e635',
  }
  const labels: Record<GrowthMechanism, string> = {
    spiral: 'Spiral ~σ²',
    birth: '2D nuc.',
    rough: 'Rough ~σ',
  }

  const series = mechanisms.map((m) => ({
    m,
    ys: sigmas.map((s) => growthRate(s, m, { C: 0.28, scale: m === 'spiral' ? 1 : m === 'rough' ? 0.85 : 1.1 })),
  }))
  const ymax = Math.max(...series.flatMap((s) => s.ys), 0.01) * 1.05
  const domain = { xmin: 0, xmax: 1, ymin: 0, ymax }

  return (
    <PlotFrame
      title="Growth rate vs supersaturation by mechanism"
      ariaLabel={`Growth rate curves for ${mechanisms.map((m) => labels[m]).join(', ')}`}
      xLabel="σ (supersaturation)"
      yLabel="R (rel.)"
    >
      {series.map(({ m, ys }) => (
        <polyline
          key={m}
          points={seriesToPolyline(sigmas, ys, BOX, domain)}
          fill="none"
          stroke={colors[m]}
          strokeWidth={2.2}
          className="teach-curve"
        />
      ))}
      {mechanisms.map((m, i) => (
        <g key={`leg-${m}`}>
          <line
            x1={58}
            y1={28 + i * 14}
            x2={78}
            y2={28 + i * 14}
            stroke={colors[m]}
            strokeWidth={2.2}
          />
          <text x={82} y={31 + i * 14} className="teach-axis-label">
            {labels[m]}
          </text>
        </g>
      ))}
    </PlotFrame>
  )
}

function SizeTimePlot({ sigma, mechanism }: { sigma: number; mechanism: GrowthMechanism }) {
  const R = growthRate(sigma, mechanism, { C: 0.28, scale: mechanism === 'spiral' ? 1 : 0.9 })
  const times = useMemo(() => Array.from({ length: 40 }, (_, i) => i), [])
  const sizes = times.map((t) => sizeVsTime(t, R, 0.5))
  const tmax = 39
  const smax = Math.max(...sizes, 1)
  const domain = { xmin: 0, xmax: tmax, ymin: 0, ymax: smax * 1.05 }
  const poly = seriesToPolyline(times, sizes, BOX, domain)

  return (
    <PlotFrame
      title="Crystal size vs time at fixed supersaturation"
      ariaLabel={`Linear size versus time at sigma ${sigma.toFixed(2)}, rate ${R.toFixed(3)}`}
      xLabel="time (rel.)"
      yLabel="size L"
    >
      <polyline points={poly} className="teach-curve teach-curve-b" fill="none" />
      <text x={BOX.x1 - 4} y={BOX.y0 + 14} textAnchor="end" className="teach-axis-label">
        R ≈ {R.toFixed(3)}
      </text>
    </PlotFrame>
  )
}

export default function KineticsPage() {
  const [gamma, setGamma] = useState(1)
  const [nucMode, setNucMode] = useState<'rate' | 'induction'>('rate')
  const [mech, setMech] = useState<GrowthMechanism[]>(['spiral', 'birth', 'rough'])
  const [sigmaGrow, setSigmaGrow] = useState(0.45)
  const [sizeMech, setSizeMech] = useState<GrowthMechanism>('spiral')
  const uid = useId()

  const toggleMech = (m: GrowthMechanism) => {
    setMech((prev) => {
      if (prev.includes(m)) {
        const next = prev.filter((x) => x !== m)
        return next.length ? next : prev
      }
      return [...prev, m]
    })
  }

  return (
    <div className="teach-page kinet-page">
      <header className="teach-hero">
        <p className="eyebrow">Crystal growth · rates</p>
        <h1>Crystal kinetics</h1>
        <p className="teach-lead">
          How fast crystals appear and grow depends on the{' '}
          <strong>driving force</strong> — often written as relative
          supersaturation σ = (c − c<sub>eq</sub>)/c<sub>eq</sub>, or S = 1 + σ.
          Nucleation and growth mechanisms change with σ; the curves below are
          teaching schematics, not fitted plant kinetics.
        </p>
      </header>

      <aside
        className="teach-callout teach-callout-warn"
        role="note"
        aria-label="Kinetics disclaimer"
      >
        <p className="teach-callout-title">Disclaimer</p>
        <ul>
          <li>
            Teaching schematics only — classical nucleation and textbook growth
            rate shapes, not calibrated to a compound, solvent, or crystallizer.
          </li>
          <li>
            Absolute rates, induction times, and sizes are arbitrary units for
            exploring curve shape vs supersaturation σ and interfacial energy.
          </li>
          <li>
            Real industrial kinetics need experiment / population balance /
            CFD; do not use these plots for process design.
          </li>
        </ul>
      </aside>


      <section className="teach-section" aria-labelledby="kin-ideas">
        <h2 id="kin-ideas">Ideas in brief</h2>
        <ul className="teach-bullets">
          <li>
            <strong>Driving force.</strong> Higher σ raises the thermodynamic
            drive to form solid. Temperature and interfacial energy enter the
            barrier height.
          </li>
          <li>
            <strong>Classical nucleation.</strong> A critical nucleus size r*
            and barrier ΔG* ≈ γ³/σ² yield a nucleation rate that stays tiny
            until σ is large enough, then rises steeply. Induction time is a
            practical inverse proxy.
          </li>
          <li>
            <strong>Growth mechanisms.</strong> Spiral (BCF-like) growth ~
            σ² at low σ; 2D nucleation / birth-and-spread is steeper; rough or
            continuous faces grow nearly linearly with σ.
          </li>
          <li>
            <strong>Size vs time.</strong> At fixed σ and mechanism, a constant
            linear growth rate gives L ≈ L₀ + R·t (schematic).
          </li>
        </ul>
      </section>

      <section className="teach-section teach-interactive" aria-labelledby="kin-nuc">
        <h2 id="kin-nuc">Interactive · nucleation vs supersaturation</h2>
        <p className="teach-caption">
          Classical-style J ∝ exp(−B γ³/σ²). Raise the interfacial-energy proxy
          γ to push the sharp rise to higher σ. Toggle induction time τ ∝ 1/J.
        </p>

        <div className="teach-grid-2">
          <div className="teach-panel">
            <div
              className="pubs-mode-tabs"
              role="tablist"
              aria-label="Nucleation plot mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={nucMode === 'rate'}
                className={`pubs-mode-tab${nucMode === 'rate' ? ' active' : ''}`}
                onClick={() => setNucMode('rate')}
              >
                Nucleation rate J
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={nucMode === 'induction'}
                className={`pubs-mode-tab${nucMode === 'induction' ? ' active' : ''}`}
                onClick={() => setNucMode('induction')}
              >
                Induction time τ
              </button>
            </div>
            <NucleationPlot gamma={gamma} mode={nucMode} />
          </div>
          <div className="teach-panel">
            <label className="teach-slider-label" htmlFor={`${uid}-gamma`}>
              Interfacial energy proxy γ · {gamma.toFixed(2)}
            </label>
            <input
              id={`${uid}-gamma`}
              type="range"
              min={0.45}
              max={1.8}
              step={0.05}
              value={gamma}
              onChange={(e) => setGamma(Number(e.target.value))}
            />
            <p className="teach-caption">
              Larger γ → higher barrier → nucleation (or short induction)
              requires more supersaturation. Dot marks σ ≈ 0.5 on the curve.
            </p>
          </div>
        </div>
      </section>

      <section className="teach-section teach-interactive" aria-labelledby="kin-growth">
        <h2 id="kin-growth">Interactive · growth rate mechanisms</h2>
        <p className="teach-caption">
          Overlay schematic R(σ) for spiral, 2D nucleation, and rough growth.
          Real crystals may switch regimes as σ changes.
        </p>
        <div className="teach-grid-2">
          <div className="teach-panel">
            <GrowthPlot mechanisms={mech} />
          </div>
          <div className="teach-panel">
            <fieldset className="teach-fieldset">
              <legend>Show mechanisms</legend>
              {(
                [
                  ['spiral', 'Spiral (BCF-like) ~σ²'],
                  ['birth', '2D nucleation / birth-and-spread'],
                  ['rough', 'Rough / continuous ~σ'],
                ] as const
              ).map(([id, label]) => (
                <label key={id} className="teach-check">
                  <input
                    type="checkbox"
                    checked={mech.includes(id)}
                    onChange={() => toggleMech(id)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
          </div>
        </div>
      </section>

      <section className="teach-section teach-interactive" aria-labelledby="kin-size">
        <h2 id="kin-size">Interactive · size vs time</h2>
        <p className="teach-caption">
          Fix σ and a mechanism; size grows linearly with the schematic rate R(σ).
        </p>
        <div className="teach-grid-2">
          <div className="teach-panel">
            <SizeTimePlot sigma={sigmaGrow} mechanism={sizeMech} />
          </div>
          <div className="teach-panel">
            <label className="teach-slider-label" htmlFor={`${uid}-sigma`}>
              Fixed σ · {sigmaGrow.toFixed(2)}
            </label>
            <input
              id={`${uid}-sigma`}
              type="range"
              min={0.05}
              max={1}
              step={0.01}
              value={sigmaGrow}
              onChange={(e) => setSigmaGrow(Number(e.target.value))}
            />
            <label className="teach-slider-label" htmlFor={`${uid}-smech`}>
              Mechanism for R(σ)
            </label>
            <select
              id={`${uid}-smech`}
              className="teach-select"
              value={sizeMech}
              onChange={(e) => setSizeMech(e.target.value as GrowthMechanism)}
            >
              <option value="spiral">Spiral ~σ²</option>
              <option value="birth">2D nucleation</option>
              <option value="rough">Rough ~σ</option>
            </select>
          </div>
        </div>
      </section>

      <footer className="teach-footer">
        <p>
          Teaching models only — classical nucleation and textbook growth-rate
          shapes. Not calibrated to a specific compound, solvent, or crystallizer.
        </p>
        <p>
          <Link to="/morphology">Crystal morphology</Link>
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
