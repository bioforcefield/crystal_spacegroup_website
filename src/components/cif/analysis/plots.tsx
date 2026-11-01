import { useRef, useState, type ReactNode } from 'react'
import { RAMA_DISPLAY_TABLE, RAMA_SOURCE, ramaGrid, type RamaCategory } from '../../../data/pdb/analysis/protein'

/** Vertical runs of equal level per φ column → few SVG rects. */
export function ramaRuns(cat: RamaCategory): { i: number; j0: number; n: number; lv: number }[] {
  const g = ramaGrid(RAMA_DISPLAY_TABLE[cat])
  const out: { i: number; j0: number; n: number; lv: number }[] = []
  for (let i = 0; i < 180; i++) {
    let j = 0
    while (j < 180) {
      const lv = g[i * 180 + j]!
      let k = j + 1
      while (k < 180 && g[i * 180 + k] === lv) k++
      if (lv) out.push({ i, j0: j, n: k - j, lv })
      j = k
    }
  }
  return out
}

export interface Pt { x: number; y: number; id: string; label: string; cls?: string }

function download(name: string, blob: Blob) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
export function downloadCsv(name: string, text: string) {
  download(name, new Blob([text], { type: 'text/csv;charset=utf-8' }))
}
export function svgString(svg: SVGSVGElement): string {
  const c = svg.cloneNode(true) as SVGSVGElement
  c.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  bg.setAttribute('width', '100%'); bg.setAttribute('height', '100%'); bg.setAttribute('fill', '#ffffff')
  c.insertBefore(bg, c.firstChild)
  return new XMLSerializer().serializeToString(c)
}
function exportSvg(svg: SVGSVGElement, name: string) {
  download(`${name}.svg`, new Blob([svgString(svg)], { type: 'image/svg+xml' }))
}
function exportPng(svg: SVGSVGElement, name: string) {
  const vb = svg.viewBox.baseVal
  const w = (vb?.width || 400) * 2, h = (vb?.height || 300) * 2
  const img = new Image()
  img.onload = () => {
    const cv = document.createElement('canvas')
    cv.width = w; cv.height = h
    const g = cv.getContext('2d')!
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h)
    g.drawImage(img, 0, 0, w, h)
    cv.toBlob((b) => b && download(`${name}.png`, b), 'image/png')
  }
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString(svg))
}

/** Plot frame with title, hover readout and SVG/PNG export. */
export function PlotCard({ title, name, children, readout, width = 360, height = 300, info }: {
  title: string; name: string; children: ReactNode; readout?: string | null; width?: number; height?: number; info?: string
}) {
  const ref = useRef<SVGSVGElement>(null)
  return (
    <figure className="ana-plot" data-testid={`ana-plot-${name}`}>
      <figcaption>
        <span>{title}{info && <span className="ana-info" title={info} aria-label={info}> ⓘ</span>}</span>
        <span className="ana-plot-actions">
          <button type="button" className="btn btn-small" onClick={() => ref.current && exportSvg(ref.current, name)}>SVG</button>
          <button type="button" className="btn btn-small" onClick={() => ref.current && exportPng(ref.current, name)}>PNG</button>
        </span>
      </figcaption>
      <svg ref={ref} viewBox={`0 0 ${width} ${height}`} className="ana-svg" role="img" aria-label={title} fontFamily="system-ui, sans-serif" fontSize="10">
        {children}
      </svg>
      <div className="ana-readout" aria-live="polite">{readout ?? ' '}</div>
    </figure>
  )
}

const M = { l: 38, r: 10, t: 10, b: 30 }
const CLS_COLOR: Record<string, string> = { favored: '#2563eb', allowed: '#d97706', outlier: '#dc2626', sel: '#111827' }

