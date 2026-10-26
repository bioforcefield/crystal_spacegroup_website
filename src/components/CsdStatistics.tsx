import { Link } from 'react-router-dom'
import {
  CSD_CHART_ROWS,
  CSD_SUMMARY,
  CSD_TABLE_ROWS,
  formatCount,
  formatPercent,
  type CsdFrequencyRow,
} from '../data/csdStatistics'
import { findGroup } from '../data/spaceGroupCatalog'

/** Live demos currently on the site — highlight in chart + table. */
const LIVE_NUMBERS = new Set([2, 14, 15, 61])

function barWidthPercent(row: CsdFrequencyRow, maxPercent: number): number {
  // Square-root scale keeps ranks 7–10 readable under P21/c (~34%).
  const scaled = Math.sqrt(Math.max(row.percent, 0)) / Math.sqrt(Math.max(maxPercent, 1e-6))
  return Math.max(4, scaled * 100)
}

function RankBar({ row, maxPercent }: { row: CsdFrequencyRow; maxPercent: number }) {
  const width = barWidthPercent(row, maxPercent)
  const entry = findGroup(row.number)
  const ready = entry?.status === 'ready'
  const isLive = LIVE_NUMBERS.has(row.number)

  const barInner = (
    <>
      <div className="csd-bar-meta">
        <span className="csd-bar-rank">#{row.rank}</span>
        <span className="csd-bar-sg">
          <span className="csd-bar-num">{row.number}</span>
          <span className="csd-bar-hm">{row.hm}</span>
        </span>
      </div>
      <div className="csd-bar-track" aria-hidden>
        <div
          className={`csd-bar-fill${isLive ? ' highlight' : ''}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="csd-bar-side">
        <span className="csd-bar-pct">{formatPercent(row)}</span>
        <span className="csd-bar-count">{formatCount(row.count)}</span>
      </div>
    </>
  )

  if (ready) {
    return (
      <Link
        to={`/sg/${row.number}`}
        className={`csd-bar-row ready${isLive ? ' highlight' : ''}`}
        title={`Open interactive demo for ${row.number} · ${row.hm}`}
      >
        {barInner}
      </Link>
    )
  }

  return (
    <div className={`csd-bar-row${isLive ? ' highlight' : ''}`}>{barInner}</div>
  )
}

export default function CsdStatistics() {
  const maxPercent = CSD_CHART_ROWS[0]?.percent ?? 1
  const s = CSD_SUMMARY

  return (
    <div className="csd-stats">
      <div className="csd-headline-grid">
        <article className="csd-stat-card primary">
          <span className="csd-stat-label">CSD structures counted</span>
          <strong className="csd-stat-value">{formatCount(s.totalWithSpaceGroup)}</strong>
          <span className="csd-stat-note">fully defined space group · {s.asOf}</span>
        </article>
        <article className="csd-stat-card">
          <span className="csd-stat-label">Centrosymmetric</span>
          <strong className="csd-stat-value">{s.centrosymmetric.percent}%</strong>
          <span className="csd-stat-note">
            {formatCount(s.centrosymmetric.count)} structures
          </span>
        </article>
        <article className="csd-stat-card">
          <span className="csd-stat-label">Non-centrosymmetric</span>
          <strong className="csd-stat-value">{s.nonCentrosymmetric.percent}%</strong>
          <span className="csd-stat-note">
            {formatCount(s.nonCentrosymmetric.count)} structures
          </span>
        </article>
        <article className="csd-stat-card">
          <span className="csd-stat-label">Sohncke</span>
          <strong className="csd-stat-value">{s.sohncke.percent}%</strong>
          <span className="csd-stat-note">
            {formatCount(s.sohncke.count)} · chiral crystal classes
          </span>
        </article>
      </div>

      <div className="csd-panels">
        <div className="csd-panel">
          <div className="csd-panel-head">
            <h3>Most common space groups</h3>
            <p>
              A handful of groups dominate organic and organometallic crystal
              structures. Live demos on this site:{' '}
              <strong>P21/c</strong> (rank 1), <strong>P-1</strong> (rank 2),{' '}
              <strong>C2/c</strong> (rank 3), and <strong>Pbca</strong> (rank 6).
            </p>
            <p className="csd-scale-note">
              Bar lengths use a <strong>square-root scale</strong> so rarer groups
              stay readable — P2₁/c alone is about 34% of the CSD. Exact % and
              counts are shown at right; the table keeps a linear top-20 view.
            </p>
          </div>
          <div
            className="csd-bar-chart"
            role="list"
            aria-label="Top space groups by CSD frequency (square-root scaled bars)"
          >
            {CSD_CHART_ROWS.map((row) => (
              <RankBar key={row.rank} row={row} maxPercent={maxPercent} />
            ))}
          </div>
        </div>

        <div className="csd-panel">
          <div className="csd-panel-head">
            <h3>Top 20 by frequency</h3>
            <p>Counts from the official CCDC frequency-ordering table.</p>
          </div>
          <div className="csd-table-wrap">
            <table className="csd-table">
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">No.</th>
                  <th scope="col">Symbol</th>
                  <th scope="col" className="num">
                    Count
                  </th>
                  <th scope="col" className="num">
                    %
                  </th>
                </tr>
              </thead>
              <tbody>
                {CSD_TABLE_ROWS.map((row) => {
                  const entry = findGroup(row.number)
                  const ready = entry?.status === 'ready'
                  const isLive = LIVE_NUMBERS.has(row.number)
                  return (
                    <tr key={row.rank} className={isLive ? 'highlight' : undefined}>
                      <td>{row.rank}</td>
                      <td>{row.number}</td>
                      <td>
                        {ready ? (
                          <Link to={`/sg/${row.number}`} className="csd-sg-link">
                            {row.hm}
                            <span className="csd-live-tag">live</span>
                          </Link>
                        ) : (
                          <span className="csd-hm">{row.hm}</span>
                        )}
                      </td>
                      <td className="num">{formatCount(row.count)}</td>
                      <td className="num">{formatPercent(row)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <aside className="csd-links">
        <h3>Further reading</h3>
        <p>
          Official CCDC resources (open in a new tab). This teaching site
          summarizes the top ranks only — the PDF lists all 230 groups.
        </p>
        <ul>
          <li>
            <a href={s.pdfUrl} target="_blank" rel="noopener noreferrer">
              CSD Space Group Frequency Ordering 2026 (PDF)
            </a>
            <span className="csd-link-note">full frequency ordering for all 230</span>
          </li>
          <li>
            <a
              href={s.interactiveChartsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              CSD Interactive Charts
            </a>
            <span className="csd-link-note">explore trends in the live database</span>
          </li>
          <li>
            <a
              href={s.statisticsLandingUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              CSD Statistics
            </a>
            <span className="csd-link-note">headline figures &amp; annual reports</span>
          </li>
        </ul>
      </aside>

      <p className="csd-attribution">
        Data from the Cambridge Crystallographic Data Centre (CCDC) Cambridge
        Structural Database statistics ({s.asOf}). Counts are for structures with
        a fully defined space group and may differ from live totals on the
        interactive charts page. This site is independent teaching software — not
        an official CCDC or IUCr product.
      </p>
    </div>
  )
}
