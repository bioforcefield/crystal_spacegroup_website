import {
  useCallback,
  useId,
  useMemo,
  useState,
  type ChangeEvent,
} from 'react'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { expandStructure } from '../../data/cif/expandStructure'
import {
  CorsBlockedError,
  fetchRemoteCif,
  NotFoundError,
  sourceBadgeLabel,
} from '../../data/cif/fetchRemoteCif'
import { parseCif } from '../../data/cif/parseCif'
import type { ExpandedStructure } from '../../data/cif/types'
import {
  WAVELENGTH_PRESETS,
  type WavelengthPresetId,
} from '../../data/cif/xray/bragg'
import {
  envelopePolyline,
  lorentzEnvelope,
} from '../../data/cif/xray/envelope'
import { peakShiftTable, topPeaksByIntensity } from '../../data/cif/xray/peakCompare'
import {
  POLYMORPH_PAIRS,
  type PolymorphPair,
} from '../../data/cif/xray/polymorphPairs'
import {
  computePowderFromStructure,
  type PowderPeak,
} from '../../data/cif/xray/powder'
import CifPolymorphCompare from './CifPolymorphCompare'

const BOX = { x0: 44, y0: 14, x1: 312, y1: 168 }
const VB_W = 336
const VB_H = 200

/** Letter multiset for a loose chemistry compatibility check (teaching UX). */
function formulaLetterKey(s: string): string {
  return [
    ...s
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z]/g, ''),
  ]
    .sort()
    .join('')
}

function chemistriesCompatible(
  formula: string | undefined,
  chemistry: string,
): boolean {
  if (!formula?.trim()) return true
  const a = formulaLetterKey(formula)
  const b = formulaLetterKey(chemistry)
  if (!a || !b) return true
  return a === b
}

function formatR(v: number | undefined): string | null {
  if (v == null || !Number.isFinite(v)) return null
  if (v >= 1) return v.toFixed(2)
  return v.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
}

function formLabel(structure: ExpandedStructure, fallback: string): string {
  return (
    structure.metadata?.name ||
    structure.metadata?.formula ||
    structure.spaceGroupName ||
    fallback
  )
}

interface FormBState {
  structure: ExpandedStructure
  label: string
  codId: string | null
  sourceNote: string
  pairId: string | null
}

export interface CifXrayPanelProps {
  structure: ExpandedStructure
  /** Load a COD id into the main CIF map (3D view). Overlay B stays until cleared. */
  onLoadCodId?: (id: string) => void
}

