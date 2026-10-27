/** Decorative animated unit-cell motif for the home hero. CSS-only; no R3F. */
export default function HeroCellMotif() {
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
              className="hero-bond-dash"
              x1="110"
              y1="105"
              x2="110"
              y2="175"
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="3 3"
            />

            <g className="hero-atom-pair">
              <circle className="hero-atom-b" cx="92" cy="98" r="5" fill="#fef08a" />
              <circle className="hero-atom-i" cx="128" cy="118" r="5" fill="#a78bfa" />
              <path
                className="hero-screw-path"
                d="M92 98 Q110 88 128 118"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="1.4"
                strokeDasharray="4 3"
              />
              <text className="hero-atom-label-b" x="86" y="88" fill="#fef08a" fontSize="9" fontWeight="700">
                B
              </text>
              <text className="hero-atom-label-i" x="132" y="132" fill="#a78bfa" fontSize="9" fontWeight="700">
                I
              </text>
            </g>

            <text x="118" y="52" fill="#38bdf8" fontSize="10" fontWeight="700">
              P21/c · P-1
            </text>
          </g>
        </svg>
      </div>
    </div>
  )
}
