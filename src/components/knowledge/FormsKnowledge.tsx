import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FORMS_REFS } from '../../data/literature/refs'
import { phSolubilityBase, saltProbability } from '../../data/forms/models'
import { Eq, Figure, KnowledgeSections, RefList, makeCite, type KSection } from './Knowledge'
import { LineChart, palette } from './Charts'

const Cite = makeCite(FORMS_REFS)
const KEY_REVIEWS = ['cruzcabeza15', 'aitipamula12', 'healy17', 'serajuddin07', 'schultheiss09', 'kuminek16', 'dengale16', 'price14']

function DpkaPlot() {
  const series = useMemo(() => [{ label: 'P(ionised) = 17·ΔpKa + 28 % (fit range −1 … 4)', color: palette(0), pts: Array.from({ length: 51 }, (_, i) => { const d = -1 + i / 10; return [d, 100 * saltProbability(d)] as [number, number] }) }], [])
  return <LineChart ariaLabel="Probability of salt formation versus delta pKa" series={series} xLabel="ΔpKa = pKa(BH⁺) − pKa(HA)" yLabel="% ionised complexes" xr={[-2, 6]} yr={[0, 100]} />
}

function PhPlot() {
  const series = useMemo(() => {
    const pts = (f: (pH: number) => number) => Array.from({ length: 101 }, (_, i) => { const pH = 1 + i * 0.08; return [pH, Math.log10(f(pH))] as [number, number] })
    return [
      { label: 'observed S (lower envelope)', color: palette(0), pts: pts((pH) => phSolubilityBase(pH, 7, 0.01, 1).S) },
      { label: 'free-base-limited', color: palette(1), dash: true, pts: pts((pH) => phSolubilityBase(pH, 7, 0.01, 1).base) },
      { label: 'salt-limited', color: palette(2), dash: true, pts: pts((pH) => phSolubilityBase(pH, 7, 0.01, 1).salt) },
    ]
  }, [])
  return <LineChart ariaLabel="pH-solubility profile of a base and its salt" series={series} xLabel="pH" yLabel="log₁₀ S (mg/mL)" xr={[1, 9]} yr={[-2.5, 2]} />
}

const cod = (id: string, label: string) => <Link to={`/cif/cod/${id}`}>{label}</Link>