function Axes({ w, h, xr, yr, xt, yt, xl, yl }: { w: number; h: number; xr: [number, number]; yr: [number, number]; xt: number[]; yt: number[]; xl: string; yl: string }) {
  const X = (v: number) => M.l + ((v - xr[0]) / (xr[1] - xr[0])) * (w - M.l - M.r)
  const Y = (v: number) => h - M.b - ((v - yr[0]) / (yr[1] - yr[0])) * (h - M.t - M.b)
  return (
    <g stroke="#94a3b8" fill="#334155">
      <rect x={M.l} y={M.t} width={w - M.l - M.r} height={h - M.t - M.b} fill="none" />
      {xt.map((v) => <g key={`x${v}`}><line x1={X(v)} x2={X(v)} y1={h - M.b} y2={h - M.b + 3} /><text x={X(v)} y={h - M.b + 13} textAnchor="middle" stroke="none">{v}</text></g>)}
      {yt.map((v) => <g key={`y${v}`}><line x1={M.l - 3} x2={M.l} y1={Y(v)} y2={Y(v)} /><text x={M.l - 5} y={Y(v) + 3} textAnchor="end" stroke="none">{v}</text></g>)}
      <text x={(M.l + w - M.r) / 2} y={h - 4} textAnchor="middle" stroke="none">{xl}</text>
      <text x={10} y={(M.t + h - M.b) / 2} textAnchor="middle" stroke="none" transform={`rotate(-90 10 ${(M.t + h - M.b) / 2})`}>{yl}</text>
    </g>
  )
}

/** φ/ψ (or χ1/χ2) scatter on −180..180 with optional Ramachandran shading. */
export function AngleScatter({ title, name, pts, rama, xl, yl, onPick, selected }: {
  title: string; name: string; pts: Pt[]; rama?: RamaCategory | null; xl: string; yl: string; onPick: (id: string) => void; selected?: string | null
}) {
  const [hov, setHov] = useState<Pt | null>(null)
  const w = 360, h = 330
  const X = (v: number) => M.l + ((v + 180) / 360) * (w - M.l - M.r)
  const Y = (v: number) => h - M.b - ((v + 180) / 360) * (h - M.t - M.b)
  const sx = (w - M.l - M.r) / 360, sy = (h - M.t - M.b) / 360
  const R = rama ? ramaRuns(rama) : null
  return (
    <PlotCard title={title} name={name} width={w} height={h} info={R ? RAMA_SOURCE : undefined}
      readout={hov ? hov.label : `${pts.length} points · click a point to centre it in 3D`}>
      <defs><clipPath id={`clip-${name}`}><rect x={M.l} y={M.t} width={w - M.l - M.r} height={h - M.t - M.b} /></clipPath></defs>
      {R && <g clipPath={`url(#clip-${name})`} shapeRendering="crispEdges" data-testid="rama-contours">{R.map((r) => (
        <rect key={`${r.i}-${r.j0}`} x={X(-180 + r.i * 2)} y={Y(-180 + (r.j0 + r.n) * 2)} width={2 * sx + 0.3} height={r.n * 2 * sy} fill={r.lv === 2 ? '#93c5fd' : '#fde68a'} />
      ))}</g>}
      <line x1={X(0)} x2={X(0)} y1={M.t} y2={h - M.b} stroke="#cbd5e1" strokeDasharray="2 2" />
      <line x1={M.l} x2={w - M.r} y1={Y(0)} y2={Y(0)} stroke="#cbd5e1" strokeDasharray="2 2" />
      <Axes w={w} h={h} xr={[-180, 180]} yr={[-180, 180]} xt={[-180, -90, 0, 90, 180]} yt={[-180, -90, 0, 90, 180]} xl={xl} yl={yl} />
      {pts.map((p) => (
        <circle key={p.id} cx={X(p.x)} cy={Y(p.y)} r={selected === p.id ? 4.5 : p.cls === 'outlier' ? 3.2 : 2.4}
          fill={selected === p.id ? CLS_COLOR.sel : CLS_COLOR[p.cls ?? 'favored'] ?? '#2563eb'} stroke={p.cls === 'outlier' ? '#7f1d1d' : 'none'}
          style={{ cursor: 'pointer' }} data-id={p.id}
          onMouseEnter={() => setHov(p)} onMouseLeave={() => setHov(null)} onClick={() => onPick(p.id)}>
          <title>{p.label}</title>
        </circle>
      ))}
      {R && (
        <g fontSize="9">
          <rect x={w - 118} y={M.t + 4} width={104} height={40} fill="#ffffffcc" stroke="#cbd5e1" />
          <rect x={w - 112} y={M.t + 10} width={8} height={8} fill="#93c5fd" /><text x={w - 100} y={M.t + 17}>favored</text>
          <rect x={w - 112} y={M.t + 24} width={8} height={8} fill="#fde68a" /><text x={w - 100} y={M.t + 31}>allowed</text>
        </g>
      )}
    </PlotCard>
  )
}

