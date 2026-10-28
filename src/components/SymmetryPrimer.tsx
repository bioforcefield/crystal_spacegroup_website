/** Lightweight SVG demos of common space-group operations (index primer). */

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { SYMMETRY_CLASSES } from '../data/pbca'
import {
  iso,
  objectMap,
  screwEase,
  screwPose,
  SCREW_PRIMER,
  INVERSION_PRIMER,
  INVERSION_TIP_OBJECT,
  inversionScale,
  inversionJunction,
  inversionTipScreen,
} from '../data/primer/primerGeometry'

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
    body: 'Point reflection through a center (⊙): every tip of the isometric L passes through ⊙ to −r. Improper — enantiomorph. Distinct from a 2-fold (proper 180° spin that keeps the same hand).',
  },
  {
    id: 'twofold',
    title: '2-fold rotation',
    subtitle: '180° · axis ⊥ page',
    color: '#67e8f9',
    body: 'Top-down view: rotate 180° about an axis pointing at you (ITA lens). Proper — same enantiomorph; the isometric L ends upside-down. No translation along the axis.',
  },
  {
    id: 'screw',
    title: '2₁ screw',
    subtitle: 'side view: 180° + ½ along axis',
    color: SYMMETRY_CLASSES.screw.color,
    body: 'Side view of a 2₁: 180° about the vertical screw axis plus translation by ½ along that same axis. Proper — same enantiomorph (foot goes from toward→away after the turn). Distinct from a pure 2-fold (no slide) and from a mirror (hand would flip).',
  },
  {
    id: 'mirror',
    title: 'Mirror plane',
    subtitle: 'reflection',
    color: '#e2e8f0',
    body: 'Reflect across a plane. Improper — opposite enantiomorph of the isometric L (arm flips side; foot stays toward the viewer). (Pbca has no mirrors; it uses glides instead.)',
  },
  {
    id: 'glide',
    title: 'Glide plane',
    subtitle: 'reflect + translate',
    color: SYMMETRY_CLASSES['a-glide'].color,
    body: 'Reflect across a plane, then translate by a fraction of a lattice vector (a-, b-, c-, or n-glide). Improper — enantiomorph, then slide. Named in symbols like Pbca and C2/c.',
  },
]

function shade(hex: string, factor: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * factor)))
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * factor)))
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * factor)))
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

/**
 * True isometric chiral L (teaching triad): stem +Y, arm +X, foot +Z toward viewer.
 * Face-shaded beams + distinct tips (ball / triangle / square).
 * - enantiomorph: improper mirror (x → −x) after yaw
 * - yawDeg: proper rotation about +Y (0 = foot toward viewer; 180 = foot away)
 * - objectScale: central homothety in object space (InvGhost: 1→0→−1); negative ⇒ improper
 */
