/** Lightweight SVG demos of common space-group operations (index primer). */

import { useEffect, useRef, useState, type CSSProperties } from 'react'
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
    body: 'Point reflection through a center (⊙). Improper — the isometric L becomes its enantiomorph.',
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

/** Classic isometric screen coords from object (x right, y up, z toward viewer). */
function iso(x: number, y: number, z: number): [number, number] {
  const sx = (x - z) * 0.8660254
  const sy = (x + z) * 0.5 - y
  return [sx, sy]
}

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
 * Rotate object coords about +Y (screw / vertical axis), then optional enantiomorph
 * (mirror in YZ: x → −x). Order: yaw first (proper), then enantiomorph (improper).
 */
function objectMap(
  x: number,
  y: number,
  z: number,
  yawDeg: number,
  enantiomorph: boolean,
): [number, number, number] {
  const rad = (yawDeg * Math.PI) / 180
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  // yaw about +Y: (x,z) → (x c + z s, −x s + z c)
  let X = x * c + z * s
  const Y = y
  let Z = -x * s + z * c
  if (enantiomorph) X = -X
  return [X, Y, Z]
}

/**
 * True isometric chiral L (teaching triad): stem +Y, arm +X, foot +Z toward viewer.
 * Face-shaded beams + distinct tips (ball / triangle / square).
 * - enantiomorph: improper mirror (x → −x) after yaw
 * - yawDeg: proper rotation about +Y (0 = foot toward viewer; 180 = foot away)
 */
