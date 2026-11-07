/**
 * Animated unit-cell logo for the home hero: the Lopsy motif (always Lopsy,
 * independent of the motif-style selector) undergoing 1̄ through the cell
 * centre (the 1̄ in P2₁/c).
 *
 * The cell, dashed B→⊙→I path, ⊙ and labels stay SVG (CSS 8 s timeline). The
 * motifs are the real 3D Lopsy mesh drawn on a 2D canvas overlay with the
 * SAME parallel projection as the SVG cube (isometric, view along (1,1,1)),
 * so B, ⊙ and I are spatially consistent: I = −B in 3D, hence I = 2·C − B on
 * screen. The ghost follows x ↦ (1 − 2s)·x about the centre — every vertex
 * shrinks through ⊙ and re-emerges inverted (not a 2D flip): B shows Lopsy's
 * face, I shows the inverted body from behind, as a real inversion must.
 * Reduced motion / off-screen: static B and I, no ghost. No WebGL.
 */
import { useEffect, useRef } from 'react'
import { easeInOut } from '../../data/opPath'
import { HERO_B, HERO_CENTER, HERO_I, heroScene } from '../motifs/homeScenes'
import { drawPose } from '../motifs/OpSceneCanvas'
import { fitCanvas, getLiteMesh } from '../motifs/softRender'

export { HERO_B, HERO_CENTER, HERO_I }

const PERIOD_MS = 8000
/** SVG `.hero-cell-orbit` scales the drawing ×1.14 about the cell centre. */
const ORBIT_SCALE = 1.14

/** Hero 8 s timeline (matches the CSS keyframes). Pure, for tests. */
export function heroFrame(u: number): { bAlpha: number; iAlpha: number; s: number; ghostAlpha: number } {
  const bAlpha = u < 0.08 ? u / 0.08 : u < 0.86 ? 1 : u < 0.96 ? 1 - (u - 0.86) / 0.1 : 0
  const iAlpha = u < 0.44 ? 0 : u < 0.5 ? (u - 0.44) / 0.06 : u < 0.86 ? 1 : u < 0.96 ? 1 - (u - 0.86) / 0.1 : 0
  let s = 0
  let ghostAlpha = 0
  if (u >= 0.1 && u < 0.12) {
    ghostAlpha = (u - 0.1) / 0.02
  } else if (u >= 0.12 && u < 0.48) {
    s = easeInOut((u - 0.12) / 0.36)
    ghostAlpha = 1
  } else if (u >= 0.48 && u < 0.52) {
    s = 1
    ghostAlpha = 1 - (u - 0.48) / 0.04
  }
  return { bAlpha, iAlpha, s, ghostAlpha }
}

function HeroLopsyCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const sc = heroScene()
    const mesh = getLiteMesh('lopsy')
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    let visible = true
    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver((es) => {
            visible = es.some((e) => e.isIntersecting)
          })
        : null
    io?.observe(canvas)
    let raf = 0
    const start = performance.now()
    let drewStill = false
    const draw = (now: number) => {
      const still = !!reduce?.matches
      if (!still && (!visible || document.hidden)) return
      if (still && drewStill) return
      const ctx = fitCanvas(canvas, sc.width, sc.height)
      if (!ctx) return
      ctx.clearRect(0, 0, sc.width, sc.height)
      ctx.translate(HERO_CENTER.x, HERO_CENTER.y)
      ctx.scale(ORBIT_SCALE, ORBIT_SCALE)
      ctx.translate(-HERO_CENTER.x, -HERO_CENTER.y)
      const f = still ? { bAlpha: 1, iAlpha: 1, s: 0, ghostAlpha: 0 } : heroFrame(((now - start) % PERIOD_MS) / PERIOD_MS)
      // Back-to-front: I sits behind the centre (−depth), B in front.
      if (f.iAlpha > 0.01) drawPose(ctx, sc, mesh, 1, '#fef08a', f.iAlpha, 0.5)
      if (f.ghostAlpha > 0.01) drawPose(ctx, sc, mesh, f.s, '#f472b6', 0.92 * f.ghostAlpha, 0.35)
      if (f.bAlpha > 0.01) drawPose(ctx, sc, mesh, 0, '#f8fafc', f.bAlpha, 0.25)
      drewStill = still
    }
    const tick = (now: number) => {
      draw(now)
      raf = requestAnimationFrame(tick)
    }
    if (typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(tick)
    const onChange = () => {
      drewStill = false
    }
    reduce?.addEventListener?.('change', onChange)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onChange) : null
    ro?.observe(canvas)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      io?.disconnect()
      ro?.disconnect()
      reduce?.removeEventListener?.('change', onChange)
    }
  }, [])
  return <canvas ref={ref} className="hero-lopsy" width={440} height={400} aria-hidden="true" data-hero-motif="lopsy" />
}

