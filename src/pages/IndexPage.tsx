import { useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import SymmetryPrimer from '../components/SymmetryPrimer'
import CsdStatistics from '../components/CsdStatistics'
import {
  CRYSTAL_SYSTEMS,
  READY_COUNT,
  TOTAL_GROUPS,
  filterGroups,
  systemInfo,
  type CrystalSystemId,
  type SpaceGroupEntry,
} from '../data/spaceGroupCatalog'
import { CLASS_LEGEND_ORDER, SYMMETRY_CLASSES } from '../data/pbca'

type SystemFilter = CrystalSystemId | 'all'

const NAV = [
  { id: 'explore', label: 'Explore' },
  { id: 'index', label: 'Index' },
  { id: 'stats', label: 'Statistics' },
  { id: 'primer', label: 'Symmetry' },
  { id: 'guide', label: 'How to use' },
] as const

function GroupChip({ g }: { g: SpaceGroupEntry }) {
  const sys = systemInfo(g.system)
  if (g.status === 'ready') {
    return (
      <Link
        to={`/sg/${g.number}`}
        className="sg-chip ready"
        style={{ '--chip': sys.accent } as CSSProperties}
        title={`${g.number} · ${g.hm} — open interactive demo`}
      >
        <span className="sg-num">{g.number}</span>
        <span className="sg-hm">{g.hm}</span>
        <span className="sg-badge">live</span>
      </Link>
    )
  }
  return (
    <span
      className="sg-chip planned"
      style={{ '--chip': sys.accent } as CSSProperties}
      title={`${g.number} · ${g.hm} — coming soon`}
    >
      <span className="sg-num">{g.number}</span>
      <span className="sg-hm">{g.hm}</span>
    </span>
  )
}

export default function IndexPage() {
  const [system, setSystem] = useState<SystemFilter>('all')
  const [query, setQuery] = useState('')

  const filtered = useMemo(
    () => filterGroups(query, system),
    [query, system],
  )

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="index-page">
      <header className="index-hero">
        <div className="hero-glow" aria-hidden />
        <div className="hero-grid" aria-hidden />
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">Teaching crystallography</p>
            <h1>Crystal Space Groups</h1>
            <p className="hero-lead">
              Interactive diagrams of the 230 crystallographic space groups —
              operators, screws, glides, and general positions — in the spirit
              of ITA / UCL-style teaching figures.
            </p>
            <div className="hero-stats">
              <div>
                <strong>{TOTAL_GROUPS}</strong>
                <span>space groups catalogued</span>
              </div>
              <div>
                <strong>{READY_COUNT}</strong>
                <span>interactive demo{READY_COUNT === 1 ? '' : 's'}</span>
              </div>
              <div>
                <strong>7</strong>
                <span>crystal systems</span>
              </div>
            </div>
            <div className="hero-cta">
              <Link to="/sg/61" className="btn btn-primary">
                Open Pbca (61)
              </Link>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => scrollTo('guide')}
              >
                How to use
              </button>
            </div>
          </div>
          <div className="hero-motif" aria-hidden>
            <svg viewBox="0 0 220 200" className="hero-cell">
              <defs>
                <linearGradient id="cellFace" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.15" />
                </linearGradient>
              </defs>
              {/* isometric-ish unit cell */}
              <path
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
                d="M110 35 L180 70 L180 140 L110 105 Z"
                fill="rgba(56,189,248,0.08)"
                stroke="#64748b"
                strokeWidth="1"
              />
              <line
                x1="110"
                y1="105"
                x2="110"
                y2="175"
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle cx="92" cy="98" r="5" fill="#fef08a" />
              <circle cx="128" cy="118" r="5" fill="#a78bfa" />
              <path
                d="M92 98 Q110 88 128 118"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="1.4"
                strokeDasharray="4 3"
              />
              <text x="86" y="88" fill="#fef08a" fontSize="9" fontWeight="700">
                B
              </text>
              <text x="132" y="132" fill="#a78bfa" fontSize="9" fontWeight="700">
                I
              </text>
              <text x="150" y="58" fill="#38bdf8" fontSize="11" fontWeight="700">
                Pbca
              </text>
            </svg>
          </div>
        </div>
      </header>

      <nav className="index-subnav" aria-label="On this page">
        {NAV.map((n) => (
          <button key={n.id} type="button" onClick={() => scrollTo(n.id)}>
            {n.label}
          </button>
        ))}
      </nav>

      <main className="index-main">
        <section id="explore" className="index-section">
          <div className="section-head">
            <h2>Explore by crystal system</h2>
            <p>
              Pick a system to filter the index. Only{' '}
              <Link to="/sg/61">Pbca (61)</Link> is interactive so far — other
              groups show as coming soon.
            </p>
          </div>
          <div className="system-grid">
            <button
              type="button"
              className={
                system === 'all' ? 'system-card active' : 'system-card'
              }
              onClick={() => {
                setSystem('all')
                scrollTo('index')
              }}
            >
              <span className="system-name">All systems</span>
              <span className="system-range">1 – 230</span>
              <span className="system-blurb">
                Full ITA numbering across all seven crystal systems.
              </span>
            </button>
            {CRYSTAL_SYSTEMS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={
                  system === s.id ? 'system-card active' : 'system-card'
                }
                style={{ '--sys': s.accent } as CSSProperties}
                onClick={() => {
                  setSystem(s.id)
                  scrollTo('index')
                }}
              >
                <span className="system-name">{s.name}</span>
                <span className="system-range">
                  {s.range[0]} – {s.range[1]}
                </span>
                <span className="system-blurb">{s.blurb}</span>
              </button>
            ))}
          </div>
        </section>

        <section id="index" className="index-section">
          <div className="section-head">
            <h2>Space-group index</h2>
            <p>
              Search by ITA number or Hermann–Mauguin symbol. Ready groups are
              links; planned ones are muted.
            </p>
          </div>
          <div className="index-toolbar">
            <input
              type="search"
              className="sg-search"
              placeholder="Filter by number or symbol… e.g. 61 or Pbca"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Filter space groups"
            />
            <span className="index-count">
              {filtered.length} of {TOTAL_GROUPS}
              {system !== 'all' ? ` · ${systemInfo(system).name}` : ''}
            </span>
          </div>
          <div className="sg-chip-grid">
            {filtered.map((g) => (
              <GroupChip key={g.number} g={g} />
            ))}
            {filtered.length === 0 ? (
              <p className="empty-hint">No groups match that filter.</p>
            ) : null}
          </div>
        </section>


        <section id="stats" className="index-section">
          <div className="section-head">
            <h2>In the CSD · space-group statistics</h2>
            <p>
              Why bother learning all 230? In the Cambridge Structural Database,
              a small set of space groups covers the vast majority of organic and
              organometallic crystal structures — so the groups you meet first in
              the lab are usually the ones that matter most for teaching.
            </p>
          </div>
          <CsdStatistics />
        </section>

        <section id="primer" className="index-section">
          <div className="section-head">
            <h2>Symmetry operations primer</h2>
            <p>
              Space groups are infinite wallpaper patterns in 3D — finite
              combinations of the moves below, wrapped by the lattice. Colors
              match the Pbca demo legend where applicable.
            </p>
          </div>
          <SymmetryPrimer />
        </section>

        <section id="guide" className="index-section">
          <div className="section-head">
            <h2>How to use &amp; legend</h2>
            <p>
              The interactive demos share one UI vocabulary. Learn it once on
              Pbca; later groups will reuse the same controls.
            </p>
          </div>

          <div className="guide-grid">
            <article className="guide-card">
              <h3>Views</h3>
              <ul>
                <li>
                  <strong>3D unit cell</strong> — orbit with the mouse; scroll
                  to zoom. The camera auto-fits so the cell stays in frame while
                  you rotate. <em>Reset view</em> restores the default angle.
                </li>
                <li>
                  <strong>2D projection</strong> — synced orthographic cut
                  (↓c / ↓b / ↓a) with the same BASE / IMAGE / sites.
                </li>
              </ul>
            </article>

            <article className="guide-card">
              <h3>Placement &amp; visibility</h3>
              <ul>
                <li>
                  <strong>Nearest images</strong> — place BASE and IMAGE near
                  the selected element (may sit just outside the cell,
                  UCL-style).
                </li>
                <li>
                  <strong>In cell</strong> — wrap every motif into [0, 1)³.
                </li>
                <li>
                  <strong>All sites</strong> vs <strong>BASE + IMAGE</strong> —
                  show the full general position or only the pair for the
                  selected operator.
                </li>
              </ul>
            </article>

            <article className="guide-card">
              <h3>Chiral motifs</h3>
              <ul>
                <li>
                  Tips <span className="chip proper">● △ ■</span> (ball ·
                  triangle · square) encode orientation.
                </li>
                <li>
                  <span className="chip proper">solid</span> = proper (same
                  hand);{' '}
                  <span className="chip mirrored">mirrored</span> = improper
                  (opposite hand).
                </li>
                <li>
                  <span className="chip base">BASE</span> →{' '}
                  <span className="chip image">IMAGE</span> highlights the
                  selected mapping.
                </li>
              </ul>
            </article>

            <article className="guide-card">
              <h3>Geometric elements</h3>
              <ul>
                <li>
                  <span className="chip element">⊙</span> inversion center ·{' '}
                  <span className="chip element">‖</span> 2₁ screw ·{' '}
                  <span className="chip element">▭</span> glide plane
                </li>
                <li>
                  Select an operator (or click a 2D site) to emphasize its
                  element; others stay faint.
                </li>
              </ul>
              <div className="guide-legend class-legend">
                {CLASS_LEGEND_ORDER.map((id) => {
                  const c = SYMMETRY_CLASSES[id]
                  return (
                    <span key={id} className="legend-item">
                      <span
                        className="swatch"
                        style={{ background: c.color }}
                      />
                      {c.label}
                    </span>
                  )
                })}
              </div>
            </article>
          </div>

          <div className="guide-cta">
            <Link to="/sg/61" className="btn btn-primary">
              Try it on Pbca (61) →
            </Link>
            <p className="muted">
              Teaching software inspired by International Tables for
              Crystallography (ITA) diagrams — not an official IUCr product.
            </p>
          </div>
        </section>
      </main>

      <footer className="index-footer">
        <div>
          <strong>Crystal Space Groups</strong>
          <span className="muted"> · interactive teaching diagrams</span>
        </div>
        <Link to="/sg/61">61 · Pbca</Link>
      </footer>
    </div>
  )
}
