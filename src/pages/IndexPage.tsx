import { LatticeLabLogo } from '../components/brand/LatticeLabLogo'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { KineticsLogo, MorphLogo, ProcessLogo, FormsLogo, PubsLogo } from '../components/brand/SectionLogos'
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
import type { SymmetryClassId } from '../data/types'

/** How each symmetry class is drawn in the 3D/2D demos (colours come from SYMMETRY_CLASSES). */
export const GUIDE_SYMBOL: Record<SymmetryClassId, string> = {
  identity: 'BASE motif itself (no element)',
  twofold: 'axis line labelled 2 (rotation only)',
  threefold: 'axis line labelled 3',
  fourfold: 'axis line labelled 4 or −4',
  sixfold: 'axis line labelled 6',
  screw: 'axis line labelled 2₁, 4₁, 4₂, 6₃ … (rotate + translate)',
  inversion: '⊙ point at the inversion centre',
  mirror: 'translucent plane, no arrow',
  'a-glide': 'translucent plane + dashed arrow along a',
  'b-glide': 'translucent plane + dashed arrow along b',
  'c-glide': 'translucent plane + dashed arrow along c',
  'n-glide': 'plane + dashed diagonal arrow (n)',
  'd-glide': 'plane + dashed arrow (diamond, ¼ translation)',
}

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
              rotations, screws, mirrors, and glides — with linked, interactive 3D
              and 2D diagrams.
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
                <span className="cif-spotlight-badge soft">COD</span>
                <span className="cif-spotlight-badge soft">PDB</span>
                <span className="cif-spotlight-badge soft">New</span>
              </div>
              <h2 id="cif-spotlight-title" className="lattice-lab-title">
                <LatticeLabLogo size={26} className="lattice-lab-logo" />
                Lattice Lab
              </h2>
              <p>
                See every symmetry operator colored on a real unit cell — screws,
                glides, mirrors and inversions over the actual molecules. Load any
                COD id, a CSD-exported CIF, or a PDB entry from RCSB search
                (cartoon, ligands with a 2D interaction diagram, sequence alignment
                and structure analysis). Upload CIF, mmCIF, .pdb or Maestro .mae
                files, and download any cell view as CIF or PDB.
              </p>
              <div className="cif-spotlight-cta">
                <Link to="/cif" className="btn btn-primary">
                  Open Lattice Lab
                </Link>
                <span className="cif-spotlight-hint">
                  or try <Link to="/cif/sample/acetic_p21c">acetic acid (P2₁/c)</Link>
                  {' · '}
                  <Link to="/cif/pdb/4hhb">hemoglobin 4HHB</Link>
                </span>
              </div>
            </div>
            <div className="cif-spotlight-aside" aria-hidden>
              <LatticeLabLogo size={96} className="lattice-lab-logo home-aside-logo" />
              <p className="cif-spotlight-aside-label">COD · PDB · CSD</p>
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
                <h2 id="pubs-spotlight-title" className="lattice-lab-title">
                  <PubsLogo size={26} className="lattice-lab-logo" />
                  Publications by year &amp; tags
                </h2>
                <p>
                  Stream recent ACS / IUCr / RSC / Wiley titles via Crossref
                  (metadata + DOI only), or browse the curated COD set by year and
                  tags — then open the paper or the structure in Lattice Lab.
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
                  <span className="cif-spotlight-badge soft">Literature</span>
                </div>
                <h2 id="teach-spotlight-title" className="lattice-lab-title">
                  <MorphLogo size={26} className="lattice-lab-logo" />
                  <KineticsLogo size={26} className="lattice-lab-logo" />
                  Morphology &amp; kinetics
                </h2>
                <p>
                  Explore how relative face growth rates set crystal habit (2D Wulff
                  schematic), and how supersaturation drives nucleation and growth
                  mechanism curves — teaching plots with live sliders, plus literature
                  reviews with ~50 DOI-checked references and plots redrawn from
                  published data.
                </p>
                <div className="cif-spotlight-cta">
                  <Link to="/morphology" className="btn btn-primary btn-logo">
                    <MorphLogo size={16} className="nav-logo" />
                    Morphology
                  </Link>
                  <Link to="/kinetics" className="btn btn-primary btn-logo">
                    <KineticsLogo size={16} className="nav-logo" />
                    Kinetics
                  </Link>
                  <span className="cif-spotlight-hint">
                    Wulff · BFDH · nucleation · growth · references
                  </span>
                </div>
              </div>
            </div>
          </section>
          <section className="teach-spotlight" aria-labelledby="proc-spotlight-title">
            <div className="teach-spotlight-inner home-spotlight-card">
              <div className="teach-spotlight-copy">
                <div className="cif-spotlight-badges">
                  <span className="cif-spotlight-badge">Process</span>
                  <span className="cif-spotlight-badge soft">Interactive</span>
                  <span className="cif-spotlight-badge soft">Literature</span>
                </div>
                <h2 id="proc-spotlight-title" className="lattice-lab-title">
                  <ProcessLogo size={26} className="lattice-lab-logo" />
                  Industrial crystallization
                </h2>
                <p>
                  Solubility and metastable-zone explorer with cooling, evaporative and
                  antisolvent trajectories, cooling profiles, MSMPR size distributions,
                  yield and seed-loading calculators, plus a review of PAT, control and
                  continuous crystallization with Crossref-checked references.
                </p>
                <div className="cif-spotlight-cta">
                  <Link to="/process" className="btn btn-primary btn-logo">
                    <ProcessLogo size={16} className="nav-logo" />
                    Process
                  </Link>
                  <span className="cif-spotlight-hint">
                    MSZW · seeding · PBM · PAT · continuous
                  </span>
                </div>
              </div>
            </div>
          </section>
          <section className="teach-spotlight" aria-labelledby="forms-spotlight-title">
            <div className="teach-spotlight-inner home-spotlight-card">
              <div className="teach-spotlight-copy">
                <div className="cif-spotlight-badges">
                  <span className="cif-spotlight-badge">Solid state</span>
                  <span className="cif-spotlight-badge soft">Interactive</span>
                  <span className="cif-spotlight-badge soft">Literature</span>
                </div>
                <h2 id="forms-spotlight-title" className="lattice-lab-title">
                  <FormsLogo size={26} className="lattice-lab-logo" />
                  Solid forms
                </h2>
                <p>
                  Polymorphs, hydrates, salts, cocrystals and amorphous forms: ΔpKa
                  classifier, pH<sub>max</sub> profile, Burger–Ramberger and hydrate
                  stability explorers, a cocrystal phase diagram, and a review with
                  Crossref-checked references and links to Lattice Lab structures.
                </p>
                <div className="cif-spotlight-cta">
                  <Link to="/forms" className="btn btn-primary btn-logo">
                    <FormsLogo size={16} className="nav-logo" />
                    Forms
                  </Link>
                  <span className="cif-spotlight-hint">
                    polymorphs · hydrates · salts · cocrystals · ASDs
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
              <Link to="/cif">Lattice Lab</Link>. Growth:{' '}
              <Link to="/morphology">morphology</Link>,{' '}
              <Link to="/kinetics">kinetics</Link>. Process:{' '}
              <Link to="/process">industrial crystallization</Link>,{' '}
              <Link to="/forms">solid forms</Link>.
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
              The controls below apply to the space-group pages (/sg/…) and are
              shared by all 230 groups. Lattice Lab, PXRD and the learning pages
              have their own controls — see the collapsible sections further down.
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
                  <strong>Nearest images (Near)</strong> — place BASE and IMAGE near the
                  selected element (may sit just outside the cell).
                </li>
                <li>
                  <strong>In cell (Wrap)</strong> — wrap every motif into [0, 1)³.
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
              <table className="guide-symbols" data-testid="guide-symbol-table">
                <thead><tr><th>Colour</th><th>Element</th><th>Drawn as</th></tr></thead>
                <tbody>
                  {CLASS_LEGEND_ORDER.map((id) => {
                    const c = SYMMETRY_CLASSES[id]
                    return (
                      <tr key={id} data-class={id}>
                        <td><span className="swatch" style={{ background: c.color }} /></td>
                        <td>{c.label}</td>
                        <td>{GUIDE_SYMBOL[id]}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <ul>
                <li>
                  A screw axis (2₁, 4₁, 6₃ …) rotates <em>and</em> translates along
                  the axis; a plain 2-fold only rotates — they have separate
                  colours. Likewise a mirror reflects in place, while a glide
                  reflects and then slides (dashed arrow shows the glide vector).
                </li>
                <li>
                  Select an operator (or click a 2D site) to emphasize its element;
                  others stay faint. In <em>Nearest images</em> the IMAGE can
                  straddle the cell edge — that is the nearest copy, not an error.
                </li>
                <li>
                  The animated primer above shows each move step by step.
                </li>
              </ul>
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
              independent educational resource — not an official IUCr product;
              see the <a href="#site-disclaimer">disclaimer in the footer</a>.
            </p>
          </div>

          <div className="guide-more" data-testid="guide-more">
            <details className="guide-acc">
              <summary>Lattice Lab (/cif)</summary>
              <ul>
                <li><strong>Load</strong> — a COD id or PDB id, RCSB text search, upload or paste
                  (CIF, mmCIF, PDB, Maestro .mae/.maegz, gzipped .gz), recent structures,
                  biological assemblies and PDB-REDO re-refinements.</li>
                <li><strong>View</strong> — the <em>Display</em> menu (style, labels, H-bonds, ellipsoids …),
                  the cell panel (Nearest / Cell whole / Cell atoms), supercell a×b×c, and the
                  <em>Disorder</em> / <em>Alternate conformations</em> control when the file has disorder
                  groups or altlocs (default = highest occupancy; “show all” draws the others translucent).</li>
                <li><strong>Export</strong> — <em>Download</em> saves exactly the current cell view (ASU,
                  molecules or cell contents).</li>
                <li><strong>Compare</strong> — the sequence strip, <em>+Compare</em> to add a second
                  structure, sequence alignment, Kabsch superposition overlay, a per-structure
                  3D tick to show/hide each, and one colour per structure.</li>
                <li><strong>Ligands</strong> — PLIP-style protein–ligand interactions per ligand, with
                  a <em>2D</em> interaction diagram.</li>
                <li><strong>Analysis</strong> — PDB tabs (Ramachandran, side-chain χ, nucleic acids,
                  sugar pucker, base pairs, steps, Bonds &amp; angles), overlay mode, the equations
                  used, CSV and report export; small-molecule CIFs get bond/angle/torsion/H-bond analysis.</li>
              </ul>
            </details>
            <details className="guide-acc">
              <summary>PXRD (powder pattern)</summary>
              <ul>
                <li>A simulated powder pattern from the loaded structure: 2θ on x, relative
                  intensity on y, the wavelength (λ) shown on the plot; the strongest peaks
                  carry (hkl) labels and hovering gives 2θ, d, I and hkl.</li>
                <li><em>Enlarge</em> opens a large view: drag to zoom the 2θ range,
                  double-click to reset, Esc to close; peak list and PNG/CSV export.</li>
              </ul>
            </details>
            <details className="guide-acc">
              <summary>Learning pages</summary>
              <ul>
                <li><Link to="/morphology">Morph</Link> (crystal morphology), <Link to="/kinetics">Kinetics</Link>,{' '}
                  <Link to="/process">Process</Link>, <Link to="/forms">Forms</Link> (polymorphs and solid forms)
                  and <Link to="/pubs">Pubs</Link>.</li>
                <li>Plots mark <em>published data</em> (cited, digitised from the source) separately
                  from <em>model curves</em> (computed by the page from an equation) — check the
                  caption before quoting a number.</li>
              </ul>
            </details>
            <details className="guide-acc">
              <summary>Useful URL parameters</summary>
              <ul className="guide-params">
                <li><code>?asm=1</code> — PDB biological assembly 1.</li>
                <li><code>?src=redo</code> — load the PDB-REDO re-refinement.</li>
                <li><code>?lig=…&amp;diagram=1</code> — focus a ligand and open its 2D diagram.</li>
                <li><code>?analysis=rama|chi|na|pucker|bp|step|geom</code> — open an analysis tab.</li>
                <li><code>?dis=A:2</code> (or <code>*</code> = show all) / <code>?alt=B</code> — disorder group or altloc.</li>
              </ul>
            </details>
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
          <p className="footer-disclaimer" id="site-disclaimer" data-footer="disclaimer">
            For educational use only. Content is provided as is, without warranty of
            accuracy or completeness; please verify against primary sources before
            relying on it. Figures and data are cited to their original sources, and no
            copyright infringement is intended. If you spot an error or a rights
            concern, please{' '}
            <a href="https://github.com/bioforcefield/crystal_spacegroup_website/discussions" target="_blank" rel="noopener noreferrer">suggest an improvement</a>{' '}
            or email{' '}
            <a href="mailto:contact@crystalspacegroups.com">contact@crystalspacegroups.com</a>.
          </p>
          <div className="footer-feedback">
            <Link to="/pubs">Publications</Link>
            <span className="sep"> · </span>
            <Link to="/morphology">Morphology</Link>
            <span className="sep"> · </span>
            <Link to="/kinetics">Kinetics</Link>
            <span className="sep"> · </span>
            <Link to="/process">Process</Link>
            <span className="sep"> · </span>
            <Link to="/forms">Solid forms</Link>
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
