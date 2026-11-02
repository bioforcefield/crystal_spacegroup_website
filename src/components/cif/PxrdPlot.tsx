import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { createPortal } from 'react-dom'
import { envelopePolyline, lorentzEnvelope } from '../../data/cif/xray/envelope'
import type { PowderPattern, PowderPeak } from '../../data/cif/xray/powder'
import { rovingNext } from '../../data/cif/viewportUi'
import { niceTicks, peaksCsv, placePeakLabels } from '../../data/cif/xray/plotUtil'

export type PxrdHover = { peak: PowderPeak; form: 'A' | 'B' } | null
interface Props {
  patternA: PowderPattern
  patternB: PowderPattern | null
  lo: number
  hi: number
  fwhm: number
  wavelengthA: number
  showSticks: boolean
  labelA: string
  labelB: string
  hover: PxrdHover
  setHover: Dispatch<SetStateAction<PxrdHover>>
}
const INLINE = { w: 336, h: 200, box: { x0: 44, y0: 14, x1: 312, y1: 168 }, font: 11, labels: 5 }
const LARGE = { w: 1000, h: 560, box: { x0: 70, y0: 24, x1: 980, y1: 500 }, font: 15, labels: 16 }

function download(name: string, blob: Blob) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

function Chart({ p, size, view, setView, large }: { p: Props; size: typeof INLINE; view: [number, number]; setView?: (v: [number, number] | null) => void; large: boolean }) {
  const { patternA, patternB, fwhm, wavelengthA, showSticks, hover, setHover } = p
  const [lo, hi] = view
  const dx = hi - lo || 1
  const B = size.box
  const X = (t: number) => B.x0 + ((t - lo) / dx) * (B.x1 - B.x0)
  const Y = (i: number) => B.y1 - (i / 105) * (B.y1 - B.y0)
  // Same Lorentzian envelope as before; in the enlarged view it is recomputed over the zoomed range for resolution.
  const env = useCallback((pat: PowderPattern) => {
    const e = lorentzEnvelope(pat.peaks.map((q) => ({ twoTheta: q.twoTheta, intensity: q.intensity })), lo, hi, fwhm, large ? 1200 : 360)
    return e.x.length ? envelopePolyline(e.x, e.y, B, { xmin: lo, xmax: hi, ymin: 0, ymax: 105 }) : ''
  }, [lo, hi, fwhm, large, B])
  const polyA = useMemo(() => env(patternA), [env, patternA])
  const polyB = useMemo(() => (patternB ? env(patternB) : ''), [env, patternB])
  const xt = niceTicks(lo, hi, large ? 12 : 6)
  const yt = [0, 25, 50, 75, 100]
  const labels = placePeakLabels(patternA.peaks, lo, hi, size.labels, X, Y, size.font * 0.55, size.font + 1)
  const [drag, setDrag] = useState<[number, number] | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const toT = (clientX: number) => {
    const r = svgRef.current!.getBoundingClientRect()
    const vx = ((clientX - r.left) / r.width) * size.w
    return Math.min(hi, Math.max(lo, lo + ((vx - B.x0) / (B.x1 - B.x0)) * dx))
  }
  const vis = (q: PowderPeak) => q.twoTheta >= lo && q.twoTheta <= hi
  const tipX = hover ? X(hover.peak.twoTheta) : 0
  const tipY = hover ? Y(hover.peak.intensity) : 0
  const tipW = size.font * 11.5
  const tipH = size.font * 4.6
  const sticks = (pat: PowderPattern, form: 'A' | 'B') => pat.peaks.filter(vis).map((q, pi) => {
    const active = hover?.form === form && hover.peak.hkl === q.hkl && Math.abs(hover.peak.twoTheta - q.twoTheta) < 0.05
    const px = X(q.twoTheta), py = Y(q.intensity)
    const b = form === 'B'
    return (
      <g key={`${form}-${q.hkl}-${q.twoTheta.toFixed(3)}`}>
        <line x1={px} y1={B.y1} x2={px} y2={py} className={`${b ? 'cif-xray-stick-b' : 'cif-xray-stick'}${active ? ' active' : ''}`} />
        <circle cx={px} cy={py} r={(active ? 4.5 : b ? 2.8 : 3) * (large ? 1.4 : 1)}
          className={`teach-curve-dot${b ? ' cif-xray-dot-b' : ''}${active ? ' active' : ''}`}
          tabIndex={!b && pi === 0 ? 0 : -1} data-peak={b ? 'b' : 'a'} role="button"
          aria-label={b ? `Form B peak ${q.hkl}, d ${q.d.toFixed(3)} Å, 2θ ${q.twoTheta.toFixed(2)}°, I ${q.intensity.toFixed(1)}`
            : `Form A peak ${pi + 1} of ${pat.peaks.length} (arrow keys move between peaks): ${q.hkl}, d ${q.d.toFixed(3)} Å, 2θ ${q.twoTheta.toFixed(2)}°, I ${q.intensity.toFixed(1)}`}
          onMouseEnter={() => setHover({ peak: q, form })} onFocus={() => setHover({ peak: q, form })}
          onMouseLeave={() => setHover(null)} onBlur={() => setHover(null)} />
      </g>
    )
  })
  return (
    <svg ref={svgRef}
      onKeyDown={(e) => {
        const dots = Array.from(e.currentTarget.querySelectorAll<SVGCircleElement>('circle[data-peak]'))
        const i = dots.indexOf(e.target as SVGCircleElement)
        if (i < 0) return
        const n = rovingNext(i, e.key, dots.length)
        if (n == null) return
        e.preventDefault()
        dots[i]!.setAttribute('tabindex', '-1')
        dots[n]!.setAttribute('tabindex', '0')
        dots[n]!.focus()
      }}
      className={`teach-svg cif-xray-svg${large ? ' cif-xray-svg-large' : ''}`}
      viewBox={`0 0 ${size.w} ${size.h}`} role="img" style={{ fontSize: size.font }}
      data-testid={large ? 'pxrd-large-svg' : 'pxrd-inline-svg'}
      aria-label={patternB
        ? `Simulated powder overlay, Form A ${patternA.peaks.length} peaks, Form B ${patternB.peaks.length} peaks, wavelength ${wavelengthA.toFixed(4)} angstrom`
        : `Simulated powder pattern, ${patternA.peaks.length} peaks, wavelength ${wavelengthA.toFixed(4)} angstrom`}
    >
      <title>Simulated PXRD{patternB ? ' · polymorph overlay' : ''}</title>
      <rect x={B.x0} y={B.y0} width={B.x1 - B.x0} height={B.y1 - B.y0} className="teach-plot-frame" rx={6} />
      {xt.map((t) => <line key={`gx${t}`} x1={X(t)} x2={X(t)} y1={B.y0} y2={B.y1} className="pxrd-grid" />)}
      {yt.map((v) => <line key={`gy${v}`} x1={B.x0} x2={B.x1} y1={Y(v)} y2={Y(v)} className="pxrd-grid" />)}
      {xt.map((t) => (
        <g key={`tx${t}`}>
          <line x1={X(t)} x2={X(t)} y1={B.y1} y2={B.y1 + 4} className="pxrd-tick" />
          <text x={X(t)} y={B.y1 + size.font + 3} textAnchor="middle" className="pxrd-axis-text">{Number.isInteger(t) ? t : t.toFixed(1)}</text>
        </g>
      ))}
      {yt.map((v) => <text key={`ty${v}`} x={B.x0 - 5} y={Y(v) + size.font * 0.35} textAnchor="end" className="pxrd-axis-text">{v}</text>)}
      <text x={(B.x0 + B.x1) / 2} y={size.h - 3} textAnchor="middle" className="pxrd-axis-title">2θ (°)</text>
      <text x={size.font} y={(B.y0 + B.y1) / 2} textAnchor="middle" className="pxrd-axis-title" transform={`rotate(-90 ${size.font} ${(B.y0 + B.y1) / 2})`}>I (rel.)</text>
      <text x={B.x1 - 6} y={B.y0 + size.font + 2} textAnchor="end" className="pxrd-lambda" data-testid="pxrd-lambda">λ = {wavelengthA.toFixed(4)} Å</text>
      {polyB && <polyline points={polyB} className="teach-curve teach-curve-b cif-xray-curve-b pxrd-curve" fill="none" />}
      {polyA && <polyline points={polyA} className="teach-curve teach-curve-a pxrd-curve pxrd-curve-a" fill="none" />}
      {showSticks && patternB && sticks(patternB, 'B')}
      {showSticks && sticks(patternA, 'A')}
      {labels.map((l) => (
        <g key={`lab-${l.peak.hkl}-${l.peak.twoTheta}`} className="pxrd-hkl" data-testid="pxrd-hkl">
          {l.anchorY - l.y > 8 && <line x1={l.x} x2={l.x} y1={l.y + 2} y2={l.anchorY - 3} className="pxrd-leader" />}
          <text x={l.x} y={l.y} textAnchor="middle">({l.peak.hkl})</text>
        </g>
      ))}
      {large && setView && (
        <rect x={B.x0} y={B.y0} width={B.x1 - B.x0} height={B.y1 - B.y0} fill="transparent" className="pxrd-zoom-layer"
          onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); const t = toT(e.clientX); setDrag([t, t]) }}
          onPointerMove={(e) => drag && setDrag([drag[0], toT(e.clientX)])}
          onPointerUp={() => { if (drag && Math.abs(drag[1] - drag[0]) > 0.2) setView([Math.min(...drag), Math.max(...drag)]); setDrag(null) }}
          onDoubleClick={() => setView(null)}
          style={{ pointerEvents: drag ? 'all' : undefined }} />
      )}
      {drag && <rect x={X(Math.min(...drag))} y={B.y0} width={Math.abs(X(drag[1]) - X(drag[0]))} height={B.y1 - B.y0} className="pxrd-brush" />}
      {hover && vis(hover.peak) && (
        <g className="pxrd-tip" pointerEvents="none" data-testid="pxrd-tip"
          transform={`translate(${Math.min(B.x1 - tipW, Math.max(B.x0, tipX + 8))} ${Math.max(B.y0, tipY - tipH - 6)})`}>
          <rect width={tipW} height={tipH} rx={4} />
          <text x={6} y={size.font + 2} className="pxrd-tip-strong">Form {hover.form} · ({hover.peak.hkl})</text>
          <text x={6} y={size.font * 2.2 + 2}>2θ {hover.peak.twoTheta.toFixed(2)}° · d {hover.peak.d.toFixed(3)} Å</text>
          <text x={6} y={size.font * 3.4 + 2}>I {hover.peak.intensity.toFixed(1)} · mult {hover.peak.multiplicity}</text>
        </g>
      )}
    </svg>
  )
}