function MotifGlyph({
  fill,
  enantiomorph = false,
  yawDeg = 0,
  objectScale = 1,
}: {
  fill: string
  enantiomorph?: boolean
  /** Proper rotation about the stem / screw axis (degrees). */
  yawDeg?: number
  /** Object-space scale about the junction (1 = identity; −1 = full inversion). */
  objectScale?: number
}) {
  const lit = shade(fill, 1.15)
  const mid = fill
  const dim = shade(fill, 0.55)
  const edge = shade(fill, 0.35)

  const lx = 7.5
  const ly = 10
  const lz = 8.5
  const t = 1.55
  const ay = 1.2

  const P = (x: number, y: number, z: number) => {
    const [X, Y, Z] = objectMap(x, y, z, yawDeg, enantiomorph)
    return iso(X * objectScale, Y * objectScale, Z * objectScale)
  }
  const flipped = enantiomorph || objectScale < 0

  const stemFront = [P(-t, 0, t), P(t, 0, t), P(t, ly, t), P(-t, ly, t)]
  const stemRight = [P(t, 0, t), P(t, 0, -t), P(t, ly, -t), P(t, ly, t)]
  const stemTop = [P(-t, ly, t), P(t, ly, t), P(t, ly, -t), P(-t, ly, -t)]

  const armTop = [
    P(0, ay + t, t),
    P(lx, ay + t, t),
    P(lx, ay + t, -t),
    P(0, ay + t, -t),
  ]
  const armFront = [
    P(0, ay - t, t),
    P(lx, ay - t, t),
    P(lx, ay + t, t),
    P(0, ay + t, t),
  ]
  const armSide = [
    P(lx, ay - t, t),
    P(lx, ay - t, -t),
    P(lx, ay + t, -t),
    P(lx, ay + t, t),
  ]

  const footTop = [
    P(-t, ay + t, 0),
    P(t, ay + t, 0),
    P(t, ay + t, lz),
    P(-t, ay + t, lz),
  ]
  const footFront = [
    P(-t, ay - t, lz),
    P(t, ay - t, lz),
    P(t, ay + t, lz),
    P(-t, ay + t, lz),
  ]
  const footSide = [
    P(t, ay - t, 0),
    P(t, ay - t, lz),
    P(t, ay + t, lz),
    P(t, ay + t, 0),
  ]

  const poly = (pts: [number, number][], c: string, sw = 0.45) => (
    <polygon
      points={pts.map(([a, b]) => `${a.toFixed(2)},${b.toFixed(2)}`).join(' ')}
      fill={c}
      stroke={edge}
      strokeWidth={sw}
      strokeLinejoin="round"
    />
  )

  const [bx, by] = P(lx + 1.6, ay, 0)
  const [tx, ty] = P(0, ly + 2.2, 0)
  const [fx, fy] = P(0, ay, lz + 1.6)
  const tri = [
    [tx, ty - 2.4],
    [tx + 2.2, ty + 1.6],
    [tx - 2.2, ty + 1.6],
  ] as [number, number][]
  const sq = 2.1
  const square = [
    [fx - sq, fy - sq],
    [fx + sq, fy - sq],
    [fx + sq, fy + sq],
    [fx - sq, fy + sq],
  ] as [number, number][]

  // When foot is away (yaw ~180), draw dimmer back faces with lower tip opacity cues
  const footAway = ((yawDeg % 360) + 360) % 360 > 90 && ((yawDeg % 360) + 360) % 360 < 270
  const tipZOpacity = footAway ? 0.45 : 1

  return (
    <g
      className="primer-iso-l"
      data-iso-enantiomorph={flipped ? 'flipped' : 'same'}
      data-iso-yaw={Math.round(yawDeg)}
      data-iso-scale={objectScale}
    >
      {poly(stemRight, dim)}
      {poly(armSide, dim)}
      {poly(footSide, dim)}
      {poly(stemFront, mid)}
      {poly(armFront, mid)}
      {poly(footFront, footAway ? dim : lit)}
      {poly(stemTop, lit)}
      {poly(armTop, lit)}
      {poly(footTop, footAway ? mid : lit)}
      <circle cx={0} cy={0} r={1.7} fill={lit} stroke={edge} strokeWidth={0.5} />
      <circle cx={bx} cy={by} r={2.35} fill="#fca5a5" stroke={edge} strokeWidth={0.5} />
      <polygon
        points={tri.map(([a, b]) => `${a.toFixed(2)},${b.toFixed(2)}`).join(' ')}
        fill="#86efac"
        stroke={edge}
        strokeWidth={0.5}
        strokeLinejoin="round"
      />
      <polygon
        points={square.map(([a, b]) => `${a.toFixed(2)},${b.toFixed(2)}`).join(' ')}
        fill="#93c5fd"
        stroke={edge}
        strokeWidth={0.5}
        strokeLinejoin="round"
        opacity={tipZOpacity}
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
  orient = '',
  enantiomorph = false,
  yawDeg = 0,
  objectScale = 1,
}: {
  x: number
  y: number
  fill: string
  label?: string
  className?: string
  opacity?: number
  orient?: string
  enantiomorph?: boolean
  yawDeg?: number
  objectScale?: number
}) {
  const tf = orient ? `translate(${x},${y}) ${orient}` : `translate(${x},${y})`
  const flipped = enantiomorph || objectScale < 0
  return (
    <g
      transform={tf}
      className={className}
      opacity={opacity}
      data-enantiomorph={flipped ? 'flipped' : 'same'}
    >
      <MotifGlyph fill={fill} enantiomorph={enantiomorph} yawDeg={yawDeg} objectScale={objectScale} />
      {label ? (
        <text x={0} y={20} textAnchor="middle" fill={fill} fontSize={8} fontWeight={700}>
          {label}
        </text>
      ) : null}
    </g>
  )
}

