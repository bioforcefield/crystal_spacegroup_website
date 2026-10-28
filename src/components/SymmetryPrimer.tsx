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
    body: 'Point reflection through a center (⊙). Improper — handedness flips (enantiomorph).',
  },
  {
    id: 'twofold',
    title: '2-fold rotation',
    subtitle: '180° · axis ⊥ page',
    color: '#67e8f9',
    body: 'Top-down view: rotate 180° about an axis pointing at you (ITA lens). Proper — same handedness (near● / far○ kept); the L ends upside-down. No translation.',
  },
  {
    id: 'screw',
    title: '2₁ screw',
    subtitle: 'side view: 180° + ½ along axis',
    color: SYMMETRY_CLASSES.screw.color,
    body: 'Side view: rotate 180° about the vertical axis while sliding half a cell along it. Proper — same handedness (near● / far○ cue kept). Motif stays upright; unlike the top-down 2-fold.',
  },
  {
    id: 'mirror',
    title: 'Mirror plane',
    subtitle: 'reflection',
    color: '#e2e8f0',
    body: 'Reflect across a plane. Improper — handedness flips (near● / far○ cue reverses). (Pbca has no mirrors; it uses glides instead.)',
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
 * Chiral L-marker (stem + right arm + tip) plus a depth/handedness cue:
 * filled near● (toward viewer) below the arm, hollow far○ above.
 * `enantiomorph` reverses the near/far cyclic order (same L topology, opposite hand).
 * Improper ops end on the enantiomorph; proper ops keep it.
 */
function MotifGlyph({
  fill,
  enantiomorph = false,
}: {
  fill: string
  enantiomorph?: boolean
}) {
  // Same L topology always (arm +x). Handedness = cyclic order of near● / far○.
  // Right hand: near below arm (toward viewer), far above. Left: swapped.
  const nearY = enantiomorph ? -9.0 : -3.0
  const farY = enantiomorph ? -3.0 : -9.0
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
      {/* Handedness / depth cue (near● toward viewer, far○ away) */}
      <circle className="primer-hand-near" cx={5} cy={nearY} r={2.15} fill={fill} />
      <circle
        className="primer-hand-far"
        cx={5}
        cy={farY}
        r={2.15}
        fill="none"
        stroke={fill}
        strokeWidth={1.35}
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
  /** Opposite hand (improper image). Same L; near/far cue reversed. */
  enantiomorph = false,
}: {
  x: number
  y: number
  fill: string
  label?: string
  className?: string
  opacity?: number
  orient?: string
  enantiomorph?: boolean
}) {
  const tf = orient
    ? `translate(${x},${y}) ${orient}`
    : `translate(${x},${y})`
  return (
    <g
      transform={tf}
      className={className}
      opacity={opacity}
      data-enantiomorph={enantiomorph ? 'flipped' : 'same'}
    >
      <MotifGlyph fill={fill} enantiomorph={enantiomorph} />
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
  enantiomorph = false,
}: {
  fill: string
  className?: string
  enantiomorph?: boolean
}) {
  return (
    <g
      className={className}
      data-enantiomorph={enantiomorph ? 'flipped' : 'same'}
    >
      <MotifGlyph fill={fill} enantiomorph={enantiomorph} />
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
          <Motif
            x={34}
            y={26}
            fill={color}
            label="B"
            opacity={0.35}
            enantiomorph={false}
            className="primer-marker"
          />
          {/* Improper: point inversion = scale(-1,-1) of the right-hand Motif */}
          <Motif
            x={86}
            y={46}
            fill={color}
            label="I"
            opacity={0.35}
            enantiomorph={false}
            orient="scale(-1,-1)"
            className="primer-marker primer-static-end primer-hand-flipped"
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
          {/* ITA digon / lens only — axis ⊥ page (no in-plane stroke) */}
          <ellipse
            cx={60}
            cy={36}
            rx={4}
            ry={7}
            fill={color}
            fillOpacity={0.22}
            stroke={color}
            strokeWidth={1.6}
          />
          {/* Same height; I is 180° in-plane (proper; L upside-down) */}
          <Motif
            x={38}
            y={36}
            fill={color}
            label="B"
            opacity={0.35}
            enantiomorph={false}
            className="primer-marker"
          />
          <Motif
            x={82}
            y={36}
            fill={color}
            label="I"
            opacity={0.35}
            enantiomorph={false}
            orient="rotate(180)"
            className="primer-marker primer-static-end"
          />
          <path
            d="M44 48 A 22 22 0 0 0 76 48"
            fill="none"
            stroke={color}
            strokeWidth={1.3}
            strokeDasharray="3 2"
            opacity={0.5}
            markerEnd="url(#primer-twofold-arrow)"
            className="primer-guide-path"
          />
          <defs>
            <marker
              id="primer-twofold-arrow"
              viewBox="0 0 10 10"
              refX={8}
              refY={5}
              markerWidth={5}
              markerHeight={5}
              orient="auto-start-reverse"
            >
              <path d="M0 0 L10 5 L0 10 z" fill={color} />
            </marker>
          </defs>
          {/* Smooth 180° about lens center (60,36) */}
          <g className="primer-mover primer-twofold-rotor">
            <Motif x={38} y={36} fill={color} />
          </g>
        </svg>
      )
    case 'screw':
      return (
        <svg viewBox="0 0 120 78" className="primer-svg primer-screw" aria-hidden>
          <CellFrame />
          {/* Side view: vertical screw axis only (no end-on lens) */}
          <line
            x1={60}
            y1={12}
            x2={60}
            y2={60}
            stroke={color}
            strokeWidth={2.4}
            strokeLinecap="round"
          />
          {/* ITA-ish 2₁ half-arrow ticks along the axis */}
          <path
            d="M60 22 L67 19 M60 22 L67 25"
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M60 50 L53 47 M60 50 L53 53"
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Proper 2₁: same enantiomorph both ends (near●/far○ kept). No scaleX(-1) —
              that would be improper and look like the mirror card. Helix path + +½ teach the 180°. */}
          <Motif
            x={36}
            y={22}
            fill={color}
            label="B"
            opacity={0.35}
            enantiomorph={false}
            className="primer-marker"
          />
          <Motif
            x={84}
            y={50}
            fill={color}
            label="I"
            opacity={0.35}
            enantiomorph={false}
            className="primer-marker primer-static-end"
          />
          <text x={10} y={74} fill={color} fontSize={7} fontWeight={600} opacity={0.9}>
            proper — hand kept
          </text>
          <path
            d="M40 28 C48 28, 52 36, 60 36 C68 36, 72 44, 80 44"
            fill="none"
            stroke={color}
            strokeWidth={1.3}
            strokeDasharray="3 2"
            className="primer-guide-path"
            opacity={0.55}
          />
          <text x={68} y={16} fill={color} fontSize={9} fontWeight={700}>
            +½
          </text>
          {/* Helical: across-axis + +½; foreshorten through axis; hand kept (no scaleX sign flip) */}
          <g className="primer-mover primer-screw-ghost">
            <MotifLocal fill={color} enantiomorph={false} />
          </g>
        </svg>
      )
    case 'mirror':
      return (
        <svg viewBox="0 0 120 78" className="primer-svg" aria-hidden>
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
            enantiomorph={false}
            className="primer-marker"
          />
          {/* Improper: opposite enantiomorph (near●/far○ reversed) + scaleX across the plane */}
          <Motif
            x={86}
            y={36}
            fill="#fde68a"
            label="I"
            opacity={0.35}
            enantiomorph={true}
            orient="scale(-1,1)"
            className="primer-marker primer-static-end"
          />
          <text x={10} y={74} fill="#fde68a" fontSize={7} fontWeight={600} opacity={0.9}>
            improper — hand flips
          </text>
          {/* Continuous scaleX(-1) about the mirror line x=60 — improper; hand cue flips */}
          <g className="primer-mover primer-mirror-rotor">
            <MotifLocal fill="#38bdf8" enantiomorph={false} />
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
          <Motif
            x={32}
            y={22}
            fill={color}
            label="B"
            opacity={0.35}
            enantiomorph={false}
            className="primer-marker"
          />
          {/* Improper: reflect then translate — scaleY(-1) of the right-hand Motif */}
          <Motif
            x={88}
            y={50}
            fill={color}
            label="I"
            opacity={0.35}
            enantiomorph={false}
            orient="scale(1,-1)"
            className="primer-marker primer-static-end primer-hand-flipped"
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
