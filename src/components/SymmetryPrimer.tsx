/** Lightweight SVG demos of common space-group operations (index primer). */

import type { CSSProperties } from 'react'
import { SYMMETRY_CLASSES } from '../data/pbca'

type DemoId =
  | 'identity'
  | 'inversion'
  | 'twofold'
  | 'screw'
  | 'mirror'
  | 'glide'

interface DemoSpec {
  id: DemoId
  title: string
  subtitle: string
  color: string
  body: string
}

const DEMOS: DemoSpec[] = [
  {
    id: 'identity',
    title: 'Identity',
    subtitle: 'x, y, z',
    color: SYMMETRY_CLASSES.identity.color,
    body: 'Does nothing — every space group includes the identity. The BASE motif maps to itself.',
  },
  {
    id: 'inversion',
    title: 'Inversion center',
    subtitle: '−x, −y, −z (about a point)',
    color: SYMMETRY_CLASSES.inversion.color,
    body: 'Point reflection through a center (⊙). Reverses handedness — an improper operation.',
  },
  {
    id: 'twofold',
    title: '2-fold rotation',
    subtitle: '180° about an axis',
    color: '#67e8f9',
    body: 'Rotate 180° about an axis. Proper: handedness is preserved. Pure 2-folds appear in many groups.',
  },
  {
    id: 'screw',
    title: '2₁ screw',
    subtitle: '180° + ½ translation',
    color: SYMMETRY_CLASSES.screw.color,
    body: 'Rotate 180° and slide half a cell along the axis. Many common groups (including Pbca) use 2₁ screws.',
  },
  {
    id: 'mirror',
    title: 'Mirror plane',
    subtitle: 'reflection',
    color: '#e2e8f0',
    body: 'Reflect across a plane. Improper — chirality flips. (Pbca has no mirrors; it uses glides instead.)',
  },
  {
    id: 'glide',
    title: 'Glide plane',
    subtitle: 'reflect + translate',
    color: SYMMETRY_CLASSES['a-glide'].color,
    body: 'Reflect, then translate by a fraction of a lattice vector (a-, b-, c-, or n-glide). Named in symbols like Pbca and C2/c.',
  },
]

function Motif({
  x,
  y,
  mirrored = false,
  fill,
  label,
}: {
  x: number
  y: number
  mirrored?: boolean
  fill: string
  label?: string
}) {
  const tip = mirrored ? (
    <polygon points="0,-7 6,5 -6,5" fill={fill} opacity={0.95} />
  ) : (
    <circle cx={0} cy={-5} r={3.2} fill={fill} />
  )
  return (
    <g transform={`translate(${x},${y})`}>
      <line
        x1={0}
        y1={6}
        x2={0}
        y2={-2}
        stroke={fill}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      {tip}
      {!mirrored && (
        <rect x={-2.2} y={4} width={4.4} height={4.4} rx={0.6} fill={fill} />
      )}
      {mirrored && (
        <rect
          x={-2.2}
          y={4}
          width={4.4}
          height={4.4}
          rx={0.6}
          fill="none"
          stroke={fill}
          strokeWidth={1.4}
          strokeDasharray="2 1.5"
        />
      )}
      {label ? (
        <text
          x={0}
          y={18}
          textAnchor="middle"
          fill={fill}
          fontSize={8}
          fontWeight={700}
        >
          {label}
        </text>
      ) : null}
    </g>
  )
}

