import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildProjections,
  dedupeProjected,
  formatHeightLabel,
  formatQuarter,
  planeEmbed,
  projectElement,
  projectFrac,
  type ProjectedElement,
  type ProjectionDir,
  type ProjectionInfo,
} from '../data/diagram2d'
import { elementOverlay } from '../data/elementSelection'
import { elementTitle } from '../data/elementGeometry'
import {
  placedPositions,
  type PlacementMode,
} from '../data/nearestImages'
import type { SpaceGroupDemo } from '../data/types'

interface Props {
  demo: SpaceGroupDemo
  selectedIndex: number
  onSelect: (index: number) => void
  showAllSites?: boolean
  placementMode?: PlacementMode
  /** Supercell na×nb×nc; in-plane multiples tile, out-of-plane is noted. Default 1×1×1. */
  multiples?: [number, number, number]
}

const PAD = { left: 40, right: 32, top: 18, bottom: 34 }

function halfArrowHeads(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  strokeW: number,
) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const px = -uy
  const py = ux
  return [0.2, 0.8].map((t, i) => {
    const ax = x1 + ux * len * t
    const ay = y1 + uy * len * t
    const tipX = ax + ux * 6
    const tipY = ay + uy * 6
    const barbX = ax - ux * 2 + px * 7
    const barbY = ay - uy * 2 + py * 7
    return (
      <path
        key={`ha-${i}`}
        d={`M ${barbX} ${barbY} L ${ax} ${ay} L ${tipX} ${tipY}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )
  })
}

type ToSvg = (u: number, v: number) => { x: number; y: number }

/** Regular n-gon path (ITA end-on symbols: 3 triangle, 4 square, 6 hexagon); 2 is a lens. */
function endOnShape(n: number, x: number, y: number, r: number): string {
  if (n === 2) return `M ${x - r} ${y} Q ${x} ${y - r * 1.1} ${x + r} ${y} Q ${x} ${y + r * 1.1} ${x - r} ${y} Z`
  const pts: string[] = []
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n
    pts.push(`${x + r * Math.cos(a)} ${y + r * Math.sin(a)}`)
  }
  return `M ${pts.join(' L ')} Z`
}

/** Dash pattern of a plane trace: mirror solid, glide ∥ page dashed, ⊥ page dotted, n dash-dot, e double. */
function traceDash(p: ProjectedElement & { mode: 'trace' }, proj: ProjectionInfo): string | undefined {
  const c = p.el.cls
  if (c.kind === 'mirror') return undefined
  const g = projectFrac(c.intrinsic, proj)
  const inPage = Math.abs(g.u) > 1e-9 || Math.abs(g.v) > 1e-9
  const outPage = Math.abs(g.w) > 1e-9
  if (c.glideLetter === 'e') return '7 2 2 2'
  if (c.glideLetter === 'n' || c.glideLetter === 'd' || (inPage && outPage)) return '8 3 1.5 3'
  return inPage ? '6 4' : '1.5 3'
}

function ElementGlyph({
  p,
  proj,
  toSvg,
  emphasized,
  dimmed,
  labelScale,
}: {
  p: ProjectedElement
  proj: ProjectionInfo
  toSvg: ToSvg
  emphasized: boolean
  dimmed: boolean
  labelScale: number
}) {
  const el = p.el
  const c = el.cls
  const color = el.color
  const opacity = emphasized ? 1 : dimmed ? 0.22 : 0.55
  const strokeW = emphasized ? 2.2 : 1.3
  const title = elementTitle(el)
  const fs = (emphasized ? 12 : 10.5) * labelScale
  const tag = emphasized ? 'd2-element d2-selected' : 'd2-element'
  const data = { 'data-kind': c.kind, 'data-symbol': el.symbol, 'data-class': el.classId }
  if (p.mode === 'end-on') {
    const { x, y } = toSvg(p.u, p.v)
    const r = emphasized ? 9 : 7
    const n = c.order
    const filled = c.kind === 'rotation'
    return (
      <g className={tag} opacity={opacity} {...data}>
        <path d={endOnShape(n, x, y, r)} fill={filled ? color : 'rgba(7,11,20,0.85)'} fillOpacity={filled ? 0.55 : 1} stroke={color} strokeWidth={strokeW} />
        {c.kind === 'rotoinversion' && <circle cx={x} cy={y} r={2.2} fill={color} />}
        {(c.kind === 'screw' || c.kind === 'rotoinversion' || emphasized) && (
          <text x={x + r + 2} y={y - r + 2} fill={color} fontSize={fs} fontWeight={700}>
            {el.symbol}
          </text>
        )}
        <title>{title}</title>
      </g>
    )
  }
  if (p.mode === 'line') {
    const a = toSvg(p.u, p.v)
    const b = toSvg(p.u2, p.v2)
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    return (
      <g className={tag} opacity={opacity} {...data}>
        <line
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={color}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={p.inclined ? '2 3' : undefined}
          markerStart={!p.inclined && c.kind === 'rotation' && c.order === 2 ? 'url(#d2-arrow)' : undefined}
          markerEnd={!p.inclined && c.kind === 'rotation' && c.order === 2 ? 'url(#d2-arrow)' : undefined}
        />
        {c.kind === 'screw' && c.order === 2 && halfArrowHeads(a.x, a.y, b.x, b.y, color, strokeW)}
        {(emphasized || c.order > 2 || c.kind !== 'rotation') && (
          <text x={mx + 6} y={my - 6} fill={color} fontSize={fs} fontWeight={700}>
            {el.symbol}
            {p.w !== null && Math.abs(p.w) > 1e-6 ? ` ${formatQuarter(((p.w % 1) + 1) % 1)}` : ''}
          </text>
        )}
        <title>{title}</title>
      </g>
    )
  }
  if (p.mode === 'trace') {
    const a = toSvg(p.u, p.v)
    const b = toSvg(p.u2, p.v2)
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    const g = projectFrac(emphasized ? c.intrinsicRaw : c.intrinsic, proj)
    const glideInPage = c.kind === 'glide' || (emphasized && (Math.abs(g.u) > 1e-9 || Math.abs(g.v) > 1e-9))
    const mag = Math.hypot(g.u, g.v)
    const arrow =
      glideInPage && mag > 1e-9
        ? { a: toSvg((p.u + p.u2) / 2 - (g.u / mag) * 0.12, (p.v + p.v2) / 2 - (g.v / mag) * 0.12), b: toSvg((p.u + p.u2) / 2 + (g.u / mag) * 0.12, (p.v + p.v2) / 2 + (g.v / mag) * 0.12) }
        : null
    return (
      <g className={tag} opacity={opacity} {...data}>
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={strokeW} strokeDasharray={traceDash(p, proj)} strokeLinecap="round" />
        {arrow && <line x1={arrow.a.x} y1={arrow.a.y} x2={arrow.b.x} y2={arrow.b.y} stroke={color} strokeWidth={strokeW} markerEnd="url(#d2-arrow)" />}
        {emphasized && (
          <text x={mx + 6} y={my + 14} fill={color} fontSize={fs} fontWeight={700}>
            {el.symbol}
          </text>
        )}
        <title>{title}</title>
      </g>
    )
  }
  if (p.mode === 'face') {
    // Plane parallel to the page: corner mark, glide arrow (if any), height.
    const corner = toSvg(0.06, 0.94)
    const c1 = toSvg(0.06, 0.8)
    const c2 = toSvg(0.2, 0.94)
    const g = projectFrac(emphasized ? c.intrinsicRaw : c.intrinsic, proj)
    const mag = Math.hypot(g.u, g.v)
    const from = toSvg(0.24, 0.88)
    const to = mag > 1e-9 ? toSvg(0.24 + (g.u / mag) * 0.14, 0.88 + (g.v / mag) * 0.14) : null
    return (
      <g className={tag} opacity={opacity} {...data}>
        <path d={`M ${c1.x} ${c1.y} L ${corner.x} ${corner.y} L ${c2.x} ${c2.y}`} fill="none" stroke={color} strokeWidth={strokeW} />
        {to && (c.kind === 'glide' || emphasized) && <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} strokeWidth={strokeW} markerEnd="url(#d2-arrow)" />}
        <text x={corner.x + 4} y={corner.y + 14} fill={color} fontSize={fs} fontWeight={700}>
          {el.symbol} {formatQuarter(((p.w % 1) + 1) % 1)}
        </text>
        <title>{title}</title>
      </g>
    )
  }
  if (p.mode === 'inclined-plane') {
    const pts = p.poly.map((q) => toSvg(q.u, q.v))
    return (
      <g className={tag} opacity={opacity} {...data}>
        <polygon points={pts.map((q) => `${q.x},${q.y}`).join(' ')} fill={color} fillOpacity={0.08} stroke={color} strokeWidth={1} strokeDasharray="2 3" />
        <text x={pts[0].x + 4} y={pts[0].y - 4} fill={color} fontSize={fs} fontWeight={700}>
          {el.symbol} (inclined)
        </text>
        <title>{title}</title>
      </g>
    )
  }
  const { x, y } = toSvg(p.u, p.v)
  const r = emphasized ? 5.5 : 4.5
  return (
    <g className={tag} opacity={opacity} {...data}>
      <circle cx={x} cy={y} r={r} fill="var(--bg, #070b14)" stroke={color} strokeWidth={emphasized ? 1.8 : 1.3} />
      <circle cx={x} cy={y} r={1.4} fill={color} />
      <title>{title}</title>
    </g>
  )
}

function ElementsLayer({
  context,
  selected,
  proj,
  toSvg,
  selectedIndex,
  labelScale,
}: {
  context: ProjectedElement[]
  selected: ProjectedElement | null
  proj: ProjectionInfo
  toSvg: ToSvg
  selectedIndex: number
  labelScale: number
}) {
  return (
    <g className="d2-elements">
      {context.map((p, i) => (
        <ElementGlyph key={`ctx-${i}`} p={p} proj={proj} toSvg={toSvg} emphasized={false} dimmed={selectedIndex !== 1} labelScale={labelScale} />
      ))}
      {selected && <ElementGlyph p={selected} proj={proj} toSvg={toSvg} emphasized dimmed={false} labelScale={labelScale} />}
    </g>
  )
}

export default function SpaceGroupDiagram2D({
  demo,
  selectedIndex,
  onSelect,
  showAllSites = true,
  placementMode = 'nearest',
  multiples,
}: Props) {
  const plotRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 440, h: 300 })
  const demoKey = demo.meta.number
  const [projDir, setProjDir] = useState<ProjectionDir>(demo.defaultProjection)
  const [seenDemoKey, setSeenDemoKey] = useState(demoKey)
  // Adjust state during render when the demo changes (React-recommended pattern).
  if (seenDemoKey !== demoKey) {
    setSeenDemoKey(demoKey)
    setProjDir(demo.defaultProjection)
  }

  useEffect(() => {
    const el = plotRef.current
    if (!el) return
    const sync = () => {
      const r = el.getBoundingClientRect()
      const w = Math.max(160, Math.round(r.width))
      const h = Math.max(140, Math.round(r.height))
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }))
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const projections = useMemo(() => buildProjections(demo.cell), [demo.cell])
  const proj = projections[projDir]
  const points = useMemo(
    () => placedPositions(demo, selectedIndex, placementMode).points,
    [demo, selectedIndex, placementMode],
  )
  const overlay = useMemo(
    () => elementOverlay(demo, selectedIndex, placementMode),
    [demo, selectedIndex, placementMode],
  )
  const projected = useMemo(() => {
    const ctx = dedupeProjected(
      overlay.context
        .map((e) => projectElement(e, proj))
        .filter((p): p is ProjectedElement => p !== null && p.mode !== 'inclined-plane'),
    )
    const sel = overlay.selected ? projectElement(overlay.selected, proj) : null
    return { ctx, sel }
  }, [overlay, proj])

  const mU = multiples ? multiples[proj.uIndex] : 1
  const mV = multiples ? multiples[proj.vIndex] : 1
  const mW = multiples ? multiples[proj.wIndex] : 1
  const tiled = mU > 1 || mV > 1
  const hv = ({ a: 'x', b: 'y', c: 'z' } as Record<string, string>)[proj.axisW] ?? 'w'
  const tiles = useMemo(() => {
    const t: [number, number][] = []
    for (let i = 0; i < mU; i++) for (let j = 0; j < mV; j++) t.push([i, j])
    return t
  }, [mU, mV])

  const viewW = size.w
  const viewH = size.h
  const plotW = Math.max(40, viewW - PAD.left - PAD.right)
  const plotH = Math.max(40, viewH - PAD.top - PAD.bottom)

  // Bounding box in plane-embed coords (handles monoclinic shear).
  const extent = useMemo(() => {
    const samples: { x: number; y: number }[] = []
    for (const uu of [0, 1]) {
      for (const vv of [0, 1]) {
        samples.push(planeEmbed(uu * mU, vv * mV, proj, demo.cell))
      }
    }
    for (const pt of points) {
      if (
        !showAllSites &&
        pt.index !== 1 &&
        pt.index !== selectedIndex
      ) {
        continue
      }
      const { u, v } = projectFrac(pt.fractional, proj)
      samples.push(planeEmbed(u, v, proj, demo.cell))
      if (tiled) samples.push(planeEmbed(u + mU - 1, v + mV - 1, proj, demo.cell))
    }
    const pad = placementMode === 'nearest' ? 0.08 : 0.02
    // pad in fractional → approx via cell sizes
    const padX = pad * Math.max(proj.sizeU, proj.sizeV)
    const padY = padX
    let x0 = Math.min(...samples.map((s) => s.x)) - padX
    let x1 = Math.max(...samples.map((s) => s.x)) + padX
    let y0 = Math.min(...samples.map((s) => s.y)) - padY
    let y1 = Math.max(...samples.map((s) => s.y)) + padY
    return { x0, x1, y0, y1 }
  }, [points, proj, demo.cell, placementMode, showAllSites, selectedIndex, mU, mV, tiled])

  const worldW = Math.max(1e-6, extent.x1 - extent.x0)
  const worldH = Math.max(1e-6, extent.y1 - extent.y0)
  const scale = Math.min(plotW / worldW, plotH / worldH)
  const labelScale = Math.max(1, Math.min(1.35, scale / 160))
  const drawnW = worldW * scale
  const drawnH = worldH * scale
  const offsetX = PAD.left + (plotW - drawnW) / 2
  const offsetY = PAD.top + (plotH - drawnH) / 2

  const toSvg = (u: number, v: number) => {
    const e = planeEmbed(u, v, proj, demo.cell)
    return {
      x: offsetX + (e.x - extent.x0) * scale,
      y: offsetY + (extent.y1 - e.y) * scale,
    }
  }

  const origin = toSvg(0, 0)
  const cornerA = toSvg(1, 0)
  const cornerB = toSvg(0, 1)
  const cornerAB = toSvg(1, 1)
  const shift = (i: number, j: number) => {
    const p = toSvg(i, j)
    return `translate(${p.x - origin.x} ${p.y - origin.y})`
  }

  return (
    <section
      className="diagram2d"
      aria-label={`${demo.shortName} 2D space-group diagram`}
    >
      <header className="diagram2d-header">
        <div className="diagram2d-title">
          <span className="eyebrow">{demo.shortName} · projection</span>
          <span className="diagram2d-sub">
            JKC origin ·{' '}
            {placementMode === 'nearest'
              ? 'nearest lattice copies (may leave cell)'
              : 'wrapped [0,1)²'}{' '}
            · click a site to select
          </span>
        </div>
        <div
          className="segmented"
          role="group"
          aria-label="Projection direction"
        >
          {(['c', 'b', 'a'] as ProjectionDir[]).map((d) => (
            <button
              key={d}
              type="button"
              className={projDir === d ? 'seg active' : 'seg'}
              onClick={() => setProjDir(d)}
            >
              {projections[d].label}
            </button>
          ))}
        </div>
      </header>
            {(tiled || mW > 1) && (
              <p className="diagram2d-supercell-note" role="note">
                {mU}×{mV} cells in {proj.axisU}
                {proj.axisV}
                {mW > 1
                  ? ` · ×${mW} along ${proj.axisW} (stacked; heights ${hv}, 1+${hv}…${mW - 1}+${hv})`
                  : ''}
              </p>
            )}

      <div className="diagram2d-plot" ref={plotRef}>
      <svg
        className="diagram2d-svg"
        width="100%"
        height="100%"
        viewBox={`0 0 ${viewW} ${viewH}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${demo.shortName} diagram looking down ${proj.axisW}`}
      >
        <defs>
          <marker
            id="d2-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
          </marker>
        </defs>

        <g className="d2-cell">
          <polygon
            points={`${origin.x},${origin.y} ${cornerA.x},${cornerA.y} ${cornerAB.x},${cornerAB.y} ${cornerB.x},${cornerB.y}`}
            fill="rgba(15, 23, 42, 0.55)"
            stroke="#94a3b8"
            strokeWidth={1.6}
          />
          <line
            x1={toSvg(0.5, 0).x}
            y1={toSvg(0.5, 0).y}
            x2={toSvg(0.5, 1).x}
            y2={toSvg(0.5, 1).y}
            stroke="#334155"
            strokeWidth={1}
          />
          <line
            x1={toSvg(0, 0.5).x}
            y1={toSvg(0, 0.5).y}
            x2={toSvg(1, 0.5).x}
            y2={toSvg(1, 0.5).y}
            stroke="#334155"
            strokeWidth={1}
          />
        </g>

        {tiled && (
          <g className="d2-supercell" pointerEvents="none">
            {tiles
              .filter(([i, j]) => i || j)
              .map(([i, j]) => (
                <g key={`c${i},${j}`} transform={shift(i, j)} opacity={0.75}>
                  <polygon
                    points={`${origin.x},${origin.y} ${cornerA.x},${cornerA.y} ${cornerAB.x},${cornerAB.y} ${cornerB.x},${cornerB.y}`}
                    fill="rgba(15, 23, 42, 0.35)"
                    stroke="#475569"
                    strokeWidth={1}
                  />
                </g>
              ))}
            <polygon
              points={[toSvg(0, 0), toSvg(mU, 0), toSvg(mU, mV), toSvg(0, mV)]
                .map((p) => `${p.x},${p.y}`)
                .join(' ')}
              fill="none"
              stroke="#fbbf24"
              strokeWidth={1.6}
              opacity={0.85}
            />
          </g>
        )}
        {tiled &&
          tiles
            .filter(([i, j]) => i || j)
            .map(([i, j]) => (
              <g
                key={`s${i},${j}`}
                transform={shift(i, j)}
                opacity={0.45}
                pointerEvents="none"
                aria-hidden="true"
              >
                <ElementsLayer context={projected.ctx} selected={null} proj={proj} toSvg={toSvg} selectedIndex={selectedIndex} labelScale={labelScale} />
                {points
                  .filter((pt) => showAllSites || pt.index === 1 || pt.index === selectedIndex)
                  .map((pt) => {
                    const { u, v, w } = projectFrac(pt.fractional, proj)
                    const { x, y } = toSvg(u, v)
                    const r = 7 * Math.min(1.12, labelScale)
                    return (
                      <g key={pt.index} className="d2-site replica">
                        <circle cx={x} cy={y} r={r} fill="rgba(7, 11, 20, 0.9)" stroke={pt.classColor} strokeWidth={1.3} />
                        {pt.improper && (
                          <text x={x} y={y + 3.5 * labelScale} textAnchor="middle" fill={pt.classColor} fontSize={15 * labelScale} fontWeight={700}>,</text>
                        )}
                        <text x={x + r + 3} y={y + 6 * labelScale} fill="#64748b" fontSize={10.5 * labelScale} fontFamily="ui-monospace, Menlo, monospace">
                          {formatHeightLabel(w)}
                        </text>
                      </g>
                    )
                  })}
              </g>
            ))}

        <ElementsLayer
          context={projected.ctx}
          selected={projected.sel}
          proj={proj}
          toSvg={toSvg}
          selectedIndex={selectedIndex}
          labelScale={labelScale}
        />

        <g className="d2-sites">
          {points
            .filter(
              (pt) =>
                showAllSites ||
                pt.index === 1 ||
                pt.index === selectedIndex,
            )
            .map((pt) => {
            const { u, v, w } = projectFrac(pt.fractional, proj)
            const { x, y } = toSvg(u, v)
            const isBase = pt.index === 1
            const isImage = pt.index === selectedIndex && selectedIndex !== 1
            const isSelected = pt.index === selectedIndex
            const dim =
              selectedIndex !== 1 && !isBase && !isImage ? 0.28 : 1
            const fill = pt.classColor
            const r = (isBase || isImage ? 8.5 : 7) * Math.min(1.12, labelScale)

            return (
              <g
                key={pt.index}
                opacity={dim}
                className={
                  isImage
                    ? 'd2-site image'
                    : isBase
                      ? 'd2-site base'
                      : 'd2-site'
                }
                style={{ cursor: 'pointer' }}
                onClick={() => onSelect(pt.index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(pt.index)
                  }
                }}
              >
                {(isBase || isImage) && (
                  <circle
                    cx={x}
                    cy={y}
                    r={r + 4}
                    fill="none"
                    stroke={isImage ? '#fef08a' : '#f8fafc'}
                    strokeWidth={1.5}
                    strokeDasharray={isImage ? '3 2' : undefined}
                  />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill="rgba(7, 11, 20, 0.9)"
                  stroke={fill}
                  strokeWidth={isSelected ? 2.2 : 1.5}
                />
                {pt.improper && (
                  <text
                    x={x}
                    y={y + 3.5 * labelScale}
                    textAnchor="middle"
                    fill={fill}
                    fontSize={15 * labelScale}
                    fontWeight={700}
                    fontFamily="Georgia, 'Times New Roman', serif"
                  >
                    ,
                  </text>
                )}
                <text
                  x={x + r + 3}
                  y={y - r + 2}
                  fill={isImage ? '#fef08a' : isBase ? '#f8fafc' : '#94a3b8'}
                  fontSize={12.5 * labelScale}
                  fontWeight={700}
                >
                  {isBase ? 'B' : isImage ? 'I' : pt.index}
                </text>
                <text
                  x={x + r + 3}
                  y={y + 6 * labelScale}
                  fill="#64748b"
                  fontSize={10.5 * labelScale}
                  fontFamily="ui-monospace, Menlo, monospace"
                >
                  {formatHeightLabel(w)}
                </text>
                <title>
                  {`op ${pt.index}: ${pt.operator.triplet}${
                    pt.improper ? ' (improper)' : ''
                  }`}
                </title>
              </g>
            )
          })}
        </g>

        <g
          className="d2-axes"
          fill="#94a3b8"
          fontSize={14 * labelScale}
          fontWeight={600}
        >
          <text
            x={origin.x - 12}
            y={origin.y + 18}
            textAnchor="middle"
            fontSize={16 * labelScale}
            fontStyle="italic"
            fontFamily="Georgia, 'Times New Roman', serif"
          >
            o
          </text>
          <text
            x={(origin.x + cornerA.x) / 2}
            y={origin.y + 22}
            textAnchor="middle"
          >
            {proj.axisU} →
          </text>
          <text
            x={origin.x - 18}
            y={(origin.y + cornerB.y) / 2}
            textAnchor="middle"
            transform={`rotate(-90 ${origin.x - 18} ${
              (origin.y + cornerB.y) / 2
            })`}
          >
            {proj.axisV} →
          </text>
          <text
            x={toSvg(1, 1).x + 6}
            y={toSvg(1, 1).y + 14}
            fill="#64748b"
            fontSize={11 * labelScale}
          >
            {proj.axisW} ⊙
          </text>
        </g>
      </svg>
      </div>
    </section>
  )
}