function MotifLocal({
  fill,
  className,
  enantiomorph = false,
  yawDeg = 0,
  objectScale = 1,
}: {
  fill: string
  className?: string
  enantiomorph?: boolean
  yawDeg?: number
  objectScale?: number
}) {
  const flipped = enantiomorph || objectScale < 0
  return (
    <g className={className} data-enantiomorph={flipped ? 'flipped' : 'same'}>
      <MotifGlyph fill={fill} enantiomorph={enantiomorph} yawDeg={yawDeg} objectScale={objectScale} />
    </g>
  )
}


/**
 * CSS / ScrewGhost animation endpoints (t=0 and t=1).
 * Static B/I markers use these same transforms (or Motif yaw for 2₁)
 * so they match the restored geometric movers — not the other way around.
 */
export const PRIMER_ENDPOINT_TRANSFORMS = {
  mirror: {
    B: 'translate(60,36) scale(1,1) translate(-26,0)',
    I: 'translate(60,36) scale(-1,1) translate(-26,0)',
  },
  glide: {
    B: 'translate(32,36) scale(1,1) translate(0,-14)',
    I: 'translate(88,36) scale(1,-1) translate(0,-14)',
  },
  twofold: {
    B: 'rotate(0 60 36)',
    I: 'rotate(180 60 36)',
  },
} as const