function DemoArt({ id, color }: { id: DemoId; color: string }) {
  switch (id) {
    case 'identity':
      return (
        <svg viewBox="0 0 120 72" className="primer-svg" aria-hidden>
          <rect
            x={8}
            y={8}
            width={104}
            height={56}
            rx={6}
            fill="none"
            stroke="#1e293b"
            strokeWidth={1.2}
          />
          <Motif x={60} y={34} fill={color} label="BASE" />
        </svg>
      )
    case 'inversion':
      return (
        <svg viewBox="0 0 120 72" className="primer-svg" aria-hidden>
          <rect
            x={8}
            y={8}
            width={104}
            height={56}
            rx={6}
            fill="none"
            stroke="#1e293b"
            strokeWidth={1.2}
          />
          <Motif x={34} y={26} fill={color} label="B" />
          <circle
            cx={60}
            cy={36}
            r={4}
            fill="none"
            stroke={color}
            strokeWidth={1.6}
          />
          <circle cx={60} cy={36} r={1.4} fill={color} />
          <line
            x1={42}
            y1={28}
            x2={78}
            y2={44}
            stroke={color}
            strokeWidth={1}
            strokeDasharray="3 2"
            opacity={0.7}
          />
          <Motif x={86} y={46} mirrored fill={color} label="I" />
        </svg>
      )
    case 'twofold':
      return (
        <svg viewBox="0 0 120 72" className="primer-svg" aria-hidden>
          <rect
            x={8}
            y={8}
            width={104}
            height={56}
            rx={6}
            fill="none"
            stroke="#1e293b"
            strokeWidth={1.2}
          />
          <line
            x1={60}
            y1={12}
            x2={60}
            y2={60}
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          />
          {/* Pure 2-fold: B and I at the same height (no shift along the axis; see screw card for +½). */}
          <Motif x={38} y={36} fill={color} label="B" />
          <Motif x={82} y={36} fill={color} label="I" />
          <path
            d="M44 50 Q60 62 76 50"
            fill="none"
            stroke={color}
            strokeWidth={1.2}
            strokeDasharray="3 2"
            opacity={0.75}
          />
        </svg>
      )
    case 'screw':
      return (
        <svg viewBox="0 0 120 72" className="primer-svg primer-screw" aria-hidden>
          <rect
            x={8}
            y={8}
            width={104}
            height={56}
            rx={6}
            fill="none"
            stroke="#1e293b"
            strokeWidth={1.2}
          />
          <line
            x1={60}
            y1={12}
            x2={60}
            y2={60}
            stroke={color}
            strokeWidth={2.4}
            strokeLinecap="round"
          />
          <Motif x={36} y={24} fill={color} label="B" />
          <Motif x={84} y={48} fill={color} label="I" />
          <path
            d="M40 34 C52 20, 68 52, 80 38"
            fill="none"
            stroke={color}
            strokeWidth={1.3}
            strokeDasharray="3 2"
            className="primer-glide-path"
            opacity={0.85}
          />
          <text x={66} y={18} fill={color} fontSize={8} fontWeight={700}>
            +½
          </text>
        </svg>
      )
    case 'mirror':
      return (
        <svg viewBox="0 0 120 72" className="primer-svg" aria-hidden>
          <rect
            x={8}
            y={8}
            width={104}
            height={56}
            rx={6}
            fill="none"
            stroke="#1e293b"
            strokeWidth={1.2}
          />
          <line
            x1={60}
            y1={12}
            x2={60}
            y2={60}
            stroke={color}
            strokeWidth={1.8}
            strokeDasharray="4 3"
          />
          <Motif x={34} y={36} fill="#38bdf8" label="B" />
          <Motif x={86} y={36} mirrored fill="#fde68a" label="I" />
        </svg>
      )
    case 'glide':
      return (
        <svg viewBox="0 0 120 72" className="primer-svg" aria-hidden>
          <rect
            x={8}
            y={8}
            width={104}
            height={56}
            rx={6}
            fill="none"
            stroke="#1e293b"
            strokeWidth={1.2}
          />
          <line
            x1={20}
            y1={36}
            x2={100}
            y2={36}
            stroke={color}
            strokeWidth={2}
            strokeDasharray="6 3"
          />
          <Motif x={32} y={22} fill={color} label="B" />
          <Motif x={88} y={50} mirrored fill={color} label="I" />
          <path
            d="M38 28 H72"
            fill="none"
            stroke={color}
            strokeWidth={1.4}
            markerEnd="url(#arrow)"
            className="primer-glide-path"
          />
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX={8}
              refY={5}
              markerWidth={6}
              markerHeight={6}
              orient="auto-start-reverse"
            >
              <path d="M0 0 L10 5 L0 10 z" fill={color} />
            </marker>
          </defs>
          <text x={50} y={26} fill={color} fontSize={8} fontWeight={700}>
            glide →
          </text>
        </svg>
      )
  }
}

export default function SymmetryPrimer() {
  return (
    <div className="primer-grid">
      {DEMOS.map((d) => (
        <article key={d.id} className="primer-card" style={{ '--primer': d.color } as CSSProperties}>
          <div className="primer-art">
            <DemoArt id={d.id} color={d.color} />
          </div>
          <div className="primer-copy">
            <h3>{d.title}</h3>
            <p className="primer-sub">{d.subtitle}</p>
            <p>{d.body}</p>
          </div>
        </article>
      ))}
    </div>
  )
}
