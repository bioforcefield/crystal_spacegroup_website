/** Lightweight SVG demos of common space-group operations (index primer). */

import { useEffect, useRef, type CSSProperties } from 'react'
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

/**
 * Chiral 2D L-marker (stem + right arm + tip). Same glyph for every op;
 * improper ops use geometric scale/mirror transforms, never a tip swap.
 */
function MotifGlyph({ fill }: { fill: string }) {
  return (
    <g>
      {/* Vertical stem */}
      <path
        d="M0 7.5 V-6"
        fill="none"
        stroke={fill}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      {/* Asymmetric right arm */}
      <path
        d="M0 -6 H9"
        fill="none"
        stroke={fill}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      {/* Tip flag — breaks left/right symmetry so orientation reads clearly */}
      <polygon points="9,-6 13,-3.2 9,-0.4" fill={fill} />
      {/* Short foot on +x only */}
      <path
        d="M0 7.5 H4.5"
        fill="none"
        stroke={fill}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </g>
  )
}

function Motif({
  x,
  y,
  fill,
  label,
  className,
  opacity = 1,
  /** Extra SVG transform after translate(x,y), e.g. scale(-1,-1) for inversion image. */
  orient = '',
}: {
  x: number
  y: number
  fill: string
  label?: string
  className?: string
  opacity?: number
  orient?: string
}) {
  const tf = orient
    ? `translate(${x},${y}) ${orient}`
    : `translate(${x},${y})`
  return (
    <g transform={tf} className={className} opacity={opacity}>
      <MotifGlyph fill={fill} />
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

/** Motif at local origin — for CSS-transformed movers (same chiral glyph). */
function MotifLocal({
  fill,
  className,
}: {
  fill: string
  className?: string
}) {
  return (
    <g className={className}>
      <MotifGlyph fill={fill} />
    </g>
  )
}

function CellFrame() {
  return (
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
  )
}

function DemoArt({ id, color }: { id: DemoId; color: string }) {
  switch (id) {
    case 'identity':
      return (
        <svg viewBox="0 0 120 72" className="primer-svg" aria-hidden>
          <CellFrame />
          <g className="primer-mover primer-identity-pulse" transform="translate(60,34)">
            <MotifLocal fill={color} />
            <text
              x={0}
              y={18}
              textAnchor="middle"
              fill={color}
              fontSize={8}
              fontWeight={700}
            >
              BASE
            </text>
          </g>
        </svg>
      )
    case 'inversion':
      return (
        <svg viewBox="0 0 120 72" className="primer-svg" aria-hidden>
          <CellFrame />
          {/* Static B / enantiomorphic I (point-inverted orientation) */}
          <Motif x={34} y={26} fill={color} label="B" opacity={0.35} className="primer-marker" />
          <Motif
            x={86}
            y={46}
            fill={color}
            label="I"
            opacity={0.35}
            orient="scale(-1,-1)"
            className="primer-marker primer-static-end"
          />
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
            opacity={0.45}
            className="primer-guide-path"
          />
          {/* Continuous point inversion about (60,36): scale(1→−1) of offset from B */}
          <g className="primer-mover primer-inv-rotor">
            <MotifLocal fill={color} />
          </g>
        </svg>
      )
    case 'twofold':
      return (
        <svg viewBox="0 0 120 72" className="primer-svg" aria-hidden>
          <CellFrame />
          <line
            x1={60}
            y1={12}
            x2={60}
            y2={60}
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          />
          {/* Lens mark: CSS rotate is about axis ⊥ page through (60,36) */}
          <ellipse
            cx={60}
            cy={36}
            rx={3.2}
            ry={5.5}
            fill="none"
            stroke={color}
            strokeWidth={1.4}
          />
          {/* Pure 2-fold: same height; I is upright-rotated 180° (proper) */}
          <Motif x={38} y={36} fill={color} label="B" opacity={0.35} className="primer-marker" />
          <Motif
            x={82}
            y={36}
            fill={color}
            label="I"
            opacity={0.35}
            orient="rotate(180)"
            className="primer-marker primer-static-end"
          />
          <path
            d="M44 50 Q60 62 76 50"
            fill="none"
            stroke={color}
            strokeWidth={1.2}
            strokeDasharray="3 2"
            opacity={0.45}
            className="primer-guide-path"
          />
          {/* rotate(180) about (60,36): L ends upside-down — correct for axis ⊥ page */}
          <g className="primer-mover primer-twofold-rotor">
            <Motif x={38} y={36} fill={color} />
          </g>
        </svg>
      )
    case 'screw':
      return (
        <svg viewBox="0 0 120 72" className="primer-svg primer-screw" aria-hidden>
          <CellFrame />
          <line
            x1={60}
            y1={12}
            x2={60}
            y2={60}
            stroke={color}
            strokeWidth={2.4}
            strokeLinecap="round"
          />
          <Motif x={36} y={24} fill={color} label="B" opacity={0.35} className="primer-marker" />
          <Motif
            x={84}
            y={48}
            fill={color}
            label="I"
            opacity={0.35}
            orient="rotate(180)"
            className="primer-marker primer-static-end"
          />
          <path
            d="M40 34 C52 20, 68 52, 80 38"
            fill="none"
            stroke={color}
            strokeWidth={1.3}
            strokeDasharray="3 2"
            className="primer-guide-path primer-glide-path"
            opacity={0.55}
          />
          <text x={66} y={18} fill={color} fontSize={8} fontWeight={700}>
            +½
          </text>
          {/* Same 180° orientation change as 2-fold + +½ axial slide */}
          <g className="primer-mover primer-screw-ghost">
            <MotifLocal fill={color} />
          </g>
        </svg>
      )
    case 'mirror':
      return (
        <svg viewBox="0 0 120 72" className="primer-svg" aria-hidden>
          <CellFrame />
          <line
            x1={60}
            y1={12}
            x2={60}
            y2={60}
            stroke={color}
            strokeWidth={1.8}
            strokeDasharray="4 3"
          />
          <Motif
            x={34}
            y={36}
            fill="#38bdf8"
            label="B"
            opacity={0.35}
            className="primer-marker"
          />
          <Motif
            x={86}
            y={36}
            fill="#fde68a"
            label="I"
            opacity={0.35}
            orient="scale(-1,1)"
            className="primer-marker primer-static-end"
          />
          {/* Continuous scaleX(-1) about the mirror line x=60 */}
          <g className="primer-mover primer-mirror-rotor">
            <MotifLocal fill="#38bdf8" />
          </g>
        </svg>
      )
    case 'glide':
      return (
        <svg viewBox="0 0 120 72" className="primer-svg" aria-hidden>
          <CellFrame />
          <line
            x1={20}
            y1={36}
            x2={100}
            y2={36}
            stroke={color}
            strokeWidth={2}
            strokeDasharray="6 3"
          />
          <Motif x={32} y={22} fill={color} label="B" opacity={0.35} className="primer-marker" />
          <Motif
            x={88}
            y={50}
            fill={color}
            label="I"
            opacity={0.35}
            orient="scale(1,-1)"
            className="primer-marker primer-static-end"
          />
          <path
            d="M38 28 H72"
            fill="none"
            stroke={color}
            strokeWidth={1.4}
            markerEnd="url(#primer-glide-arrow)"
            className="primer-glide-path primer-guide-path"
          />
          <defs>
            <marker
              id="primer-glide-arrow"
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
          {/* Reflect across y=36 (scaleY), then translate along the plane */}
          <g className="primer-mover primer-glide-ghost">
            <MotifLocal fill={color} />
          </g>
        </svg>
      )
  }
}

export default function SymmetryPrimer() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const cards = root.querySelectorAll<HTMLElement>('.primer-card')
    if (typeof IntersectionObserver === 'undefined') {
      cards.forEach((c) => c.classList.add('is-inview'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          e.target.classList.toggle('is-inview', e.isIntersecting)
        }
      },
      { threshold: 0.28, rootMargin: '40px 0px' },
    )
    cards.forEach((c) => io.observe(c))
    return () => io.disconnect()
  }, [])

  return (
    <div className="primer-grid" ref={rootRef}>
      {DEMOS.map((d) => (
        <article
          key={d.id}
          className="primer-card is-inview"
          data-primer={d.id}
          style={{ '--primer': d.color } as CSSProperties}
        >
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
