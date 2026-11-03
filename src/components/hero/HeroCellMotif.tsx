/**
 * Decorative animated unit-cell motif for the home hero. CSS-only; no R3F.
 *
 * One 8 s timeline (inversion through the cell centre, P1̄ / the 1̄ in P2₁/c):
 * B appears → dashed path draws B → ⊙ → I with a centre pulse → I lands as the
 * opposite-handed copy → hold → fade → repeat. In the isometric projection the
 * cell's body centre projects to (110,105); I = 2·C − B exactly and I's chiral
 * tips are B's tips point-inverted (scale(-1)), so the pair is centrosymmetric.
 * Colours follow the site legend: BASE white, IMAGE yellow, inversion pink.
 * Reduced motion: no animation, base styles show the final state (B, path, ⊙, I).
 */
export const HERO_CENTER = { x: 110, y: 105 } as const
export const HERO_B = { x: 86, y: 91 } as const
export const HERO_I = { x: 2 * HERO_CENTER.x - HERO_B.x, y: 2 * HERO_CENTER.y - HERO_B.y } as const

/** Chiral motif at the origin: ball + triangle tip + square tip (as in the site's demos). */
function Motif({ fill }: { fill: string }) {
  return (
    <>
      <circle r="5" fill={fill} />
      <path d="M-6 -4 L-12 -7 L-9 -1 Z" fill={fill} />
      <rect x="2" y="-11" width="4" height="4" fill={fill} />
    </>
  )
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
              <g transform={`translate(${HERO_B.x} ${HERO_B.y})`}><Motif fill="#f8fafc" /></g>
              <text x={HERO_B.x - 14} y={HERO_B.y + 16} fill="#f8fafc" fontSize="9" fontWeight="700">B</text>
            </g>
            <g className="hero-atom-i">
              <g className="hero-atom-i-pop" transform={`translate(${HERO_I.x} ${HERO_I.y}) scale(-1)`}><Motif fill="#fef08a" /></g>
              <text x={HERO_I.x + 10} y={HERO_I.y - 8} fill="#fef08a" fontSize="9" fontWeight="700">I</text>
            </g>

            <g className="hero-cell-label" fill="#38bdf8" fontSize="10" fontWeight="700">
              <text x="117" y="22" textAnchor="end">P2<tspan fontSize="7" dy="2">1</tspan><tspan dy="-2">/c · P</tspan></text>
              <text x="117.5" y="22">1</text>
              {/* overbar: 1̄ */}
              <line x1="117.8" x2="123.2" y1="13.2" y2="13.2" stroke="#38bdf8" strokeWidth="1" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  )
}
