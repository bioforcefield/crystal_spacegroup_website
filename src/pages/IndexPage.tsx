import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import SymmetryPrimer from '../components/SymmetryPrimer'
import CsdStatistics from '../components/CsdStatistics'
import HeroCellMotif from '../components/hero/HeroCellMotif'
import {
  CRYSTAL_SYSTEMS,
  READY_COUNT,
  TOTAL_GROUPS,
  filterGroups,
  systemInfo,
  type CrystalSystemId,
  type SpaceGroupEntry,
} from '../data/spaceGroupCatalog'
import { CLASS_PALETTE_ORDER as CLASS_LEGEND_ORDER, SYMMETRY_CLASSES } from '../data/symmetryPalette'

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
  const filtered = useMemo(() => filterGroups(query, system), [query, system])

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
              <a
                className="btn btn-ghost"
                href="https://img.chem.ucl.ac.uk/sgp/large/sgp.htm"
                target="_blank"
                rel="noopener noreferrer"
                title="Birkbeck / UCL space-group diagrams"
              >
                UCL diagrams ↗
              </a>
              <a
                className="btn btn-ghost"
                href="https://github.com/bioforcefield/crystal_spacegroup_website/discussions"
                target="_blank"
                rel="noopener noreferrer"
                title="Share ideas and suggestions on GitHub Discussions"
              >
                Suggest ideas ↗
              </a>
            </div>
          </div>
          <HeroCellMotif />
        </div>
      </header>

      <div className="home-spotlights">
        <section className="cif-spotlight" aria-labelledby="cif-spotlight-title">
          <div className="cif-spotlight-inner home-spotlight-card">
            <div className="cif-spotlight-copy">
              <div className="cif-spotlight-badges">
                <span className="cif-spotlight-badge">Structures</span>
                <span className="cif-spotlight-badge soft">New</span>
              </div>
              <h2 id="cif-spotlight-title">CIF symmetry map</h2>
              <p>
                Upload a CSD or COD CIF and see each symmetry operator colored on
                the real unit cell — screws, glides, mirrors, and inversions over
                the actual molecules. Load any COD id through the live proxy, or
                try a teaching chip on the explorer.
              </p>
              <div className="cif-spotlight-cta">
                <Link to="/cif" className="btn btn-primary">
                  Open CIF symmetry map
                </Link>
                <span className="cif-spotlight-hint">
                  or try a teaching COD chip on that page
                </span>
              </div>
            </div>
            <div className="cif-spotlight-aside" aria-hidden>
              <div className="cif-spotlight-orbits">
                <span className="cif-orb cif-orb-a" />
                <span className="cif-orb cif-orb-b" />
                <span className="cif-orb cif-orb-c" />
              </div>
              <p className="cif-spotlight-aside-label">CSD · COD · operators</p>
            </div>
          </div>
        </section>

        <div className="home-spotlight-row">
          <section className="pubs-spotlight" aria-labelledby="pubs-spotlight-title">
            <div className="pubs-spotlight-inner home-spotlight-card">
              <div className="pubs-spotlight-copy">
                <div className="cif-spotlight-badges">
                  <span className="cif-spotlight-badge">Literature</span>
                  <span className="cif-spotlight-badge soft">Crossref</span>
                  <span className="cif-spotlight-badge soft">COD</span>
                </div>
                <h2 id="pubs-spotlight-title">Publications by year &amp; tags</h2>
                <p>
                  Stream recent ACS / IUCr / RSC / Wiley titles via Crossref
                  (metadata + DOI only), or browse the curated COD set by year and
                  tags — then open the paper or the structure in the CIF map.
                </p>
                <div className="cif-spotlight-cta">
                  <Link to="/pubs" className="btn btn-primary">
                    Browse publications
                  </Link>
                  <span className="cif-spotlight-hint">
                    live Crossref · curated COD · no PDFs
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="teach-spotlight" aria-labelledby="teach-spotlight-title">
            <div className="teach-spotlight-inner home-spotlight-card">
              <div className="teach-spotlight-copy">
                <div className="cif-spotlight-badges">
                  <span className="cif-spotlight-badge">Growth</span>
                  <span className="cif-spotlight-badge soft">Interactive</span>
                </div>
                <h2 id="teach-spotlight-title">Morphology &amp; kinetics</h2>
                <p>
                  Explore how relative face growth rates set crystal habit (2D Wulff
                  schematic), and how supersaturation drives nucleation and growth
                  mechanism curves — teaching plots with live sliders.
                </p>
                <div className="cif-spotlight-cta">
                  <Link to="/morphology" className="btn btn-primary">
                    Morphology
                  </Link>
                  <Link to="/kinetics" className="btn btn-primary">
                    Kinetics
                  </Link>
                  <span className="cif-spotlight-hint">
                    Wulff outline · nucleation · growth regimes
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

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
              Real structures:{' '}
              <Link to="/cif">CIF symmetry map</Link>. Growth:{' '}
              <Link to="/morphology">morphology</Link>,{' '}
              <Link to="/kinetics">kinetics</Link>.
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
                  <strong>Near</strong> — place BASE and IMAGE near the
                  selected element (may sit just outside the cell).
                </li>
                <li>
                  <strong>Wrap</strong> (in cell) — wrap every motif into [0, 1)³.
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
              <Link to="/sg/15">C2/c</Link> (rank 3),{' '}
              <Link to="/sg/19">P212121</Link> (rank 4),{' '}
              <Link to="/sg/4">P21</Link> (rank 5),{' '}
              <Link to="/sg/61">Pbca</Link> (rank 6), and{' '}
              <Link to="/sg/33">Pna21</Link> (rank 7).
            </p>
          </div>
          <CsdStatistics />
        </section>
      </main>

      <footer className="index-footer">
        <div>
          <strong>Crystal Space Groups</strong>
          <span className="muted"> · interactive teaching diagrams</span>
          <div className="footer-feedback">
            <a
              href="https://github.com/bioforcefield/crystal_spacegroup_website/discussions"
              target="_blank"
              rel="noopener noreferrer"
            >
              Suggest an improvement
            </a>
            <span className="muted"> — ideas &amp; discussion on GitHub</span>
            <span className="sep"> · </span>
            <Link to="/pubs">Publications</Link>
            <span className="sep"> · </span>
            <Link to="/morphology">Morphology</Link>
            <span className="sep"> · </span>
            <Link to="/kinetics">Kinetics</Link>
          </div>
        </div>
        <span className="footer-demos">
          <Link to="/sg/14">14 · P21/c</Link>
          <span className="sep"> · </span>
          <Link to="/sg/2">2 · P-1</Link>
          <span className="sep"> · </span>
          <Link to="/sg/15">15 · C2/c</Link>
          <span className="sep"> · </span>
          <Link to="/sg/4">4 · P21</Link>
          <span className="sep"> · </span>
          <Link to="/sg/19">19 · P212121</Link>
          <span className="sep"> · </span>
          <Link to="/sg/33">33 · Pna21</Link>
          <span className="sep"> · </span>
          <Link to="/sg/61">61 · Pbca</Link>
        </span>
      </footer>
    </div>
  )
}