function MotifGlyph({
  fill,
  enantiomorph = false,
  yawDeg = 0,
}: {
  fill: string
  enantiomorph?: boolean
  /** Proper rotation about the stem / screw axis (degrees). */
  yawDeg?: number
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
    return iso(X, Y, Z)
  }

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
      data-iso-enantiomorph={enantiomorph ? 'flipped' : 'same'}
      data-iso-yaw={Math.round(yawDeg)}
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

/** Screen-space pose shared by static B/I markers and the animated ghost. */
export type PrimerPose = {
  x: number
  y: number
  yawDeg: number
  /** In-page spin (degrees); used by 2-fold (axis ⊥ page). */
  spinDeg: number
  enantiomorph: boolean
}

/**
 * Documented B → I endpoints. Static markers and PoseGhost both read these so
 * animation t=0 / t=1 always match the faded B / I images.
 */
export const PRIMER_POSES: Record<
  Exclude<DemoId, 'identity'>,
  { B: PrimerPose; I: PrimerPose }
> = {
  inversion: {
    B: { x: 34, y: 26, yawDeg: 0, spinDeg: 0, enantiomorph: false },
    I: { x: 86, y: 46, yawDeg: 0, spinDeg: 0, enantiomorph: true },
  },
  twofold: {
    B: { x: 38, y: 36, yawDeg: 0, spinDeg: 0, enantiomorph: false },
    I: { x: 82, y: 36, yawDeg: 0, spinDeg: 180, enantiomorph: false },
  },
  screw: {
    B: { x: 36, y: 22, yawDeg: 0, spinDeg: 0, enantiomorph: false },
    I: { x: 84, y: 50, yawDeg: 180, spinDeg: 0, enantiomorph: false },
  },
  mirror: {
    B: { x: 34, y: 36, yawDeg: 0, spinDeg: 0, enantiomorph: false },
    I: { x: 86, y: 36, yawDeg: 0, spinDeg: 0, enantiomorph: true },
  },
  glide: {
    B: { x: 32, y: 22, yawDeg: 0, spinDeg: 0, enantiomorph: false },
    I: { x: 88, y: 50, yawDeg: 0, spinDeg: 0, enantiomorph: true },
  },
}

function Motif({
  x,
  y,
  fill,
  label,
  className,
  opacity = 1,
  enantiomorph = false,
  yawDeg = 0,
  spinDeg = 0,
}: {
  x: number
  y: number
  fill: string
  label?: string
  className?: string
  opacity?: number
  enantiomorph?: boolean
  yawDeg?: number
  spinDeg?: number
}) {
  const orient = spinDeg ? `rotate(${spinDeg})` : ''
  const tf = orient ? `translate(${x},${y}) ${orient}` : `translate(${x},${y})`
  return (
    <g
      transform={tf}
      className={className}
      opacity={opacity}
      data-enantiomorph={enantiomorph ? 'flipped' : 'same'}
      data-spin={Math.round(spinDeg)}
      data-yaw={Math.round(yawDeg)}
    >
      <MotifGlyph fill={fill} enantiomorph={enantiomorph} yawDeg={yawDeg} />
      {label ? (
        <text x={0} y={20} textAnchor="middle" fill={fill} fontSize={8} fontWeight={700}>
          {label}
        </text>
      ) : null}
    </g>
  )
}

function MotifFromPose({
  pose,
  fill,
  label,
  className,
  opacity = 1,
}: {
  pose: PrimerPose
  fill: string
  label?: string
  className?: string
  opacity?: number
}) {
  return (
    <Motif
      x={pose.x}
      y={pose.y}
      fill={fill}
      label={label}
      className={className}
      opacity={opacity}
      enantiomorph={pose.enantiomorph}
      yawDeg={pose.yawDeg}
      spinDeg={pose.spinDeg}
    />
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

function easeInOut(p: number): number {
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
}

/** Motion phase 0–1 plus opacity for hold / fade / reset loops. */
function loopPhase(u: number): { e: number; opacity: number } {
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
  return { e: easeInOut(p), opacity }
}

type Interpolator = (e: number) => PrimerPose

/** Inversion: lerp through center; flip enantiomorph past the midpoint. */
function lerpInversion(e: number): PrimerPose {
  const { B, I } = PRIMER_POSES.inversion
  return {
    x: B.x + (I.x - B.x) * e,
    y: B.y + (I.y - B.y) * e,
    yawDeg: 0,
    spinDeg: 0,
    enantiomorph: e >= 0.5,
  }
}

/** 2-fold: orbit about (60,36) with in-page spin 0→180; hand kept. */
function lerpTwofold(e: number): PrimerPose {
  const { B, I } = PRIMER_POSES.twofold
  const cx = 60
  const cy = 36
  const ang = Math.PI * e
  const dx = B.x - cx
  const dy = B.y - cy
  const x = cx + dx * Math.cos(ang) - dy * Math.sin(ang)
  const y = cy + dx * Math.sin(ang) + dy * Math.cos(ang)
  return {
    x,
    y,
    yawDeg: 0,
    spinDeg: I.spinDeg * e,
    enantiomorph: false,
  }
}

/** 2₁: orbit about vertical axis x=60 + yaw 0→180 + +½ along axis. */
function lerpScrew(e: number): PrimerPose {
  const { B, I } = PRIMER_POSES.screw
  const ang = Math.PI * e
  const radius = B.x < 60 ? 60 - B.x : B.x - 60
  const x = 60 - radius * Math.cos(ang)
  const y = B.y + (I.y - B.y) * e
  return {
    x,
    y,
    yawDeg: I.yawDeg * e,
    spinDeg: 0,
    enantiomorph: false,
  }
}

/** Mirror: cross vertical plane; flip enantiomorph at the plane. */
function lerpMirror(e: number): PrimerPose {
  const { B, I } = PRIMER_POSES.mirror
  return {
    x: B.x + (I.x - B.x) * e,
    y: B.y,
    yawDeg: 0,
    spinDeg: 0,
    enantiomorph: e >= 0.5,
  }
}

/**
 * Glide: reflect across y=36 (flip hand), then translate along the plane.
 * End pose matches static I (enantiomorph, no CSS scale).
 */
function lerpGlide(e: number): PrimerPose {
  const { B, I } = PRIMER_POSES.glide
  if (e < 0.4) {
    const t = e / 0.4
    const yMid = 36
    // Reflect B across y=36 → (B.x, 2*36 - B.y) = (32, 50)
    const yRef = 2 * yMid - B.y
    return {
      x: B.x,
      y: B.y + (yRef - B.y) * t,
      yawDeg: 0,
      spinDeg: 0,
      enantiomorph: t >= 0.5,
    }
  }
  const t = (e - 0.4) / 0.6
  const yRef = 2 * 36 - B.y
  return {
    x: B.x + (I.x - B.x) * t,
    y: yRef,
    yawDeg: 0,
    spinDeg: 0,
    enantiomorph: true,
  }
}

const INTERPOLATORS: Record<Exclude<DemoId, 'identity'>, Interpolator> = {
  inversion: lerpInversion,
  twofold: lerpTwofold,
  screw: lerpScrew,
  mirror: lerpMirror,
  glide: lerpGlide,
}

/**
 * Ghost driven by the same Motif / PrimerPose model as static B and I.
 * t=0 → B, t=1 → I (position, yaw, spin, enantiomorph). No CSS scale/rotate
 * approximations that fight the isometric end pose.
 */
function PoseGhost({
  demo,
  fill,
  periodMs = 3000,
}: {
  demo: Exclude<DemoId, 'identity'>
  fill: string
  periodMs?: number
}) {
  const gRef = useRef<SVGGElement>(null)
  const interp = INTERPOLATORS[demo]
  const start = PRIMER_POSES[demo].B
  const [pose, setPose] = useState<PrimerPose>(start)
  const [opacity, setOpacity] = useState(1)
  const [active, setActive] = useState(true)

  useEffect(() => {
    const el = gRef.current
    if (!el) return
    const card = el.closest('.primer-card')
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    let raf = 0
    let t0 = performance.now()

    const tick = (now: number) => {
      const inview = !card || card.classList.contains('is-inview')
      const still = reduce?.matches || !inview
      if (still) {
        setPose(start)
        setOpacity(0)
        setActive(false)
        raf = requestAnimationFrame(tick)
        return
      }
      const u = ((now - t0) % periodMs) / periodMs
      const { e, opacity: op } = loopPhase(u)
      setPose(interp(e))
      setOpacity(op)
      setActive(true)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [interp, periodMs, start])

  return (
    <g
      ref={gRef}
      className={`primer-mover primer-pose-ghost primer-${demo}-ghost`}
      opacity={opacity}
      data-pose-active={active ? '1' : '0'}
      data-pose-demo={demo}
      data-enantiomorph={pose.enantiomorph ? 'flipped' : 'same'}
      data-yaw={Math.round(pose.yawDeg)}
      data-spin={Math.round(pose.spinDeg)}
    >
      <MotifFromPose pose={pose} fill={fill} />
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
            <MotifGlyph fill={color} />
            <text x={0} y={20} textAnchor="middle" fill={color} fontSize={8} fontWeight={700}>
              BASE
            </text>
          </g>
        </svg>
      )
    case 'inversion': {
      const { B, I } = PRIMER_POSES.inversion
      return (
        <svg viewBox="0 0 120 72" className="primer-svg" aria-hidden>
          <CellFrame />
          <MotifFromPose pose={B} fill={color} label="B" opacity={0.35} className="primer-marker" />
          <MotifFromPose
            pose={I}
            fill={color}
            label="I"
            opacity={0.35}
            className="primer-marker primer-static-end"
          />
          <circle cx={60} cy={36} r={4} fill="none" stroke={color} strokeWidth={1.6} />
          <circle cx={60} cy={36} r={1.4} fill={color} />
          <line
            x1={B.x}
            y1={B.y}
            x2={I.x}
            y2={I.y}
            stroke={color}
            strokeWidth={1}
            strokeDasharray="3 2"
            opacity={0.45}
            className="primer-guide-path"
          />
          <PoseGhost demo="inversion" fill={color} periodMs={2800} />
        </svg>
      )
    }
    case 'twofold': {
      const { B, I } = PRIMER_POSES.twofold
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
          <MotifFromPose pose={B} fill={color} label="B" opacity={0.35} className="primer-marker" />
          <MotifFromPose
            pose={I}
            fill={color}
            label="I"
            opacity={0.35}
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
          <PoseGhost demo="twofold" fill={color} periodMs={3000} />
        </svg>
      )
    }
    case 'screw': {
      const { B, I } = PRIMER_POSES.screw
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
          <MotifFromPose pose={B} fill={color} label="B" opacity={0.35} className="primer-marker" />
          <MotifFromPose
            pose={I}
            fill={color}
            label="I"
            opacity={0.35}
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
          <PoseGhost demo="screw" fill={color} periodMs={3400} />
        </svg>
      )
    }
    case 'mirror': {
      const { B, I } = PRIMER_POSES.mirror
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
          <MotifFromPose pose={B} fill="#38bdf8" label="B" opacity={0.35} className="primer-marker" />
          <MotifFromPose
            pose={I}
            fill="#fde68a"
            label="I"
            opacity={0.35}
            className="primer-marker primer-static-end"
          />
          <text x={10} y={74} fill="#fde68a" fontSize={7} fontWeight={600} opacity={0.9}>
            improper — hand flips
          </text>
          <PoseGhost demo="mirror" fill="#38bdf8" periodMs={2500} />
        </svg>
      )
    }
    case 'glide': {
      const { B, I } = PRIMER_POSES.glide
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
          <MotifFromPose pose={B} fill={color} label="B" opacity={0.35} className="primer-marker" />
          <MotifFromPose
            pose={I}
            fill={color}
            label="I"
            opacity={0.35}
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
          <PoseGhost demo="glide" fill={color} periodMs={3000} />
        </svg>
      )
    }
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
