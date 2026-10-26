import { useEffect, useMemo, useRef, useState } from 'react'
import {
  allProjectedGlides,
  allProjectedScrews,
  buildProjections,
  formatHeightLabel,
  planeEmbed,
  projectFrac,
  projectInversions,
  type ProjectionDir,
  type ProjectedGlide,
  type ProjectedScrew,
} from '../data/diagram2d'
import {
  placedPositions,
  type PlacementMode,
} from '../data/nearestImages'
import type { SpaceGroupDemo, SymmetryClassId } from '../data/types'

interface Props {
  demo: SpaceGroupDemo
  selectedIndex: number
  onSelect: (index: number) => void
  showAllSites?: boolean
  placementMode?: PlacementMode
}

const PAD = { left: 40, right: 32, top: 18, bottom: 34 }

function classColor(demo: SpaceGroupDemo, id: SymmetryClassId): string {
  return demo.symmetryClasses[id].color
}

/** Curved half-arrow on an end-on 2₁ symbol (ITA-ish). */
function endOnHalfArrow(cx: number, cy: number, r: number): string {
  const a0 = -0.4
  const a1 = 1.9
  const x0 = cx + r * Math.cos(a0)
  const y0 = cy + r * Math.sin(a0)
  const x1 = cx + r * Math.cos(a1)
  const y1 = cy + r * Math.sin(a1)
  const tx = -Math.sin(a1)
  const ty = Math.cos(a1)
  const hx = x1 + tx * 5
  const hy = y1 + ty * 5
  const bx = x1 - tx * 2.5 - Math.cos(a1) * 4
  const by = y1 - ty * 2.5 - Math.sin(a1) * 4
  return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1} M ${hx} ${hy} L ${x1} ${y1} L ${bx} ${by}`
}

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

function ScrewsLayer({
  demo,
  screws,
  selectedIndex,
  toSvg,
  labelScale,
}: {
  demo: SpaceGroupDemo
  screws: ProjectedScrew[]
  selectedIndex: number
  toSvg: (u: number, v: number) => { x: number; y: number }
  labelScale: number
}) {
  return (
    <g className="d2-screws">
      {screws.map((s, i) => {
        const kind = s.spec.kind ?? '21'
        const color =
          kind === '2'
            ? classColor(demo, 'twofold')
            : classColor(demo, 'screw')
        const active = s.spec.opIndex === selectedIndex
        const opacity = selectedIndex === 1 ? 0.55 : active ? 1 : 0.22
        const strokeW = active ? 2.2 : 1.35
        const symbol = kind === '2' ? '2' : '2₁'
        if (s.mode === 'end-on') {
          const { x, y } = toSvg(s.u, s.v)
          const r = active ? 9 : 7.5
          return (
            <g key={`sc-eo-${i}`} opacity={opacity}>
              <circle
                cx={x}
                cy={y}
                r={r}
                fill={kind === '2' ? color : 'none'}
                fillOpacity={kind === '2' ? 0.35 : 0}
                stroke={color}
                strokeWidth={strokeW}
              />
              {kind === '21' && (
                <path
                  d={endOnHalfArrow(x, y, r)}
                  fill="none"
                  stroke={color}
                  strokeWidth={strokeW}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              <title>{`${symbol} ${s.spec.locus}`}</title>
            </g>
          )
        }
        const a = toSvg(s.u, s.v)
        const b = toSvg(s.u2, s.v2)
        const labelSide = Math.abs(s.u - s.u2) > Math.abs(s.v - s.v2) ? 1 : 0
        return (
          <g key={`sc-ip-${i}`} opacity={opacity}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={color}
              strokeWidth={strokeW}
              strokeLinecap="round"
            />
            {halfArrowHeads(a.x, a.y, b.x, b.y, color, strokeW)}
            {(s.w === 0.25 || s.w === 0.5 || s.w === 0.75) && (
              <text
                x={(a.x + b.x) / 2 + (labelSide ? 0 : 10)}
                y={(a.y + b.y) / 2 + (labelSide ? -8 : 4)}
                textAnchor="middle"
                fill={color}
                fontSize={12 * labelScale}
                fontWeight={600}
              >
                {s.w === 0.25 ? '¼' : s.w === 0.75 ? '¾' : '½'}
              </text>
            )}
            <title>{`${symbol} ${s.spec.locus}`}</title>
          </g>
        )
      })}
    </g>
  )
}

function drawFaceGlideMarks(
  g: ProjectedGlide,
  toSvg: (u: number, v: number) => { x: number; y: number },
  color: string,
  strokeW: number,
  labelScale: number,
) {
  // Compact ITA-style: glide arrow near the edge + height fraction
  const band = g.spec.primary ? 0.12 : 0.88
  const labelAt = g.spec.primary ? 0.06 : 0.94
  if (Math.abs(g.glideU) >= Math.abs(g.glideV) && Math.abs(g.glideU) > 1e-9) {
    const a = toSvg(0.28, band)
    const b = toSvg(0.72, band)
    const lab = toSvg(0.5, labelAt)
    return (
      <g>
        <line
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={color}
          strokeWidth={strokeW}
          strokeDasharray="5 3"
          markerEnd="url(#d2-arrow)"
        />
        <text
          x={lab.x}
          y={lab.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize={12 * labelScale}
          fontWeight={700}
        >
          {g.spec.label} {g.planeLabel}
        </text>
      </g>
    )
  }
  if (Math.abs(g.glideV) > 1e-9) {
    const a = toSvg(band, 0.28)
    const b = toSvg(band, 0.72)
    const lab = toSvg(labelAt, 0.5)
    return (
      <g>
        <line
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={color}
          strokeWidth={strokeW}
          strokeDasharray="5 3"
          markerEnd="url(#d2-arrow)"
        />
        <text
          x={lab.x}
          y={lab.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize={12 * labelScale}
          fontWeight={700}
        >
          {g.spec.label} {g.planeLabel}
        </text>
      </g>
    )
  }
  // Out-of-plane face glide (rare in these projections)
  const lab = toSvg(0.5, labelAt)
  return (
    <text
      x={lab.x}
      y={lab.y}
      textAnchor="middle"
      fill={color}
      fontSize={12 * labelScale}
      fontWeight={700}
    >
      {g.spec.label} {g.planeLabel}
    </text>
  )
}

function drawTraceGlideArrow(
  g: ProjectedGlide,
  toSvg: (u: number, v: number) => { x: number; y: number },
  color: string,
  strokeW: number,
) {
  const midU = (g.u + g.u2) / 2
  const midV = (g.v + g.v2) / 2
  const mid = toSvg(midU, midV)

  if (g.glideOutOfPlane) {
    return (
      <g>
        <circle
          cx={mid.x}
          cy={mid.y}
          r={3.5}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
        />
        <line
          x1={mid.x - 6}
          y1={mid.y}
          x2={mid.x + 6}
          y2={mid.y}
          stroke={color}
          strokeWidth={strokeW}
        />
        <line
          x1={mid.x}
          y1={mid.y - 6}
          x2={mid.x}
          y2={mid.y + 6}
          stroke={color}
          strokeWidth={strokeW}
        />
      </g>
    )
  }

  const len = 0.16
  const mag = Math.hypot(g.glideU, g.glideV) || 1
  const a = toSvg(midU - (g.glideU / mag) * len, midV - (g.glideV / mag) * len)
  const b = toSvg(midU + (g.glideU / mag) * len, midV + (g.glideV / mag) * len)
  return (
    <line
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke={color}
      strokeWidth={strokeW}
      markerEnd="url(#d2-arrow)"
    />
  )
}

function GlidesLayer({
  demo,
  glides,
  selectedIndex,
  toSvg,
  labelScale,
}: {
  demo: SpaceGroupDemo
  glides: ProjectedGlide[]
  selectedIndex: number
  toSvg: (u: number, v: number) => { x: number; y: number }
  labelScale: number
}) {
  return (
    <g className="d2-glides">
      {glides.map((g, i) => {
        const active = g.spec.opIndex === selectedIndex
        const color = classColor(demo, g.spec.classId)
        const opacity = selectedIndex === 1 ? 0.5 : active ? 1 : 0.2
        const strokeW = active ? 2 : 1.25

        if (g.mode === 'face') {
          return (
            <g key={`gl-face-${i}`} opacity={opacity}>
              {drawFaceGlideMarks(g, toSvg, color, strokeW, labelScale)}
              <title>{g.spec.locus}</title>
            </g>
          )
        }

        const a = toSvg(g.u, g.v)
        const b = toSvg(g.u2, g.v2)
        return (
          <g key={`gl-tr-${i}`} opacity={opacity}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={color}
              strokeWidth={strokeW}
              strokeDasharray="6 4"
              strokeLinecap="round"
            />
            {drawTraceGlideArrow(g, toSvg, color, strokeW)}
            <title>{g.spec.locus}</title>
          </g>
        )
      })}
    </g>
  )
}

function InversionsLayer({
  demo,
  selectedIndex,
  toSvg,
  proj,
}: {
  demo: SpaceGroupDemo
  selectedIndex: number
  toSvg: (u: number, v: number) => { x: number; y: number }
  proj: ReturnType<typeof buildProjections>['c']
}) {
  const inversions = useMemo(
    () => projectInversions(demo.inversionCenters, proj),
    [demo, proj],
  )
  const color = classColor(demo, 'inversion')
  const active =
    demo.operators.find((o) => o.index === selectedIndex)?.classId ===
    'inversion'
  return (
    <g className="d2-inversions">
      {inversions.map((inv, i) => {
        const { x, y } = toSvg(inv.u, inv.v)
        const opacity = selectedIndex === 1 ? 0.55 : active ? 1 : 0.25
        const r = active && inv.spec.primary ? 5.5 : 4.5
        return (
          <g key={`inv-${i}`} opacity={opacity}>
            <circle
              cx={x}
              cy={y}
              r={r}
              fill="var(--bg, #070b14)"
              stroke={color}
              strokeWidth={active ? 1.8 : 1.3}
            />
            <line
              x1={x - r}
              y1={y}
              x2={x + r}
              y2={y}
              stroke={color}
              strokeWidth={1.1}
            />
            <line
              x1={x}
              y1={y - r}
              x2={x}
              y2={y + r}
              stroke={color}
              strokeWidth={1.1}
            />
            <title>{`inversion ${inv.spec.locus}`}</title>
          </g>
        )
      })}
    </g>
  )
}

export default function SpaceGroupDiagram2D({
  demo,
  selectedIndex,
  onSelect,
  showAllSites = true,
  placementMode = 'nearest',
}: Props) {
  const [projDir, setProjDir] = useState<ProjectionDir>(demo.defaultProjection)
  const plotRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 440, h: 300 })

  useEffect(() => {
    setProjDir(demo.defaultProjection)
  }, [demo.defaultProjection, demo.meta.number])

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
  const screws = useMemo(
    () => allProjectedScrews(demo.screwAxes, proj),
    [demo.screwAxes, proj],
  )
  const glides = useMemo(
    () => allProjectedGlides(demo.glidePlanes, proj),
    [demo.glidePlanes, proj],
  )

  const viewW = size.w
  const viewH = size.h
  const plotW = Math.max(40, viewW - PAD.left - PAD.right)
  const plotH = Math.max(40, viewH - PAD.top - PAD.bottom)

  // Bounding box in plane-embed coords (handles monoclinic shear).
  const extent = useMemo(() => {
    const samples: { x: number; y: number }[] = []
    for (const uu of [0, 1]) {
      for (const vv of [0, 1]) {
        samples.push(planeEmbed(uu, vv, proj, demo.cell))
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
  }, [points, proj, demo.cell, placementMode, showAllSites, selectedIndex])

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

        <GlidesLayer
          demo={demo}
          glides={glides}
          selectedIndex={selectedIndex}
          toSvg={toSvg}
          labelScale={labelScale}
        />
        <ScrewsLayer
          demo={demo}
          screws={screws}
          selectedIndex={selectedIndex}
          toSvg={toSvg}
          labelScale={labelScale}
        />
        <InversionsLayer
          demo={demo}
          selectedIndex={selectedIndex}
          toSvg={toSvg}
          proj={proj}
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