export default function HeroCellMotif() {
  const { x: cx, y: cy } = HERO_CENTER
  return (
    <div className="hero-motif" aria-hidden>
      <div className="hero-cell-stage">
        <svg viewBox="0 0 220 200" className="hero-cell">
          <defs>
            <linearGradient id="cellFace" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="cellFacePulse" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.22" />
            </linearGradient>
            <mask id="heroPathDraw" maskUnits="userSpaceOnUse" x="0" y="0" width="220" height="200">
              <line className="hero-inv-draw" x1={HERO_B.x} y1={HERO_B.y} x2={HERO_I.x} y2={HERO_I.y}
                stroke="#fff" strokeWidth="6" pathLength={100} strokeDasharray="100" />
            </mask>
          </defs>

          <g className="hero-cell-orbit">
            <path
              className="hero-face-outer"
              d="M40 70 L110 35 L180 70 L180 140 L110 175 L40 140 Z"
              fill="url(#cellFace)"
              stroke="#38bdf8"
              strokeWidth="1.6"
            />
            <path
              d="M110 35 L110 105 L40 140 L40 70 Z"
              fill="rgba(15,23,42,0.45)"
              stroke="#64748b"
              strokeWidth="1"
            />
            <path
              className="hero-face-right"
              d="M110 35 L180 70 L180 140 L110 105 Z"
              fill="rgba(56,189,248,0.08)"
              stroke="#64748b"
              strokeWidth="1"
            />

            <line
              className="hero-inv-path"
              x1={HERO_B.x} y1={HERO_B.y} x2={HERO_I.x} y2={HERO_I.y}
              stroke="#f472b6" strokeWidth="1.4" strokeDasharray="4 3" mask="url(#heroPathDraw)"
            />
            <g className="hero-inv-center">
              <circle className="hero-inv-pulse" cx={cx} cy={cy} r="4" fill="none" stroke="#f472b6" strokeWidth="1.2" />
              <circle cx={cx} cy={cy} r="1.3" fill="#f472b6" />
            </g>

            <g className="hero-atom-b">
              <text x={HERO_B.x - 26} y={HERO_B.y + 4} fill="#f8fafc" fontSize="9" fontWeight="700">B</text>
            </g>
            <g className="hero-atom-i">
              <text x={HERO_I.x + 19} y={HERO_I.y + 4} fill="#fef08a" fontSize="9" fontWeight="700">I</text>
            </g>

            <g className="hero-cell-label" fill="#38bdf8" fontSize="10" fontWeight="700">
              <text x="117" y="22" textAnchor="end">P2<tspan fontSize="7" dy="2">1</tspan><tspan dy="-2">/c · P</tspan></text>
              <text x="117.5" y="22">1</text>
              {/* overbar: 1̄ */}
              <line x1="117.8" x2="123.2" y1="13.2" y2="13.2" stroke="#38bdf8" strokeWidth="1" />
            </g>
          </g>
        </svg>
        <HeroLopsyCanvas />
      </div>
    </div>
  )
}
