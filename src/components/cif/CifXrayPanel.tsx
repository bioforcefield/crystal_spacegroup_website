import { useId, useMemo, useState } from 'react'
import type { ExpandedStructure } from '../../data/cif/types'
import {
  WAVELENGTH_PRESETS,
  type WavelengthPresetId,
} from '../../data/cif/xray/bragg'
import {
  envelopePolyline,
  lorentzEnvelope,
} from '../../data/cif/xray/envelope'
import {
  computePowderFromStructure,
  type PowderPeak,
} from '../../data/cif/xray/powder'

const BOX = { x0: 44, y0: 14, x1: 312, y1: 168 }
const VB_W = 336
const VB_H = 200

function formatR(v: number | undefined): string | null {
  if (v == null || !Number.isFinite(v)) return null
  if (v >= 1) return v.toFixed(2)
  return v.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
}

export interface CifXrayPanelProps {
  structure: ExpandedStructure
}

export default function CifXrayPanel({ structure }: CifXrayPanelProps) {
  const uid = useId()
  const xray = structure.metadata?.xray
  const cifLambda = xray?.wavelengthA

  const [preset, setPreset] = useState<WavelengthPresetId | 'cif' | 'custom'>(
    () => {
      if (cifLambda != null && Math.abs(cifLambda - 1.5406) < 0.02) return 'Cu'
      if (cifLambda != null && Math.abs(cifLambda - 0.71073) < 0.02) return 'Mo'
      if (cifLambda != null && Math.abs(cifLambda - 1.7902) < 0.02) return 'Co'
      if (cifLambda != null) return 'cif'
      return 'Cu'
    },
  )
  const [customLambda, setCustomLambda] = useState(cifLambda ?? 1.5406)
  const [tMin, setTMin] = useState(5)
  const [tMax, setTMax] = useState(60)
  const [fwhm, setFwhm] = useState(0.25)
  const [hover, setHover] = useState<PowderPeak | null>(null)
  const [showSticks, setShowSticks] = useState(true)

  const wavelengthA = useMemo(() => {
    if (preset === 'custom' || preset === 'cif') {
      return customLambda > 0 ? customLambda : 1.5406
    }
    const p = WAVELENGTH_PRESETS.find((w) => w.id === preset)
    return p?.angstrom ?? 1.5406
  }, [preset, customLambda])

  const pattern = useMemo(() => {
    const lo = Math.min(tMin, tMax)
    const hi = Math.max(tMin, tMax)
    return computePowderFromStructure(structure, {
      wavelengthA,
      twoThetaMin: lo,
      twoThetaMax: hi,
    })
  }, [structure, wavelengthA, tMin, tMax])

  const envelope = useMemo(() => {
    const lo = Math.min(tMin, tMax)
    const hi = Math.max(tMin, tMax)
    return lorentzEnvelope(
      pattern.peaks.map((p) => ({ twoTheta: p.twoTheta, intensity: p.intensity })),
      lo,
      hi,
      fwhm,
      360,
    )
  }, [pattern.peaks, tMin, tMax, fwhm])

  const poly = useMemo(() => {
    if (!envelope.x.length) return ''
    return envelopePolyline(envelope.x, envelope.y, BOX, {
      xmin: Math.min(tMin, tMax),
      xmax: Math.max(tMin, tMax),
      ymin: 0,
      ymax: 105,
    })
  }, [envelope, tMin, tMax])

  const hasMeta =
    xray &&
    (xray.wavelengthA != null ||
      xray.radiationType ||
      xray.probe ||
      xray.temperatureK != null ||
      xray.rFactorAll != null ||
      xray.wRFactorRef != null ||
      xray.gof != null)

  const lo = Math.min(tMin, tMax)
  const hi = Math.max(tMin, tMax)
  const dx = hi - lo || 1

  return (
    <section className="seed-box cif-xray" aria-labelledby="cif-xray-heading">
      <h2 id="cif-xray-heading">X-ray · powder</h2>

      <p className="teach-note">
        <strong>Note.</strong> Calculated schematic PXRD from the loaded CIF
        model (cell + sites + lattice centering). Hover a stick for hkl / d /
        2θ / I. Not measured data.
      </p>

      <aside
        className="teach-callout teach-callout-warn"
        role="note"
        aria-label="X-ray disclaimer"
      >
        <p className="teach-callout-title">Disclaimer</p>
        <ul>
          <li>Teaching simulation — not a Rietveld fit or instrument pattern.</li>
          <li>Atomic form factors are compact Cromer–Mann-style approximations.</li>
          <li>No preferred orientation, absorption, or background model.</li>
          <li>Screw/glide extinctions beyond lattice centering are not fully enforced (they emerge only when the full operator list is present).</li>
        </ul>
      </aside>

      {hasMeta && (
        <div className="cif-xray-meta">
          <h3 className="teach-subhead">Experiment (from CIF)</h3>
          <dl className="meta-grid">
            {xray!.radiationType && (
              <div>
                <dt>Radiation</dt>
                <dd>{xray!.radiationType}{xray!.probe ? ` · ${xray!.probe}` : ''}</dd>
              </div>
            )}
            {!xray!.radiationType && xray!.probe && (
              <div>
                <dt>Probe</dt>
                <dd>{xray!.probe}</dd>
              </div>
            )}
            {xray!.wavelengthA != null && (
              <div>
                <dt>λ</dt>
                <dd>{xray!.wavelengthA.toFixed(5)} Å</dd>
              </div>
            )}
            {xray!.temperatureK != null && (
              <div>
                <dt>T</dt>
                <dd>{xray!.temperatureK} K</dd>
              </div>
            )}
            {xray!.rFactorAll != null && (
              <div>
                <dt>R (all)</dt>
                <dd>{formatR(xray!.rFactorAll)}</dd>
              </div>
            )}
            {xray!.wRFactorRef != null && (
              <div>
                <dt>wR (ref)</dt>
                <dd>{formatR(xray!.wRFactorRef)}</dd>
              </div>
            )}
            {xray!.gof != null && (
              <div>
                <dt>GoF</dt>
                <dd>{formatR(xray!.gof)}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      <div className="cif-xray-controls">
        <div className="cif-xray-presets" role="group" aria-label="Wavelength preset">
          {WAVELENGTH_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`seg${preset === p.id ? ' active' : ''}`}
              aria-pressed={preset === p.id}
              onClick={() => {
                setPreset(p.id)
                setCustomLambda(p.angstrom)
              }}
            >
              {p.label}
            </button>
          ))}
          {cifLambda != null && (
            <button
              type="button"
              className={`seg${preset === 'cif' ? ' active' : ''}`}
              aria-pressed={preset === 'cif'}
              onClick={() => {
                setPreset('cif')
                setCustomLambda(cifLambda)
              }}
              title={`CIF λ = ${cifLambda} Å`}
            >
              CIF λ
            </button>
          )}
          <button
            type="button"
            className={`seg${preset === 'custom' ? ' active' : ''}`}
            aria-pressed={preset === 'custom'}
            onClick={() => setPreset('custom')}
          >
            Custom
          </button>
        </div>

        <label className="teach-slider-label" htmlFor={`${uid}-lambda`}>
          λ = {wavelengthA.toFixed(4)} Å
          <input
            id={`${uid}-lambda`}
            type="range"
            min={0.5}
            max={2.3}
            step={0.01}
            value={wavelengthA}
            onChange={(e) => {
              setPreset('custom')
              setCustomLambda(Number(e.target.value))
            }}
          />
        </label>

        <label className="teach-slider-label" htmlFor={`${uid}-tmin`}>
          2θ min = {lo.toFixed(0)}°
          <input
            id={`${uid}-tmin`}
            type="range"
            min={1}
            max={80}
            step={1}
            value={tMin}
            onChange={(e) => setTMin(Number(e.target.value))}
          />
        </label>

        <label className="teach-slider-label" htmlFor={`${uid}-tmax`}>
          2θ max = {hi.toFixed(0)}°
          <input
            id={`${uid}-tmax`}
            type="range"
            min={20}
            max={120}
            step={1}
            value={tMax}
            onChange={(e) => setTMax(Number(e.target.value))}
          />
        </label>

        <label className="teach-slider-label" htmlFor={`${uid}-fwhm`}>
          Peak width (FWHM) = {fwhm.toFixed(2)}°
          <input
            id={`${uid}-fwhm`}
            type="range"
            min={0.05}
            max={1.5}
            step={0.05}
            value={fwhm}
            onChange={(e) => setFwhm(Number(e.target.value))}
          />
        </label>

        <label className="cif-xray-check">
          <input
            type="checkbox"
            checked={showSticks}
            onChange={(e) => setShowSticks(e.target.checked)}
          />
          Show sticks
        </label>
      </div>

      <div className="cif-xray-chart-wrap">
        <svg
          className="teach-svg cif-xray-svg"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          role="img"
          aria-label={`Simulated powder pattern, ${pattern.peaks.length} peaks, wavelength ${wavelengthA.toFixed(4)} angstrom`}
        >
          <title>Simulated PXRD</title>
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
            y={VB_H - 4}
            textAnchor="middle"
            className="teach-axis-label"
          >
            2θ (°)
          </text>
          <text
            x={12}
            y={(BOX.y0 + BOX.y1) / 2}
            textAnchor="middle"
            className="teach-axis-label"
            transform={`rotate(-90 12 ${(BOX.y0 + BOX.y1) / 2})`}
          >
            I (rel.)
          </text>
          {/* tick labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const t = lo + f * dx
            const px = BOX.x0 + f * (BOX.x1 - BOX.x0)
            return (
              <text
                key={f}
                x={px}
                y={BOX.y1 + 12}
                textAnchor="middle"
                className="teach-axis-label"
              >
                {t.toFixed(0)}
              </text>
            )
          })}
          {poly && (
            <polyline
              points={poly}
              className="teach-curve teach-curve-a"
              fill="none"
            />
          )}
          {showSticks &&
            pattern.peaks.map((p) => {
              const px =
                BOX.x0 + ((p.twoTheta - lo) / dx) * (BOX.x1 - BOX.x0)
              const py =
                BOX.y1 - (p.intensity / 105) * (BOX.y1 - BOX.y0)
              const active = hover?.hkl === p.hkl && Math.abs((hover?.twoTheta ?? 0) - p.twoTheta) < 0.05
              return (
                <g key={`${p.hkl}-${p.twoTheta.toFixed(3)}`}>
                  <line
                    x1={px}
                    y1={BOX.y1}
                    x2={px}
                    y2={py}
                    className={active ? 'cif-xray-stick active' : 'cif-xray-stick'}
                  />
                  <circle
                    cx={px}
                    cy={py}
                    r={active ? 4.5 : 3}
                    className={active ? 'teach-curve-dot active' : 'teach-curve-dot'}
                    tabIndex={0}
                    role="button"
                    aria-label={`Peak ${p.hkl}, d ${p.d.toFixed(3)} Å, 2θ ${p.twoTheta.toFixed(2)}°, I ${p.intensity.toFixed(1)}`}
                    onMouseEnter={() => setHover(p)}
                    onFocus={() => setHover(p)}
                    onMouseLeave={() => setHover(null)}
                    onBlur={() => setHover(null)}
                  />
                </g>
              )
            })}
        </svg>
      </div>

      <div className="cif-xray-hover" aria-live="polite">
        {hover ? (
          <p>
            <strong>({hover.hkl})</strong>
            {' · '}d = {hover.d.toFixed(3)} Å
            {' · '}2θ = {hover.twoTheta.toFixed(2)}°
            {' · '}I = {hover.intensity.toFixed(1)}
            {' · '}mult ≈ {hover.multiplicity}
          </p>
        ) : (
          <p className="hint">
            {pattern.peaks.length} peaks · centering {pattern.centering} · |hkl| ≤{' '}
            {pattern.maxH} · {pattern.siteCount} sites
            {pattern.truncated ? ' · truncated' : ''}
          </p>
        )}
      </div>

      {pattern.warnings.length > 0 && (
        <ul className="cif-warnings">
          {pattern.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      {pattern.peaks.length > 0 && (
        <details className="cif-xray-table">
          <summary>Peak list ({Math.min(pattern.peaks.length, 40)} shown)</summary>
          <div className="cif-xray-table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">hkl</th>
                  <th scope="col">d (Å)</th>
                  <th scope="col">2θ (°)</th>
                  <th scope="col">I</th>
                </tr>
              </thead>
              <tbody>
                {[...pattern.peaks]
                  .sort((a, b) => b.intensity - a.intensity)
                  .slice(0, 40)
                  .map((p) => (
                    <tr
                      key={`row-${p.hkl}-${p.twoTheta.toFixed(3)}`}
                      onMouseEnter={() => setHover(p)}
                      onMouseLeave={() => setHover(null)}
                    >
                      <td className="mono">{p.hkl}</td>
                      <td>{p.d.toFixed(3)}</td>
                      <td>{p.twoTheta.toFixed(2)}</td>
                      <td>{p.intensity.toFixed(1)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  )
}
