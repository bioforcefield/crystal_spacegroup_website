import { useMemo } from 'react'
import {
  activeFaceLabels,
  wulffPolygon2D,
  type FaceSpec,
} from '../../data/morphology/wulff2d'

const VB = 320
const PAD = 28
const PLOT = VB - 2 * PAD

export default function WulffOutline2D({
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
      const mid = toSvg((a.x + b.x) / 2, (a.y + b.y) / 2)
      const face = a.faces[0] === b.faces[0] || a.faces[0] === b.faces[1]
        ? a.faces[0]
        : a.faces[1]
      edgeLabels.push({ x: mid.x, y: mid.y, text: face })
    }
  }

  return (
    <svg
      className="teach-svg"
      viewBox={`0 0 ${VB} ${VB}`}
      role="img"
      aria-label={`2D Wulff outline habit ${habitLabel}. Active faces: ${labels.join(', ') || 'none'}. Aspect ${result.aspect.toFixed(2)}.`}
    >
      <title>{habitLabel} · 2D Wulff outline</title>
      <rect x={4} y={4} width={VB - 8} height={VB - 8} rx={10} className="teach-plot-frame" />
      {poly ? (
        <polygon points={poly} className="teach-wulff-poly" />
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