export default function CifXrayPanel({
  structure,
  onLoadCodId,
}: CifXrayPanelProps) {
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
  const [hover, setHover] = useState<{ peak: PowderPeak; form: 'A' | 'B' } | null>(
    null,
  )
  const [showSticks, setShowSticks] = useState(true)

  const [formB, setFormB] = useState<FormBState | null>(null)
  const [busyB, setBusyB] = useState(false)
  const [errorB, setErrorB] = useState<string | null>(null)
  const [codBInput, setCodBInput] = useState('')
  const [pasteBOpen, setPasteBOpen] = useState(false)
  const [pasteBText, setPasteBText] = useState('')
  const [activePairId, setActivePairId] = useState<string | null>(null)

  const wavelengthA = useMemo(() => {
    if (preset === 'custom' || preset === 'cif') {
      return customLambda > 0 ? customLambda : 1.5406
    }
    const p = WAVELENGTH_PRESETS.find((w) => w.id === preset)
    return p?.angstrom ?? 1.5406
  }, [preset, customLambda])

  const optsLive = useMemo(() => {
    const lo = Math.min(tMin, tMax)
    const hi = Math.max(tMin, tMax)
    return { wavelengthA, twoThetaMin: lo, twoThetaMax: hi }
  }, [wavelengthA, tMin, tMax])

  // Debounce powder + envelope so slider drags don't recompute every frame.
  const opts = useDebouncedValue(optsLive, 80)
  const fwhmDebounced = useDebouncedValue(fwhm, 80)
  const tMinD = useDebouncedValue(tMin, 80)
  const tMaxD = useDebouncedValue(tMax, 80)

  const patternA = useMemo(
    () => computePowderFromStructure(structure, opts),
    [structure, opts],
  )

  const patternB = useMemo(
    () => (formB ? computePowderFromStructure(formB.structure, opts) : null),
    [formB, opts],
  )

  const envelopeA = useMemo(() => {
    const lo = Math.min(tMinD, tMaxD)
    const hi = Math.max(tMinD, tMaxD)
    return lorentzEnvelope(
      patternA.peaks.map((p) => ({ twoTheta: p.twoTheta, intensity: p.intensity })),
      lo,
      hi,
      fwhmDebounced,
      360,
    )
  }, [patternA.peaks, tMinD, tMaxD, fwhmDebounced])

  const envelopeB = useMemo(() => {
    if (!patternB) return null
    const lo = Math.min(tMinD, tMaxD)
    const hi = Math.max(tMinD, tMaxD)
    return lorentzEnvelope(
      patternB.peaks.map((p) => ({ twoTheta: p.twoTheta, intensity: p.intensity })),
      lo,
      hi,
      fwhmDebounced,
      360,
    )
  }, [patternB, tMinD, tMaxD, fwhmDebounced])

  const polyA = useMemo(() => {
    if (!envelopeA.x.length) return ''
    return envelopePolyline(envelopeA.x, envelopeA.y, BOX, {
      xmin: Math.min(tMinD, tMaxD),
      xmax: Math.max(tMinD, tMaxD),
      ymin: 0,
      ymax: 105,
    })
  }, [envelopeA, tMinD, tMaxD])

  const polyB = useMemo(() => {
    if (!envelopeB?.x.length) return ''
    return envelopePolyline(envelopeB.x, envelopeB.y, BOX, {
      xmin: Math.min(tMinD, tMaxD),
      xmax: Math.max(tMinD, tMaxD),
      ymin: 0,
      ymax: 105,
    })
  }, [envelopeB, tMinD, tMaxD])

  const shiftRows = useMemo(() => {
    if (!patternB) return []
    return peakShiftTable(patternA.peaks, patternB.peaks, 8, 2.5)
  }, [patternA.peaks, patternB])

  const topsA = useMemo(() => topPeaksByIntensity(patternA.peaks, 6), [patternA.peaks])
  const topsB = useMemo(
    () => (patternB ? topPeaksByIntensity(patternB.peaks, 6) : []),
    [patternB],
  )

  const applyFormB = useCallback(
    (
      expanded: ExpandedStructure,
      meta: {
        label: string
        codId: string | null
        sourceNote: string
        pairId: string | null
      },
    ) => {
      setFormB({
        structure: expanded,
        label: meta.label,
        codId: meta.codId,
        sourceNote: meta.sourceNote,
        pairId: meta.pairId,
      })
      setActivePairId(meta.pairId)
      setErrorB(null)
    },
    [],
  )

  const loadFormBCod = useCallback(
    async (idRaw: string, pairId: string | null = null, labelHint?: string) => {
      const id = idRaw.replace(/\D/g, '')
      if (!/^\d{5,10}$/.test(id)) {
        setErrorB('Enter a numeric COD id (5–10 digits).')
        return
      }
      setBusyB(true)
      setErrorB(null)
      try {
        const remote = await fetchRemoteCif(id)
        const expanded = expandStructure(parseCif(remote.text))
        if (!expanded.atoms.length) {
          setErrorB('Parsed Form B CIF but found no atoms.')
          setFormB(null)
          return
        }
        applyFormB(expanded, {
          label: labelHint || formLabel(expanded, `COD ${id}`),
          codId: id,
          sourceNote: `${remote.sourceNote} (${sourceBadgeLabel(remote.source)}).`,
          pairId,
        })
      } catch (e) {
        setFormB(null)
        if (e instanceof CorsBlockedError) {
          setErrorB(
            `CORS blocked COD ${e.id}. Use a curated pair chip (cached), paste/upload, or the COD proxy.`,
          )
        } else if (e instanceof NotFoundError) {
          setErrorB(e.message)
        } else {
          setErrorB(e instanceof Error ? e.message : String(e))
        }
      } finally {
        setBusyB(false)
      }
    },
    [applyFormB],
  )

  const setPairAsB = useCallback(
    (pair: PolymorphPair) => {
      setCodBInput(pair.formB.codId)
      void loadFormBCod(pair.formB.codId, pair.id, pair.formB.label)
    },
    [loadFormBCod],
  )

  const loadPairIntoMap = useCallback(
    (pair: PolymorphPair) => {
      onLoadCodId?.(pair.formA.codId)
      setCodBInput(pair.formB.codId)
      void loadFormBCod(pair.formB.codId, pair.id, pair.formB.label)
    },
    [onLoadCodId, loadFormBCod],
  )

  const loadPasteB = useCallback(() => {
    if (!pasteBText.trim()) {
      setErrorB('Paste CIF text for Form B first.')
      return
    }
    setBusyB(true)
    setErrorB(null)
    try {
      const expanded = expandStructure(parseCif(pasteBText))
      if (!expanded.atoms.length) {
        setErrorB('Parsed paste but found no atoms.')
        setFormB(null)
        return
      }
      applyFormB(expanded, {
        label: formLabel(expanded, 'Form B (pasted)'),
        codId: null,
        sourceNote: 'Loaded from pasted CIF (Form B overlay only).',
        pairId: null,
      })
    } catch (e) {
      setFormB(null)
      setErrorB(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyB(false)
    }
  }, [pasteBText, applyFormB])

  const onFileB = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      setBusyB(true)
      setErrorB(null)
      try {
        const text = await file.text()
        const expanded = expandStructure(parseCif(text))
        if (!expanded.atoms.length) {
          setErrorB('Parsed upload but found no atoms.')
          setFormB(null)
          return
        }
        applyFormB(expanded, {
          label: formLabel(expanded, file.name),
          codId: null,
          sourceNote: `Uploaded ${file.name} as Form B overlay.`,
          pairId: null,
        })
      } catch (err) {
        setFormB(null)
        setErrorB(err instanceof Error ? err.message : String(err))
      } finally {
        setBusyB(false)
        e.target.value = ''
      }
    },
    [applyFormB],
  )

  const clearFormB = useCallback(() => {
    setFormB(null)
    setActivePairId(null)
    setErrorB(null)
  }, [])

  const activePair = activePairId
    ? POLYMORPH_PAIRS.find((p) => p.id === activePairId) ?? null
    : null

  const pairChemistryMismatch =
    !!activePair &&
    !chemistriesCompatible(structure.metadata?.formula, activePair.chemistry)

  const hasMeta =
    xray &&
    (xray.wavelengthA != null ||
      xray.radiationType ||
      xray.probe ||
      xray.temperatureK != null ||
      xray.rFactorAll != null ||
      xray.wRFactorRef != null ||
      xray.gof != null)

  const loLive = Math.min(tMin, tMax)
  const hiLive = Math.max(tMin, tMax)
  const lo = Math.min(tMinD, tMaxD)
  const hi = Math.max(tMinD, tMaxD)
  const dx = hi - lo || 1

  const labelA = formLabel(structure, 'Form A')
  const labelB = formB?.label ?? 'Form B'

  return (
    <section className="seed-box cif-xray" aria-labelledby="cif-xray-heading">
      <h2 id="cif-xray-heading">X-ray · powder</h2>

      <p className="teach-note">
        <strong>Note.</strong> Calculated schematic PXRD from the loaded CIF
        model (cell + sites + lattice centering). Hover a stick for hkl / d /
        2θ / I. Not measured data.
      </p>

      <p className="teach-note">
        <strong>Polymorphs.</strong> The same molecule (or composition) in a
        different packing / space group yields a different powder fingerprint —
        peak positions track the cell even when chemistry is unchanged. Solvates
        and hydrates behave similarly. Use <em>Compare · polymorph</em> below to
        overlay a second calculated pattern (Form B) on this structure (Form A).
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
          <li>
            Screw/glide reflection conditions are applied when CIF/SG operators
            are present; otherwise centering-only (and F≈0 from expanded sites).
            R lattices on rhombohedral axes (CIF <code>RS</code> / <code>:R</code>)
            are treated as primitive; hexagonal R still uses −h+k+l = 3n.
          </li>
          <li>
            Polymorph overlay is <strong>calculated vs calculated</strong>. Real
            phase ID uses measured PXRD against reference patterns.
          </li>
        </ul>
      </aside>

      {hasMeta && (
        <div className="cif-xray-meta">
          <h3 className="teach-subhead">Experiment (from CIF)</h3>
          <dl className="meta-grid">
            {xray!.radiationType && (
              <div>
                <dt>Radiation</dt>
                <dd>
                  {xray!.radiationType}
                  {xray!.probe ? ` · ${xray!.probe}` : ''}
                </dd>
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
          2θ min = {loLive.toFixed(0)}°
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
          2θ max = {hiLive.toFixed(0)}°
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

      <div className="cif-xray-legend">
          <span className="cif-xray-leg-a">
            Form A · {labelA}
            {structure.spaceGroupName ? ` · ${structure.spaceGroupName}` : ''}
          </span>
          {formB && (
            <span className="cif-xray-leg-b">
              Form B · {labelB}
              {formB.codId ? ` · COD ${formB.codId}` : ''}
              {formB.structure.spaceGroupName
                ? ` · ${formB.structure.spaceGroupName}`
                : ''}
            </span>
          )}
      </div>

      <div className="cif-xray-chart-wrap">
        <svg
          className="teach-svg cif-xray-svg"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          role="img"
          aria-label={
            formB
              ? `Simulated powder overlay, Form A ${patternA.peaks.length} peaks, Form B ${patternB?.peaks.length ?? 0} peaks, wavelength ${wavelengthA.toFixed(4)} angstrom`
              : `Simulated powder pattern, ${patternA.peaks.length} peaks, wavelength ${wavelengthA.toFixed(4)} angstrom`
          }
        >
          <title>Simulated PXRD{formB ? ' · polymorph overlay' : ''}</title>
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
          {polyB && (
            <polyline
              points={polyB}
              className="teach-curve teach-curve-b cif-xray-curve-b"
              fill="none"
            />
          )}
          {polyA && (
            <polyline
              points={polyA}
              className="teach-curve teach-curve-a"
              fill="none"
            />
          )}
          {showSticks &&
            patternB?.peaks.map((p) => {
              const px = BOX.x0 + ((p.twoTheta - lo) / dx) * (BOX.x1 - BOX.x0)
              const py = BOX.y1 - (p.intensity / 105) * (BOX.y1 - BOX.y0)
              const active =
                hover?.form === 'B' &&
                hover.peak.hkl === p.hkl &&
                Math.abs(hover.peak.twoTheta - p.twoTheta) < 0.05
              return (
                <g key={`b-${p.hkl}-${p.twoTheta.toFixed(3)}`}>
                  <line
                    x1={px}
                    y1={BOX.y1}
                    x2={px}
                    y2={py}
                    className={
                      active ? 'cif-xray-stick-b active' : 'cif-xray-stick-b'
                    }
                  />
                  <circle
                    cx={px}
                    cy={py}
                    r={active ? 4.5 : 2.8}
                    className={
                      active
                        ? 'teach-curve-dot cif-xray-dot-b active'
                        : 'teach-curve-dot cif-xray-dot-b'
                    }
                    tabIndex={0}
                    role="button"
                    aria-label={`Form B peak ${p.hkl}, d ${p.d.toFixed(3)} Å, 2θ ${p.twoTheta.toFixed(2)}°, I ${p.intensity.toFixed(1)}`}
                    onMouseEnter={() => setHover({ peak: p, form: 'B' })}
                    onFocus={() => setHover({ peak: p, form: 'B' })}
                    onMouseLeave={() => setHover(null)}
                    onBlur={() => setHover(null)}
                  />
                </g>
              )
            })}
          {showSticks &&
            patternA.peaks.map((p) => {
              const px = BOX.x0 + ((p.twoTheta - lo) / dx) * (BOX.x1 - BOX.x0)
              const py = BOX.y1 - (p.intensity / 105) * (BOX.y1 - BOX.y0)
              const active =
                hover?.form === 'A' &&
                hover.peak.hkl === p.hkl &&
                Math.abs(hover.peak.twoTheta - p.twoTheta) < 0.05
              return (
                <g key={`a-${p.hkl}-${p.twoTheta.toFixed(3)}`}>
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
                    className={
                      active ? 'teach-curve-dot active' : 'teach-curve-dot'
                    }
                    tabIndex={0}
                    role="button"
                    aria-label={`Form A peak ${p.hkl}, d ${p.d.toFixed(3)} Å, 2θ ${p.twoTheta.toFixed(2)}°, I ${p.intensity.toFixed(1)}`}
                    onMouseEnter={() => setHover({ peak: p, form: 'A' })}
                    onFocus={() => setHover({ peak: p, form: 'A' })}
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
            <strong>
              Form {hover.form} · ({hover.peak.hkl})
            </strong>
            {' · '}d = {hover.peak.d.toFixed(3)} Å
            {' · '}2θ = {hover.peak.twoTheta.toFixed(2)}°
            {' · '}I = {hover.peak.intensity.toFixed(1)}
            {' · '}mult ≈ {hover.peak.multiplicity}
          </p>
        ) : (
          <p className="hint">
            Form A: {patternA.peaks.length} peaks · centering {patternA.centering}
            {' · '}|hkl| ≤ {patternA.maxH}
            {patternA.truncated ? ' · truncated' : ''}
            {patternB
              ? ` · Form B: ${patternB.peaks.length} peaks · ${patternB.centering}`
              : ''}
          </p>
        )}
      </div>

      {patternA.warnings.length > 0 && (
        <ul className="cif-warnings">
          {patternA.warnings.map((w) => (
            <li key={`a-${w}`}>{w}</li>
          ))}
        </ul>
      )}
      {patternB && patternB.warnings.length > 0 && (
        <ul className="cif-warnings">
          {patternB.warnings.map((w) => (
            <li key={`b-${w}`}>Form B: {w}</li>
          ))}
        </ul>
      )}

      <CifPolymorphCompare
        uid={uid}
        structure={structure}
        formB={formB}
        patternBPeaks={patternB?.peaks ?? null}
        topsA={topsA}
        topsB={topsB}
        shiftRows={shiftRows}
        busyB={busyB}
        errorB={errorB}
        codBInput={codBInput}
        setCodBInput={setCodBInput}
        pasteBOpen={pasteBOpen}
        setPasteBOpen={setPasteBOpen}
        pasteBText={pasteBText}
        setPasteBText={setPasteBText}
        activePairId={activePairId}
        activePair={activePair}
        pairChemistryMismatch={pairChemistryMismatch}
        onLoadCodId={onLoadCodId}
        setPairAsB={setPairAsB}
        loadPairIntoMap={loadPairIntoMap}
        loadFormBCod={loadFormBCod}
        loadPasteB={loadPasteB}
        onFileB={onFileB}
        clearFormB={clearFormB}
      />

      {patternA.peaks.length > 0 && (
        <details className="cif-xray-table">
          <summary>
            Form A peak list ({Math.min(patternA.peaks.length, 40)} shown)
          </summary>
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
                {[...patternA.peaks]
                  .sort((a, b) => b.intensity - a.intensity)
                  .slice(0, 40)
                  .map((p) => (
                    <tr
                      key={`row-${p.hkl}-${p.twoTheta.toFixed(3)}`}
                      onMouseEnter={() => setHover({ peak: p, form: 'A' })}
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
