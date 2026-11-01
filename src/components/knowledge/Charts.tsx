/** Minimal SVG charts (no deps). */
export type Series = { label: string; color: string; pts: [number, number][]; dash?: boolean }

const PAL = ['#38bdf8', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#c084fc', '#2dd4bf']
export const palette = (i: number) => PAL[i % PAL.length]

export function LineChart({ series, xLabel, yLabel, xr, yr, w = 560, h = 300, ariaLabel }: {
  series: Series[]; xLabel: string; yLabel: string; xr: [number, number]; yr: [number, number]; w?: number; h?: number; ariaLabel: string
}) {
  const m = { l: 52, r: 12, t: 10, b: 40 }
  const X = (x: number) => m.l + ((x - xr[0]) / (xr[1] - xr[0])) * (w - m.l - m.r)
  const Y = (y: number) => h - m.b - ((Math.min(Math.max(y, yr[0]), yr[1]) - yr[0]) / (yr[1] - yr[0])) * (h - m.t - m.b)
  const ticks = (r: [number, number], n = 5) => Array.from({ length: n + 1 }, (_, i) => r[0] + ((r[1] - r[0]) * i) / n)
  const fmt = (v: number) => (Math.abs(v) >= 100 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(1))
  return (
    <div className="know-chart">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={ariaLabel} className="know-svg">
        {ticks(xr).map((t) => (
          <g key={`x${t}`}>
            <line x1={X(t)} x2={X(t)} y1={m.t} y2={h - m.b} stroke="#1e293b" />
            <text x={X(t)} y={h - m.b + 14} textAnchor="middle" fontSize="11" fill="#94a3b8">{fmt(t)}</text>
          </g>
        ))}
        {ticks(yr).map((t) => (
          <g key={`y${t}`}>
            <line x1={m.l} x2={w - m.r} y1={Y(t)} y2={Y(t)} stroke="#1e293b" />
            <text x={m.l - 6} y={Y(t) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">{fmt(t)}</text>
          </g>
        ))}
        <rect x={m.l} y={m.t} width={w - m.l - m.r} height={h - m.t - m.b} fill="none" stroke="#475569" />
        {series.map((s) => (
          <polyline key={s.label} data-series={s.label} fill="none" stroke={s.color} strokeWidth="2"
            strokeDasharray={s.dash ? '5 4' : undefined}
            points={s.pts.filter(([, y]) => Number.isFinite(y) && y >= yr[0]).map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ')} />
        ))}
        <text x={(m.l + w - m.r) / 2} y={h - 6} textAnchor="middle" fontSize="12" fill="#cbd5e1">{xLabel}</text>
        <text x={14} y={(m.t + h - m.b) / 2} textAnchor="middle" fontSize="12" fill="#cbd5e1" transform={`rotate(-90 14 ${(m.t + h - m.b) / 2})`}>{yLabel}</text>
      </svg>
      <ul className="know-legend">
        {series.map((s) => (
          <li key={s.label}><span style={{ background: s.color }} />{s.label}</li>
        ))}
      </ul>
    </div>
  )
}

/** Stacked horizontal bars, one bar per group, values sum ≈ 1. */
export function StackedBars({ groups, keys, ariaLabel }: { groups: { label: string; values: number[] }[]; keys: string[]; ariaLabel: string }) {
  const w = 560, rowH = 34, l = 120, h = groups.length * rowH + 30
  return (
    <div className="know-chart">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={ariaLabel} className="know-svg">
        {groups.map((g, gi) => {
          let x = l
          return (
            <g key={g.label} data-series={g.label}>
              <text x={l - 8} y={gi * rowH + 22} textAnchor="end" fontSize="12" fill="#cbd5e1">{g.label}</text>
              {g.values.map((v, i) => {
                const ww = v * (w - l - 12)
                const r = <rect key={keys[i]} x={x} y={gi * rowH + 6} width={ww} height={rowH - 10} fill={palette(i)}><title>{`${keys[i]}: ${(v * 100).toFixed(1)} %`}</title></rect>
                x += ww
                return r
              })}
            </g>
          )
        })}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <text key={t} x={l + t * (w - l - 12)} y={h - 6} textAnchor="middle" fontSize="11" fill="#94a3b8">{t * 100}%</text>
        ))}
      </svg>
      <ul className="know-legend">
        {keys.map((k, i) => (<li key={k}><span style={{ background: palette(i) }} />{k}</li>))}
      </ul>
    </div>
  )
}