const sections: KSection[] = [
  {
    id: 'forms-poly',
    title: '1 · Polymorphs and their thermodynamics',
    body: (
      <>
        <p>Polymorphs are crystal structures of the same compound. They differ in solubility, stability, mechanical properties and bioavailability <Cite ids="bernstein20 cruzcabeza15 lee11" />. Solubility ratios between polymorphs are usually below 2, but larger ratios occur <Cite ids="pudipeddi05" />. A pair is <em>enantiotropic</em> when a transition temperature lies below the melting points, and <em>monotropic</em> when one form is stable at all temperatures. The Burger–Ramberger rules (heat-of-transition, heat-of-fusion, density, IR) diagnose which case applies from DSC data <Cite ids="burger79" />.</p>
        <Eq>ΔG<sub>i→liq</sub>(T) ≈ ΔH<sub>f,i</sub>(1 − T/T<sub>m,i</sub>)   ⇒   T<sub>t</sub> where the two lines cross</Eq>
        <p>Polymorphism is not only organic. Try {cod('1010962', 'calcite')} vs {cod('2100187', 'aragonite')}, {cod('9009083', 'rutile')} vs {cod('9009086', 'anatase')}, {cod('9008564', 'diamond')} vs {cod('9011577', 'graphite')}, and {cod('1011195', 'wurtzite')} vs {cod('1100043', 'sphalerite')} in Lattice Lab.</p>
      </>
    ),
  },
  {
    id: 'forms-conf',
    title: '2 · Conformational polymorphism and disappearing forms',
    body: (
      <p>Flexible molecules can pack in different conformations. ROY has more than ten solved polymorphs that differ mainly in one torsion <Cite ids="yu10 cruzcabeza14" />. Ritonavir is the classic late-appearing stable form, with a different conformer and hydrogen-bond motif <Cite ids="bauer01" />. "Disappearing polymorphs", where a form becomes hard to make once a more stable one has nucleated, are now understood in terms of seeding and kinetics <Cite ids="dunitz95 bucar15" />. Development case studies show how late changes to the solid form are found and managed <Cite ids="newman16" />.</p>
    ),
  },
  {
    id: 'forms-hydrates',
    title: '3 · Hydrates and solvates',
    body: (
      <>
        <p>A large share of APIs form hydrates or solvates <Cite ids="griesser06 healy17" />. Morris et al. classify hydrates by structure: isolated-site, channel and ion-associated <Cite ids="morris01" />. <strong>Stoichiometric</strong> (isolated-site) hydrates have a fixed water content and convert at a critical water activity. <strong>Non-stoichiometric</strong> (channel) hydrates take up and lose water continuously with RH while the lattice persists <Cite ids="khankari95 braun16" />. Dehydration kinetics were followed early for theophylline and ampicillin hydrates <Cite ids="shefter73" />.</p>
        <Eq>hydrate stable ⇔ a<sub>w</sub> &gt; a<sub>w,c</sub>(T);   ΔG = nRT ln(a<sub>w,c</sub>/a<sub>w</sub>)</Eq>
      </>
    ),
  },
  {
    id: 'forms-salts',
    title: '4 · Salts: ΔpKa, counterions and pHmax',
    body: (
      <>
        <p>Roughly half of marketed drugs are salts. Salt formation raises dissolution rate and solubility, and counterion choice trades solubility against hygroscopicity, stability and processability <Cite ids="serajuddin07 bastin00 elder13" />. The ΔpKa rule predicts proton transfer. In the CSD the fraction of ionised acid–base complexes rises linearly between ΔpKa −1 and 4 <Cite ids="cruzcabeza12" />, and the salt–cocrystal continuum is a structural, not only a pKa, question <Cite ids="childs07" />.</p>
        <Figure id="plot-dpka" title="Salt vs cocrystal: share of ionised complexes in the CSD" source={<>Published empirical relation from several thousand CSD acid–base complexes (Cruz-Cabeza 2012) <Cite ids="cruzcabeza12" />, drawn only over its fitted range.</>}>
          <DpkaPlot />
        </Figure>
        <p>For a base, solubility follows the free-base curve above pH<sub>max</sub> and the salt curve below. pH<sub>max</sub> = pKa + log(S₀/S<sub>salt</sub>) marks where the salt can disproportionate <Cite ids="kramer72 serajuddin07" />.</p>
        <Figure id="plot-ph" title="pH–solubility profile of a base (pKa 7, S₀ 0.01 mg/mL) and its salt (1 mg/mL)" source={<>Model curves, not data, from the Kramer–Flynn equations <Cite ids="kramer72" />. Here pH<sub>max</sub> = 5.</>}>
          <PhPlot />
        </Figure>
      </>
    ),
  },
  {
    id: 'forms-cocrystals',
    title: '5 · Cocrystals and ionic cocrystals',
    body: (
      <p>Cocrystals combine an API with a neutral coformer in one lattice <Cite ids="almarsson04 aitipamula12" />. Design uses supramolecular synthons <Cite ids="desiraju95" /> and Etter's hydrogen-bond rules and graph sets <Cite ids="etter90" />, with "molecular sense" in ranking donors and acceptors <Cite ids="aakeroy05" />. CSD-based screening uses molecular complementarity <Cite ids="fabian09" /> and hydrogen-bond propensity <Cite ids="galek07 groom16" />. Solubility is set by a solubility product, which explains the phase-solubility and ternary diagrams <Cite ids="nehm06" />. The eutectic constant K<sub>eu</sub> predicts the solubility advantage <Cite ids="good09" />, and reviews cover properties and delivery <Cite ids="schultheiss09 thakuria13 kuminek16" />. Ionic cocrystals combine a salt with a neutral component, as in the etiracetam and levetiracetam ionic cocrystals with inorganic salts <Cite ids="braga19" />.</p>
    ),
  },
  {
    id: 'forms-amorphous',
    title: '6 · Amorphous, ASDs and co-amorphous systems',
    body: (
      <p>Amorphous solids lack long-range order and have higher free energy, and so higher apparent solubility, but they tend to crystallise <Cite ids="hancock97 yu01" />. Amorphous solid dispersions in polymers produce supersaturation, and liquid–liquid phase separation sets its upper limit <Cite ids="taylor16" />. Co-amorphous systems stabilise the drug with small molecules such as amino acids instead <Cite ids="lobmann13 dengale16" />.</p>
    ),
  },
  {
    id: 'forms-eutectics',
    title: '7 · Eutectics and mesophases',
    body: (
      <p>When two components do not cocrystallise they can form a eutectic: a phase-separated mixture with a lowered melting point and often faster dissolution <Cite ids="cherukuvada14" />. Mesophases lie between crystal and liquid. Liquid crystals have orientational order without full positional order, and plastic and condis crystals keep positions but disorder orientation or conformation. Classification of solid forms by order and composition is discussed in <Cite ids="healy17 cruzcabeza15" />.</p>
    ),
  },
  {
    id: 'forms-screening',
    title: '8 · Screening, prediction and risk',
    body: (
      <p>Crystal structure prediction now routinely finds the experimental forms of drug-like molecules among its low-energy candidates <Cite ids="price14" />, as tracked by the sixth and seventh CCDC blind tests <Cite ids="reilly16 hunnisett24" />. Form screens combine solvent, temperature, slurry and grinding experiments with informatics-based risk assessment <Cite ids="galek07 lee11" />.</p>
    ),
  },
  {
    id: 'forms-refs',
    title: `References (${FORMS_REFS.length})`,
    body: (
      <>
        <p>Key reviews to start with: <Cite ids={KEY_REVIEWS.join(' ')} />. All DOIs checked against Crossref.</p>
        <RefList refs={FORMS_REFS} />
      </>
    ),
  },
]

export default function FormsKnowledge() {
  return (
    <KnowledgeSections
      id="forms-knowledge"
      title="Solid forms: concepts and literature"
      intro={<p>A literature guide to polymorphs, hydrates and solvates, salts, cocrystals, amorphous forms and their relatives. Plots show a published empirical relation or clearly labelled model curves.</p>}
      sections={sections}
    />
  )
}
