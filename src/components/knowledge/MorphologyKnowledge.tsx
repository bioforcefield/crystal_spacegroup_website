import { MORPH_REFS } from '../../data/literature/refs'
import { PARACETAMOL_FACE_AREAS, PARACETAMOL_MODEL_RANK } from '../../data/literature/publishedData'
import { Eq, Figure, KnowledgeSections, RefList, makeCite, type KSection } from './Knowledge'
import { StackedBars } from './Charts'

const Cite = makeCite(MORPH_REFS)
const KEY_REVIEWS = ['lovette08', 'rohl03', 'deyoreo03', 'shtukenberg17', 'anwar11', 'marks16', 'xia09']

const sections: KSection[] = [
  {
    id: 'morph-theory',
    title: '1 · Theory: equilibrium vs growth shape',
    body: (
      <>
        <h4>Gibbs–Curie–Wulff (equilibrium shape)</h4>
        <p>
          At equilibrium a crystal of fixed volume minimises its total surface free energy
          Σ γ<sub>i</sub>A<sub>i</sub>. Wulff's construction gives the solution: the
          perpendicular distance from the centre to face i is proportional to its surface
          energy <Cite ids="wulff1901 marks16" />.
        </p>
        <Eq>h<sub>i</sub> / γ<sub>i</sub> = constant &nbsp;&nbsp;(equilibrium) &nbsp;&nbsp;·&nbsp;&nbsp; h<sub>i</sub> / R<sub>i</sub> = constant &nbsp;&nbsp;(steady-state growth)</Eq>
        <p>
          True equilibrium shapes are reached only for very small particles or after long
          annealing; for nanoparticles DFT surface energies fed into a Wulff construction
          predict shapes well <Cite ids="barmparis15 tran16" />. Macroscopic crystals grown from
          solution show a <em>growth</em> shape instead, where the same construction is
          applied to face growth rates R<sub>i</sub>: slow faces survive and become large,
          fast faces grow themselves out <Cite ids="lovette08 li15" />.
        </p>
        <h4>BFDH (geometric)</h4>
        <p>
          Bravais, Friedel, Donnay and Harker ranked faces by interplanar spacing: faces with
          larger d<sub>hkl</sub> (after systematic-absence correction) are more important,
          R ∝ 1/d<sub>hkl</sub>. It uses only the cell and space group, so it is a quick first
          guess that ignores chemistry. The BFDH tool above implements this rule
          <Cite ids="docherty91 rohl03" />.
        </p>
        <h4>Hartman–Perdok: periodic bond chains and attachment energy</h4>
        <p>
          Hartman and Perdok classified faces by the number of uninterrupted chains of strong
          bonds (periodic bond chains, PBCs) running parallel to them: F (flat, ≥ 2 PBCs),
          S (stepped, 1) and K (kinked, 0). Only F faces grow layer by layer and appear on the
          habit <Cite ids="hartman55" />. The attachment energy E<sub>att</sub>, the energy
          released when one growth slice attaches, splits the lattice energy as
        </p>
        <Eq>E<sub>cr</sub> = E<sub>sl</sub> + E<sub>att</sub>, &nbsp;&nbsp; R<sub>hkl</sub> ∝ |E<sub>att</sub>|</Eq>
        <p>
          Faces with small |E<sub>att</sub>| grow slowly and dominate <Cite ids="hartman80 berkovitch85 clydesdale91" />.
          The method is vacuum-based and supersaturation-independent, which is its main
          limitation <Cite ids="coombes05 cuppen04" />.
        </p>
        <h4>Surface energy vs growth rate</h4>
        <p>
          Surface energy controls the equilibrium shape; growth shape is set by kinetics
          (step energies, kink density, desolvation). The two coincide only when growth rate
          scales with surface energy, which is often not the case for molecular crystals
          grown from solution <Cite ids="lovette12pre lovette12" />.
        </p>
      </>
    ),
  },
  {
    id: 'morph-methods',
    title: '2 · Computational methods',
    body: (
      <>
        <ul>
          <li>
            <strong>Attachment-energy calculations.</strong> Slice energies are computed from a
            force field (e.g. DREIDING, COMPASS) or periodic DFT, as in HABIT and the
            Materials Studio Morphology module <Cite ids="clydesdale91 docherty91 coombes05" />.
            Results depend noticeably on force field and charges <Cite ids="cuppen04" />.
          </li>
          <li>
            <strong>Mechanistic spiral and 2D-nucleation models.</strong> Doherty and co-workers
            derive face rates from step velocities, kink density and critical spiral edge
            length (BCF theory). They extended these models to centrosymmetric and
            non-centrosymmetric molecules, polar urea, amino acids and impurity effects
            <Cite ids="bcf51 winn00 biskerleib01 biskerleib02 kuvadia11 sizemore09 mazal22" />.
            Snyder and Doherty gave the shape-evolution framework for growth and dissolution
            <Cite ids="snyder07 snyder08" />. PBC analysis also explains needle habits and
            guides solvent choice <Cite ids="lovette13" />.
          </li>
          <li>
            <strong>Molecular dynamics of crystal–solution interfaces.</strong> MD resolves
            solvent and additive binding at specific faces and steps. Examples are urea
            growth with additives, and micrometre-scale urea crystals grown by kinetic Monte
            Carlo with rates taken from MD <Cite ids="salvalaglio12 piana05 anwar11" />.
          </li>
          <li>
            <strong>Kinetic Monte Carlo and CrystalGrower.</strong> kMC grows the crystal
            site by site with supersaturation-dependent rates. CrystalGrower combines a
            partition-function model with kMC to predict habit and surface topography for
            zeolites, MOFs and molecular crystals <Cite ids="anderson17 hill21 cuppen04" />.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'morph-additives',
    title: '3 · Solvent and additive effects',
    body: (
      <>
        <p>
          Solvent changes habit by binding face-selectively, raising desolvation barriers or
          changing the surface roughness. Tailor-made additives, molecules that resemble the
          solute but carry a modified group, adsorb on faces where the modification points
          outward and poison growth there <Cite ids="addadi85 weissbuch91" />. Classic
          biologically relevant examples:
        </p>
        <ul>
          <li>Chiral amino acids adsorb on calcite step edges and produce chiral morphologies <Cite ids="orme01" />.</li>
          <li>Peptide charge and hydrophilicity tune calcite step kinetics <Cite ids="elhadj06" />.</li>
          <li>Mg²⁺ incorporation inhibits calcite growth <Cite ids="davis00" />.</li>
          <li>Tailored inhibitors suppress L-cystine growth, a design strategy against kidney stones <Cite ids="rimer10" />.</li>
          <li>Macromolecular additives act through pinning, incorporation and templating <Cite ids="shtukenberg17" />.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'morph-experiment',
    title: '4 · Experimental techniques',
    body: (
      <ul>
        <li>
          <strong>In situ AFM</strong> images steps and spirals in solution with nanometre
          resolution. On calcite it gave molecular-scale growth and dissolution in real time
          and step-velocity kinetics linking to macroscopic rate laws
          <Cite ids="hillner92 teng00 ward01" />.
        </li>
        <li>
          <strong>SEM and optical microscopy</strong> record habit, face areas and growth rates of
          individual crystals. For paracetamol, the rate spread among small self-nucleated
          crystals is large <Cite ids="finnie99 ristic01" />.
        </li>
        <li>
          <strong>Face indexing</strong> by single-crystal diffraction assigns Miller indices
          to habit faces, which is required before comparing with any model <Cite ids="ward01" />.
        </li>
        <li>
          <strong>Structure inputs</strong>: accurate cells and coordinates, e.g. urea by
          neutron diffraction, paracetamol form I and ibuprofen, underpin every prediction
          <Cite ids="swaminathan84 haisa76 shankland97 shankland96" />.
        </li>
      </ul>
    ),
  },
  {
    id: 'morph-frontiers',
    title: '5 · Frontiers',
    body: (
      <ul>
        <li>
          <strong>Pharmaceutical habit engineering.</strong> Needle and plate habits hurt
          filtration, flow and tabletting. Supersaturation-dependent shape models and solvent
          selection from PBC analysis are now used to target equant habits <Cite ids="lovette08 lovette12 lovette13" />.
        </li>
        <li>
          <strong>Biomineralisation.</strong> Organisms control shape through amorphous
          precursors and organic additives <Cite ids="gower08 orme01" />.
        </li>
        <li>
          <strong>Nanocrystal shape control.</strong> Capping agents and kinetic control give
          cubes, octahedra, rods and plates of metals <Cite ids="xia09 tao08 marks16" />.
        </li>
        <li>
          <strong>Data-driven prediction.</strong> High-throughput DFT surface energies
          <Cite ids="tran16" /> and kMC models fitted to AFM data <Cite ids="anderson17 hill21" />
          are the training ground for machine-learning habit models. Validated ML morphology
          predictors for molecular crystals remain an open problem.
        </li>
      </ul>
    ),
  },
  {
    id: 'morph-results',
    title: '6 · Published results and plots',
    body: (
      <>
        <Figure
          id="plot-paracetamol-areas"
          title="Paracetamol (form I) face areas vs supersaturation, grown from water"
          source={<>Data: Ristic et al. 2001, Table 1 (relative face areas measured on crystals at low &lt;10 %, medium 10–15 %, high &gt;15 % supersaturation) <Cite ids="ristic01" />. Values transcribed, not digitised.</>}
        >
          <StackedBars
            ariaLabel="Stacked bars of relative paracetamol face areas at three supersaturations"
            keys={PARACETAMOL_FACE_AREAS.map((f) => f.face)}
            groups={(['low', 'medium', 'high'] as const).map((g) => ({
              label: `${g} σ`,
              values: PARACETAMOL_FACE_AREAS.map((f) => f[g]),
            }))}
          />
          <p>
            As supersaturation rises, {'{110}'} shrinks from 85 % to 17.5 % of the area and
            {' {001}'} grows from 10 % to 50 %, so the habit goes from columnar to plate-like.
            A single attachment-energy morphology cannot show this dependence.
          </p>
        </Figure>
        <Figure
          id="plot-paracetamol-rank"
          title="Paracetamol: modelled morphological importance (attachment energy, two force fields)"
          source={<>Data: Ristic et al. 2001, Table 1, rank 1 = most important <Cite ids="ristic01" />; structure from Haisa et al. 1976 <Cite ids="haisa76" />.</>}
        >
          <table className="know-table">
            <thead><tr><th>Face</th><th>DREIDING II rank</th><th>MOMANY rank</th></tr></thead>
            <tbody>
              {PARACETAMOL_MODEL_RANK.map((r) => (
                <tr key={r.face}><td>{r.face}</td><td>{r.dreiding ?? '—'}</td><td>{r.momany ?? '—'}</td></tr>
              ))}
            </tbody>
          </table>
          <p>The two force fields disagree on the ranks of {'{011}'} and {'{001}'}, the force-field sensitivity later quantified by Cuppen et al. <Cite ids="cuppen04" />.</p>
        </Figure>
        <p className="know-note">
          Try it: load urea (COD 1008776, P −4 2<sub>1</sub> m) or paracetamol in the BFDH tool
          above for a geometric ranking to compare with these measured areas.
        </p>
      </>
    ),
  },
  {
    id: 'morph-refs',
    title: `References (${MORPH_REFS.length})`,
    body: (
      <>
        <p>Key reviews to start with: <Cite ids={KEY_REVIEWS.join(' ')} />. All DOIs checked against Crossref.</p>
        <RefList refs={MORPH_REFS} />
      </>
    ),
  },
]

export default function MorphologyKnowledge() {
  return (
    <KnowledgeSections
      id="morph-knowledge"
      title="Morphology: theory, methods and literature"
      intro={<p>A literature-based guide to how crystal shape is predicted and measured, with plots redrawn only from published numbers.</p>}
      sections={sections}
    />
  )
}