export default function PxrdPlot(p: Props) {
  const [open, setOpen] = useState(false)
  const [zoom, setZoom] = useState<[number, number] | null>(null)
  const [showTable, setShowTable] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => { setZoom(null) }, [p.lo, p.hi])
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); setOpen(false) } }
    window.addEventListener('keydown', k)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    wrap.current?.querySelector<HTMLButtonElement>('.pxrd-close')?.focus()
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; btn.current?.focus() }
  }, [open])
  const view: [number, number] = zoom ?? [p.lo, p.hi]
  const visPeaks = (pat: PowderPattern) => pat.peaks.filter((q) => q.twoTheta >= view[0] && q.twoTheta <= view[1])
  const exportCsv = () => download('pxrd-peaks.csv', new Blob([peaksCsv([{ form: 'A', peaks: p.patternA.peaks }, ...(p.patternB ? [{ form: 'B', peaks: p.patternB.peaks }] : [])], p.wavelengthA)], { type: 'text/csv' }))
  const exportPng = () => {
    const svg = wrap.current?.querySelector<SVGSVGElement>('svg[data-testid="pxrd-large-svg"]')
    if (!svg) return
    const clone = svg.cloneNode(true) as SVGSVGElement
    // Inline computed styles so the PNG matches the dark theme.
    const src = svg.querySelectorAll('*'), dst = clone.querySelectorAll('*')
    src.forEach((el, i) => {
      const cs = getComputedStyle(el), d = dst[i] as SVGElement
      for (const k of ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'font-size', 'font-family', 'font-weight', 'opacity', 'fill-opacity']) d.style.setProperty(k, cs.getPropertyValue(k))
    })
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    clone.setAttribute('width', String(LARGE.w * 2)); clone.setAttribute('height', String(LARGE.h * 2))
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = LARGE.w * 2; c.height = LARGE.h * 2
      const g = c.getContext('2d')!; g.fillStyle = '#0b1220'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0)
      c.toBlob((b) => b && download('pxrd.png', b), 'image/png')
    }
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone))
  }
  return (
    <>
      <div className="cif-xray-chart-wrap pxrd-inline">
        <Chart p={p} size={INLINE} view={[p.lo, p.hi]} large={false} />
        <button ref={btn} type="button" className="btn btn-small pxrd-enlarge" data-testid="pxrd-enlarge" onClick={() => setOpen(true)} aria-label="Enlarge PXRD plot" title="Enlarge">⤢ Enlarge</button>
      </div>
      {open && createPortal(
        <div className="pxrd-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div ref={wrap} className="pxrd-modal" role="dialog" aria-modal="true" aria-label="Enlarged PXRD plot" data-testid="pxrd-modal">
            <div className="pxrd-modal-bar">
              <strong>Simulated PXRD</strong>
              <span className="muted">λ = {p.wavelengthA.toFixed(4)} Å · 2θ {view[0].toFixed(1)}–{view[1].toFixed(1)}° · FWHM {p.fwhm.toFixed(2)}°</span>
              <span className="pxrd-modal-legend"><span className="cif-xray-leg-a">A · {p.labelA}</span>{p.patternB && <span className="cif-xray-leg-b">B · {p.labelB}</span>}</span>
              <span className="pxrd-modal-actions">
                <button type="button" className="btn btn-small" onClick={() => setZoom(null)} disabled={!zoom} data-testid="pxrd-reset">Reset zoom</button>
                <button type="button" className="btn btn-small" aria-pressed={showTable} onClick={() => setShowTable((v) => !v)} data-testid="pxrd-table-toggle">Peak list</button>
                <button type="button" className="btn btn-small" onClick={exportPng} data-testid="pxrd-png">PNG</button>
                <button type="button" className="btn btn-small" onClick={exportCsv} data-testid="pxrd-csv">CSV</button>
                <button type="button" className="btn btn-small pxrd-close" onClick={() => setOpen(false)} aria-label="Close (Esc)">✕</button>
              </span>
            </div>
            <p className="muted pxrd-modal-hint">Drag across the plot to zoom 2θ · double-click to reset · Esc to close</p>
            <div className="pxrd-modal-body">
              <Chart p={p} size={LARGE} view={view} setView={setZoom} large />
              {showTable && (
                <div className="pxrd-modal-table" data-testid="pxrd-table">
                  <table>
                    <thead><tr><th>Form</th><th>hkl</th><th>2θ (°)</th><th>d (Å)</th><th>I</th><th>mult</th></tr></thead>
                    <tbody>
                      {[...visPeaks(p.patternA).map((q) => ['A', q] as const), ...(p.patternB ? visPeaks(p.patternB).map((q) => ['B', q] as const) : [])]
                        .sort((a, b) => a[1].twoTheta - b[1].twoTheta)
                        .map(([f, q]) => (
                          <tr key={`${f}${q.hkl}${q.twoTheta}`} onMouseEnter={() => p.setHover({ peak: q, form: f })} onMouseLeave={() => p.setHover(null)}>
                            <td>{f}</td><td className="mono">{q.hkl}</td><td>{q.twoTheta.toFixed(2)}</td><td>{q.d.toFixed(3)}</td><td>{q.intensity.toFixed(1)}</td><td>{q.multiplicity}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
