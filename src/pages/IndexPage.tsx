import { useEffect, useMemo, useState, type CSSProperties } from 'react'
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
  const [liveOnly, setLiveOnly] = useState(false)

  const filtered = useMemo(() => {
    const base = filterGroups(query, system)
    return liveOnly ? base.filter((g) => g.status === 'ready') : base
  }, [query, system, liveOnly])

  const plannedHidden = useMemo(() => {
    if (!liveOnly) return 0
    return filterGroups(query, system).filter((g) => g.status !== 'ready').length
  }, [query, system, liveOnly])

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '')
    if (!hash) return
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  const selectSystem = (id: SystemFilter) => {
    setSystem(id)
    document.getElementById('index')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="index-page">
      <header className="index-hero">
        <div className="hero-glow" aria-hidden />
        <div className="hero-grid" aria-hidden />
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">Interactive crystallography</p>
            <h1>Crystal Space Groups</h1>
            <p className="hero-lead">
              Learn how the 230 crystallographic space groups rearrange atoms —
              rotations, screws, mirrors, and glides — with linked 3D and 2D
              diagrams built for students.
            </p>
            <div className="hero-stats">
              <div>
                <strong>{TOTAL_GROUPS}</strong>
                <span>interactive demos</span>
              </div>
              <div>
                <strong>{READY_COUNT}</strong>
                <span>ITA numbers live</span>
              </div>
              <div>
                <strong>7</strong>
                <span>crystal systems</span>
              </div>
            </div>
            <div className="hero-cta">
              <Link to="/sg/14" className="btn btn-primary">
                Try P21/c (14)
              </Link>
              <Link to="/sg/2" className="btn btn-primary">
                Try P-1 (2)
              </Link>
              <Link to="/sg/15" className="btn btn-primary">
                Try C2/c (15)
              </Link>
              <Link to="/sg/61" className="btn btn-primary">
                Try Pbca (61)
              </Link>
              <Link to="/sg/19" className="btn btn-primary">
                Try P212121 (19)
              </Link>
              <a href="#guide" className="btn btn-ghost">
                How to use
              </a>
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
              <text x="118" y="52" fill="#38bdf8" fontSize="10" fontWeight="700">
                P21/c · P-1
              </text>
            </svg>
          </div>
        </div>
      </header>

      <main className="index-main">
        <section id="explore" className="index-section">
          <div className="section-head">
            <h2>Explore by crystal system</h2>
            <p>
              Start from the lattice family you care about, then open any ITA
              number 1–230. Featured teaching polish:{' '}
              <Link to="/sg/14">P21/c (14)</Link>,{' '}
              <Link to="/sg/2">P-1 (2)</Link>,{' '}
              <Link to="/sg/15">C2/c (15)</Link>,{' '}
              <Link to="/sg/61">Pbca (61)</Link>, and{' '}
              <Link to="/sg/19">P212121 (19)</Link>.
            </p>
          </div>
          <p className="explore-hint">Click a system to filter the index below.</p>
          <div className="system-grid">
            <button
              type="button"
              className={system === 'all' ? 'system-card active' : 'system-card'}
              onClick={() => selectSystem('all')}
            >
              <span className="system-name">All systems</span>
              <span className="system-range">1 – 230</span>
              <span className="system-blurb">
                Browse every ITA number across the seven crystal systems.
              </span>
            </button>
            {CRYSTAL_SYSTEMS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={system === s.id ? 'system-card active' : 'system-card'}
                style={{ '--sys': s.accent } as CSSProperties}
                onClick={() => selectSystem(s.id)}
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
              Search by ITA number or Hermann–Mauguin symbol. Every tile opens an
              interactive demo (operators + teaching cell). Featured groups have
              extra-polished loci.
              {system !== 'all' ? (
                <span className="filter-chip">
                  {systemInfo(system).name}
                  <button
                    type="button"
                    aria-label="Clear system filter"
                    onClick={() => setSystem('all')}
                  >
                    ×
                  </button>
                </span>
              ) : null}
            </p>
          </div>
          <div className="index-toolbar">
            <input
              type="search"
              className="sg-search"
              placeholder="Filter by number or symbol… e.g. 2, 14, P-1, P21/c"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Filter space groups"
            />
            <label className="live-toggle" data-on={liveOnly ? 'true' : 'false'}>
              <input
                type="checkbox"
                checked={liveOnly}
                onChange={(e) => setLiveOnly(e.target.checked)}
              />
              Live only
            </label>
            <span className="index-count">
              {filtered.length}
              {liveOnly ? ` live` : ` of ${TOTAL_GROUPS}`}
              {system !== 'all' ? ` · ${systemInfo(system).name}` : ''}
            </span>
          </div>
          <div className="sg-chip-grid">
            {filtered.map((g) => (
              <GroupChip key={g.number} g={g} />
            ))}
            {liveOnly && plannedHidden > 0 ? (
              <p className="planned-summary">
                {plannedHidden} more group{plannedHidden === 1 ? '' : 's'} in this
                filter are planned. Turn off <strong>Live only</strong> to browse
                the full list.
              </p>
            ) : null}
            {filtered.length === 0 ? (
              <p className="empty-hint">No groups match that filter.</p>
            ) : null}
          </div>
        </section>

        <section id="primer" className="index-section">
          <div className="section-head">
            <h2>Symmetry operations primer</h2>
            <p>
              Space groups are infinite 3D wallpaper patterns — finite
              combinations of the moves below, wrapped by the lattice. Colors
              match the demo legend where they apply.
            </p>
          </div>
          <SymmetryPrimer />
        </section>

        <section id="guide" className="index-section">
          <div className="section-head">
            <h2>How to use &amp; legend</h2>
            <p>
              Every interactive demo shares the same controls. Learn them once —
              they apply across all 230 space groups.
            </p>
          </div>

          <div className="guide-grid">
            <article className="guide-card">
              <h3>Views</h3>
              <ul>
                <li>
                  <strong>3D unit cell</strong> — orbit with the mouse; scroll to
                  zoom. The camera auto-fits so the cell stays in frame while you
                  rotate. <em>Reset view</em> restores the default angle.
                </li>
                <li>
                  <strong>2D projection</strong> — synced orthographic cut (↓c /
                  ↓b / ↓a) with the same BASE / IMAGE / sites.
                </li>
              </ul>
            </article>

            <article className="guide-card">
              <h3>Placement &amp; visibility</h3>
              <ul>
                <li>
                  <strong>Nearest images</strong> — place BASE and IMAGE near the
                  selected element (may sit just outside the cell).
                </li>
                <li>
                  <strong>In cell</strong> — wrap every motif into [0, 1)³.
                </li>
                <li>
                  <strong>All sites</strong> vs <strong>BASE + IMAGE</strong> —
                  show the full general position or only the pair for the selected
                  operator.
                </li>
              </ul>
            </article>

            <article className="guide-card">
              <h3>Chiral motifs</h3>
              <ul>
                <li>
                  Tips <span className="chip proper">● △ ■</span> (ball · triangle
                  · square) encode orientation.
                </li>
                <li>
                  <span className="chip proper">solid</span> = proper (same hand);{' '}
                  <span className="chip mirrored">mirrored</span> = improper
                  (opposite hand).
                </li>
                <li>
                  <span className="chip base">BASE</span> →{' '}
                  <span className="chip image">IMAGE</span> highlights the selected
                  mapping.
                </li>
              </ul>
            </article>

            <article className="guide-card">
              <h3>Geometric elements</h3>
              <ul>
                <li>
                  <span className="chip element">⊙</span> inversion center ·{' '}
                  <span className="chip element">‖</span> 2₁ / 2-fold ·{' '}
                  <span className="chip element">▭</span> glide / mirror
                </li>
                <li>
                  Select an operator (or click a 2D site) to emphasize its element;
                  others stay faint.
                </li>
              </ul>
              <div className="guide-legend class-legend">
                {CLASS_LEGEND_ORDER.map((id) => {
                  const c = SYMMETRY_CLASSES[id]
                  return (
                    <span key={id} className="legend-item">
                      <span className="swatch" style={{ background: c.color }} />
                      {c.label}
                    </span>
                  )
                })}
              </div>
            </article>
          </div>

          <div className="guide-cta">
            <div className="hero-cta" style={{ justifyContent: 'flex-start' }}>
              <Link to="/sg/14" className="btn btn-primary">
                Open P21/c →
              </Link>
              <Link to="/sg/2" className="btn btn-ghost">
                Open P-1 →
              </Link>
              <Link to="/sg/15" className="btn btn-ghost">
                Open C2/c →
              </Link>
              <Link to="/sg/61" className="btn btn-ghost">
                Open Pbca →
              </Link>
            </div>
            <p className="muted">
              Diagrams follow the usual teaching conventions used in
              International Tables for Crystallography (ITA). This is an
              independent student tool — not an official IUCr product.
            </p>
          </div>
        </section>

        <section id="stats" className="index-section">
          <div className="section-head">
            <h2>In the CSD · space-group statistics</h2>
            <p>
              All 230 groups are interactive. In the Cambridge Structural
              Database, a small set covers most organic and organometallic
              structures — our featured demos include{' '}
              <Link to="/sg/14">P21/c</Link> (rank 1),{' '}
              <Link to="/sg/2">P-1</Link> (rank 2),{' '}
              <Link to="/sg/15">C2/c</Link> (rank 3), and{' '}
              <Link to="/sg/61">Pbca</Link> (rank 6).
            </p>
          </div>
          <CsdStatistics />
        </section>
      </main>

      <footer className="index-footer">
        <div>
          <strong>Crystal Space Groups</strong>
          <span className="muted"> · interactive teaching diagrams</span>
        </div>
        <span className="footer-demos">
          <Link to="/sg/14">14 · P21/c</Link>
          <span className="sep"> · </span>
          <Link to="/sg/2">2 · P-1</Link>
          <span className="sep"> · </span>
          <Link to="/sg/15">15 · C2/c</Link>
          <span className="sep"> · </span>
          <Link to="/sg/61">61 · Pbca</Link>
          <span className="sep"> · </span>
          <Link to="/sg/19">19 · P212121</Link>
        </span>
      </footer>
    </div>
  )
}