/** Histogram of angles (−180..180) or arbitrary range. */
export function Histogram({ title, name, values, range = [-180, 180], bin = 10, xl, info }: {
  title: string; name: string; values: number[]; range?: [number, number]; bin?: number; xl: string; info?: string
}) {
  const [hov, setHov] = useState<string | null>(null)
  const w = 360, h = 220
  const nb = Math.max(1, Math.ceil((range[1] - range[0]) / bin))
  const counts = new Array(nb).fill(0) as number[]
  for (const v of values) {
    const k = Math.min(nb - 1, Math.max(0, Math.floor((v - range[0]) / bin)))
    counts[k]!++
  }
  const max = Math.max(1, ...counts)
  const X = (v: number) => M.l + ((v - range[0]) / (range[1] - range[0])) * (w - M.l - M.r)
  const Y = (c: number) => h - M.b - (c / max) * (h - M.t - M.b)
  const span = range[1] - range[0]
  const step = span >= 300 ? 90 : span >= 60 ? 20 : span >= 10 ? 2 : 0.5
  const xt: number[] = []
  for (let v = Math.ceil(range[0] / step) * step; v <= range[1] + 1e-9; v += step) xt.push(+v.toFixed(2))
  const yt = [0, Math.round(max / 2), max].filter((v, i, a) => a.indexOf(v) === i)
  return (
    <PlotCard title={title} name={name} width={w} height={h} info={info} readout={hov ?? `n = ${values.length}`}>
      <Axes w={w} h={h} xr={range} yr={[0, max]} xt={xt} yt={yt} xl={xl} yl="count" />
      {counts.map((c, k) => c > 0 && (
        <rect key={k} x={X(range[0] + k * bin) + 0.5} width={Math.max(1, X(range[0] + bin) - X(range[0]) - 1)} y={Y(c)} height={h - M.b - Y(c)} fill="#3b82f6"
          onMouseEnter={() => setHov(`${(range[0] + k * bin).toFixed(1)} to ${(range[0] + (k + 1) * bin).toFixed(1)}: ${c}`)} onMouseLeave={() => setHov(null)}>
          <title>{`${(range[0] + k * bin).toFixed(1)}–${(range[0] + (k + 1) * bin).toFixed(1)}: ${c}`}</title>
        </rect>
      ))}
    </PlotCard>
  )
}