/** MotifLocal under a CSS-equivalent transform; label stays unflipped in screen space. */
function StaticEndpoint({
  transform,
  fill,
  label,
  labelX,
  labelY,
  className,
  opacity = 0.35,
}: {
  transform: string
  fill: string
  label: string
  labelX: number
  labelY: number
  className?: string
  opacity?: number
}) {
  return (
    <g className={className} opacity={opacity} data-static-endpoint={label}>
      <g transform={transform}>
        <MotifLocal fill={fill} />
      </g>
      <text x={labelX} y={labelY} textAnchor="middle" fill={fill} fontSize={8} fontWeight={700}>
        {label}
      </text>
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

/**
 * 2₁ mover: true screw = 180° about the vertical axis + ½ translation along it.
 * Position orbits from left→right of the axis while yaw 0→180 (proper; hand kept).
 * Pauses when the card is off-screen or prefers-reduced-motion.
 */
function ScrewGhost({ color }: { color: string }) {
  const gRef = useRef<SVGGElement>(null)
  const [pose, setPose] = useState<{ x: number; y: number; yaw: number; opacity: number; active: boolean }>({ ...SCREW_PRIMER.B, opacity: 1, active: true })

  useEffect(() => {
    const el = gRef.current
    if (!el) return
    const card = el.closest('.primer-card')
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    let raf = 0
    let start = performance.now()
    const PERIOD = 3400

    const tick = (now: number) => {
      const inview = !card || card.classList.contains('is-inview')
      const still = reduce?.matches || !inview
      if (still) {
        setPose({ ...SCREW_PRIMER.B, opacity: 0, active: false })
        raf = requestAnimationFrame(tick)
        return
      }
      const u = ((now - start) % PERIOD) / PERIOD
      // Motion phase 0–0.72: screw; hold; fade; reset
      let p: number
      let opacity = 1
      if (u < 0.7) {
        p = u / 0.7
      } else if (u < 0.82) {
        p = 1
      } else if (u < 0.92) {
        p = 1
        opacity = 1 - (u - 0.82) / 0.1
      } else {
        p = 0
        opacity = (u - 0.92) / 0.08
      }
      // Ease in-out
      const e = screwEase(p)
      // Orbit in the horizontal plane about axis x=60: angle 0→π (left → right)
      // Start at screen-left of axis; after 180° about vertical, on the right.
      const { x, y, yaw } = screwPose(e)
      setPose({ x, y, yaw, opacity, active: true })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <g
      ref={gRef}
      className="primer-mover primer-screw-ghost"
      transform={`translate(${pose.x},${pose.y})`}
      opacity={pose.opacity}
      data-screw-active={pose.active ? '1' : '0'}
    >
      <MotifLocal fill={color} enantiomorph={false} yawDeg={pose.yaw} />
    </g>
  )
}


/**
 * Inversion mover: central homothety in object space, s: 1 → 0 → −1 about ⊙.
 * Junction offset scales with s; MotifGlyph objectScale={s}. At s=0 the L collapses
 * onto the center; at s=−1 it is the 3D-inverted enantiomorph (improper, det −1).
 * Distinct from 2-fold (proper 180° spin). Pauses off-screen / reduced-motion.
 */
function InvGhost({ color }: { color: string }) {
  const gRef = useRef<SVGGElement>(null)
  const { center, offset } = INVERSION_PRIMER
  const [pose, setPose] = useState<{ s: number; opacity: number; active: boolean }>({
    s: 1,
    opacity: 1,
    active: true,
  })

  useEffect(() => {
    const el = gRef.current
    if (!el) return
    const card = el.closest('.primer-card')
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    let raf = 0
    let start = performance.now()
    const PERIOD = 3200

    const tick = (now: number) => {
      const inview = !card || card.classList.contains('is-inview')
      const still = reduce?.matches || !inview
      if (still) {
        setPose({ s: 1, opacity: 0, active: false })
        raf = requestAnimationFrame(tick)
        return
      }
      const u = ((now - start) % PERIOD) / PERIOD
      let p: number
      let opacity = 1
      if (u < 0.7) {
        p = u / 0.7
      } else if (u < 0.82) {
        p = 1
      } else if (u < 0.92) {
        p = 1
        opacity = 1 - (u - 0.82) / 0.1
      } else {
        p = 0
        opacity = (u - 0.92) / 0.08
      }
      const e = screwEase(p)
      const s = inversionScale(e)
      setPose({ s, opacity, active: true })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const jx = center.x + pose.s * offset.x
  const jy = center.y + pose.s * offset.y

  return (
    <g
      ref={gRef}
      className="primer-mover primer-inv-ghost"
      transform={`translate(${jx},${jy})`}
      opacity={pose.opacity}
      data-inv-active={pose.active ? '1' : '0'}
      data-inv-scale={pose.s}
    >
      <MotifLocal fill={color} objectScale={pose.s} />
    </g>
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
            <text x={0} y={20} textAnchor="middle" fill={color} fontSize={8} fontWeight={700}>
              BASE
            </text>
          </g>
        </svg>
      )
    case 'inversion': {
      const { center } = INVERSION_PRIMER
      const jB = inversionJunction(1)
      const jI = inversionJunction(-1)
      const tipKeys = ['stem', 'arm', 'foot'] as const
      return (
        <svg viewBox="0 0 120 72" className="primer-svg" aria-hidden>
          <CellFrame />
          {/* Tip→⊙→image rays (static B↔I); every tip passes through the center */}
          {tipKeys.map((k) => {
            const tip = INVERSION_TIP_OBJECT[k]
            const b = inversionTipScreen(tip, 1)
            const i = inversionTipScreen(tip, -1)
            return (
              <line
                key={k}
                x1={b.x}
                y1={b.y}
                x2={i.x}
                y2={i.y}
                stroke={color}
                strokeWidth={1}
                strokeDasharray="3 2"
                opacity={0.4}
                className="primer-guide-path"
              />
            )
          })}
          {/* Static B/I = InvGhost ends (s=+1 / s=−1); animation authoritative */}
          <g className="primer-marker" opacity={0.35} transform={`translate(${jB.x},${jB.y})`}>
            <MotifLocal fill={color} objectScale={1} />
          </g>
          <text
            className="primer-marker"
            x={jB.x}
            y={jB.y + 20}
            textAnchor="middle"
            fill={color}
            fontSize={8}
            fontWeight={700}
            opacity={0.35}
          >
            B
          </text>
          <g
            className="primer-marker primer-static-end"
            opacity={0.35}
            transform={`translate(${jI.x},${jI.y})`}
          >
            <MotifLocal fill={color} objectScale={-1} />
          </g>
          <text
            className="primer-marker primer-static-end"
            x={jI.x}
            y={jI.y + 20}
            textAnchor="middle"
            fill={color}
            fontSize={8}
            fontWeight={700}
            opacity={0.35}
          >
            I
          </text>
          <circle cx={center.x} cy={center.y} r={4} fill="none" stroke={color} strokeWidth={1.6} />
          <circle cx={center.x} cy={center.y} r={1.4} fill={color} />
          <InvGhost color={color} />
        </svg>
      )
    }
    case 'twofold':
      return (
        <svg viewBox="0 0 120 72" className="primer-svg" aria-hidden>
          <CellFrame />
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
          {/* Static B/I = primer-twofold rotor at 0° / 180° about lens (60,36) */}
          <g className="primer-marker" opacity={0.35} transform={PRIMER_ENDPOINT_TRANSFORMS.twofold.B}>
            <Motif x={38} y={36} fill={color} enantiomorph={false} />
            <text x={38} y={56} textAnchor="middle" fill={color} fontSize={8} fontWeight={700}>
              B
            </text>
          </g>
          <g
            className="primer-marker primer-static-end"
            opacity={0.35}
            transform={PRIMER_ENDPOINT_TRANSFORMS.twofold.I}
          >
            <Motif x={38} y={36} fill={color} enantiomorph={false} />
          </g>
          <text
            className="primer-marker primer-static-end"
            x={82}
            y={56}
            textAnchor="middle"
            fill={color}
            fontSize={8}
            fontWeight={700}
            opacity={0.35}
          >
            I
          </text>
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
          <g className="primer-mover primer-twofold-rotor">
            <Motif x={38} y={36} fill={color} enantiomorph={false} />
          </g>
        </svg>
      )
    case 'screw':
      return (
        <svg viewBox="0 0 120 78" className="primer-svg primer-screw" aria-hidden>
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
          {/* ITA-ish 2₁ half-arrow ticks */}
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
          {/* B: yaw 0 (foot toward). I: yaw 180 (foot away) — same enantiomorph, proper 2₁ */}
          <Motif
            x={SCREW_PRIMER.B.x}
            y={SCREW_PRIMER.B.y}
            fill={color}
            label="B"
            opacity={0.35}
            enantiomorph={false}
            yawDeg={0}
            className="primer-marker"
          />
          <Motif
            x={SCREW_PRIMER.I.x}
            y={SCREW_PRIMER.I.y}
            fill={color}
            label="I"
            opacity={0.35}
            enantiomorph={false}
            yawDeg={180}
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
          <ScrewGhost color={color} />
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
          {/* Static B/I = CSS primer-mirror from/to (scaleX about x=60) */}
          <StaticEndpoint
            transform={PRIMER_ENDPOINT_TRANSFORMS.mirror.B}
            fill="#38bdf8"
            label="B"
            labelX={34}
            labelY={56}
            className="primer-marker"
          />
          <StaticEndpoint
            transform={PRIMER_ENDPOINT_TRANSFORMS.mirror.I}
            fill="#fde68a"
            label="I"
            labelX={86}
            labelY={56}
            className="primer-marker primer-static-end"
          />
          <text x={10} y={74} fill="#fde68a" fontSize={7} fontWeight={600} opacity={0.9}>
            improper — hand flips
          </text>
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
          {/* Static B/I = CSS primer-glide 0% / 100% (reflect then translate) */}
          <StaticEndpoint
            transform={PRIMER_ENDPOINT_TRANSFORMS.glide.B}
            fill={color}
            label="B"
            labelX={32}
            labelY={42}
            className="primer-marker"
          />
          <StaticEndpoint
            transform={PRIMER_ENDPOINT_TRANSFORMS.glide.I}
            fill={color}
            label="I"
            labelX={88}
            labelY={70}
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