/** Pseudorotation wheel: P as angle (0° top, clockwise), τm as radius. */
export function PuckerWheel({ pts, onPick, selected }: { pts: (Pt & { tm: number })[]; onPick: (id: string) => void; selected?: string | null }) {
  const [hov, setHov] = useState<Pt | null>(null)
  const w = 320, h = 320, cx = 160, cy = 160, R = 120, tmMax = 60
  const pos = (P: number, tm: number) => {
    const r = (Math.min(tm, tmMax) / tmMax) * R, t = (P - 90) * Math.PI / 180
    return [cx + r * Math.cos(t), cy + r * Math.sin(t)] as const
  }
  const names = ["C3'-endo", "C4'-exo", "O4'-endo", "C1'-exo", "C2'-endo", "C3'-exo", "C4'-endo", "O4'-exo", "C1'-endo", "C2'-exo"]
  return (
    <PlotCard title="Sugar pucker wheel (P, τm)" name="pucker-wheel" width={w} height={h}
      info="Altona & Sundaralingam (1972) pseudorotation phase P (angle, 0° at top, clockwise) and amplitude τm (radius, 0–60°). North (C3′-endo) ≈ 0–36°, South (C2′-endo) ≈ 144–180°."
      readout={hov ? hov.label : `${pts.length} sugars · click to centre in 3D`}>
      {[20, 40, 60].map((t) => <circle key={t} cx={cx} cy={cy} r={(t / tmMax) * R} fill="none" stroke="#cbd5e1" />)}
      {names.map((n, k) => {
        const [x1, y1] = pos(k * 36, tmMax); const [tx, ty] = pos(k * 36 + 18, tmMax + 12)
        return <g key={n}><line x1={cx} y1={cy} x2={x1} y2={y1} stroke="#e2e8f0" /><text x={tx} y={ty} textAnchor="middle" fontSize="9" fill="#334155">{n}</text></g>
      })}
      <text x={cx + 3} y={cy - (20 / tmMax) * R - 2} fontSize="8" fill="#64748b">20°</text>
      <text x={cx + 3} y={cy - (40 / tmMax) * R - 2} fontSize="8" fill="#64748b">40°</text>
      {pts.map((p) => {
        const [x, y] = pos(p.x, p.tm)
        return (
          <circle key={p.id} cx={x} cy={y} r={selected === p.id ? 5 : 3} fill={selected === p.id ? '#111827' : p.x >= 108 && p.x < 216 ? '#2563eb' : p.x < 72 || p.x >= 324 ? '#dc2626' : '#d97706'}
            style={{ cursor: 'pointer' }} onMouseEnter={() => setHov(p)} onMouseLeave={() => setHov(null)} onClick={() => onPick(p.id)}>
            <title>{p.label}</title>
          </circle>
        )
      })}
    </PlotCard>
  )
}

/** Per-step (or per-pair) line plot along the sequence. */
export function SeriesPlot({ title, name, labels, values, unit, onPick, ids, ref0 }: {
  title: string; name: string; labels: string[]; values: number[]; unit: string; onPick?: (id: string) => void; ids?: string[]; ref0?: number
}) {
  const [hov, setHov] = useState<string | null>(null)
  const w = 360, h = 200
  if (!values.length) return null
  let lo = Math.min(...values), hi = Math.max(...values)
  if (ref0 != null) { lo = Math.min(lo, ref0); hi = Math.max(hi, ref0) }
  const pad = (hi - lo) * 0.1 || 1
  lo -= pad; hi += pad
  const X = (i: number) => M.l + (values.length === 1 ? 0.5 : i / (values.length - 1)) * (w - M.l - M.r)
  const Y = (v: number) => h - M.b - ((v - lo) / (hi - lo)) * (h - M.t - M.b)
  const nice = (v: number) => +v.toFixed(Math.abs(hi - lo) < 5 ? 1 : 0)
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  return (
    <PlotCard title={title} name={name} width={w} height={h} readout={hov ?? `mean ${mean.toFixed(2)} ${unit} · n = ${values.length}`}>
      <Axes w={w} h={h} xr={[0, 1]} yr={[lo, hi]} xt={[]} yt={[nice(lo + pad), nice((lo + hi) / 2), nice(hi - pad)]} xl="position along sequence" yl={unit} />
      {ref0 != null && <line x1={M.l} x2={w - M.r} y1={Y(ref0)} y2={Y(ref0)} stroke="#94a3b8" strokeDasharray="3 3" />}
      <polyline fill="none" stroke="#2563eb" strokeWidth={1.5} points={values.map((v, i) => `${X(i)},${Y(v)}`).join(' ')} />
      {values.map((v, i) => (
        <circle key={i} cx={X(i)} cy={Y(v)} r={3} fill="#2563eb" style={{ cursor: onPick ? 'pointer' : undefined }}
          onMouseEnter={() => setHov(`${labels[i]}: ${v.toFixed(2)} ${unit}`)} onMouseLeave={() => setHov(null)}
          onClick={() => ids && onPick?.(ids[i]!)}>
          <title>{`${labels[i]}: ${v.toFixed(2)} ${unit}`}</title>
        </circle>
      ))}
    </PlotCard>
  )
}
