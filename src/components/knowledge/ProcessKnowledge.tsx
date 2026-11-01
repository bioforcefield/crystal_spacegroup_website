import { useMemo } from 'react'
import { PROCESS_REFS } from '../../data/literature/refs'
import { SOLUBILITY, coolingT, msmprMass, msmprN, type Profile } from '../../data/process/models'
import { Eq, Figure, KnowledgeSections, RefList, makeCite, type KSection } from './Knowledge'
import { LineChart, palette } from './Charts'

const Cite = makeCite(PROCESS_REFS)
const KEY_REVIEWS = ['garside85', 'rawlings93', 'braatz02', 'nagy12', 'nagy13', 'simon15', 'wood19', 'gao17', 'xiouras22']

function SolubilityData() {
  const series = useMemo(
    () => (Object.keys(SOLUBILITY) as (keyof typeof SOLUBILITY)[]).map((k, i) => ({ label: `${k} in water (handbook data points)`, color: palette(i), pts: SOLUBILITY[k] })),
    [],
  )
  return <LineChart ariaLabel="Solubility of KNO3 and NaCl in water versus temperature" series={series} xLabel="T (°C)" yLabel="g solute / 100 g water" xr={[0, 100]} yr={[0, 250]} />
}

function ProfilesPlot() {
  const series = useMemo(
    () => (['linear', 'natural', 'cubic'] as Profile[]).map((k, i) => ({
      label: k === 'cubic' ? 'controlled (cubic, Mullin–Nývlt)' : k === 'natural' ? 'natural (Newton cooling)' : 'linear',
      color: palette(i),
      dash: k === 'natural',
      pts: Array.from({ length: 51 }, (_, j) => [j / 50, coolingT(k, j / 50, 60, 20)] as [number, number]),
    })),
    [],
  )
  return <LineChart ariaLabel="Three cooling profiles from 60 to 20 °C" series={series} xLabel="normalised batch time θ" yLabel="T (°C)" xr={[0, 1]} yr={[10, 60]} />
}

function MsmprPlot() {
  const series = useMemo(() => {
    const G = 1, taus = [100, 200, 300]
    return taus.flatMap((tau, i) => {
      const max = msmprMass(3 * G * tau, G, tau)
      return [
        { label: `n(L)/n₀, Gτ = ${tau} µm`, color: palette(i), pts: Array.from({ length: 61 }, (_, j) => { const L = j * 25; return [L, msmprN(L, 1, G, tau)] as [number, number] }) },
        { label: `mass density (norm.), Gτ = ${tau} µm`, color: palette(i), dash: true, pts: Array.from({ length: 61 }, (_, j) => { const L = j * 25; return [L, msmprMass(L, G, tau) / max] as [number, number] }) },
      ]
    })
  }, [])
  return <LineChart ariaLabel="MSMPR number and mass distributions" series={series} xLabel="L (µm)" yLabel="normalised density" xr={[0, 1500]} yr={[0, 1]} />
}

const sections: KSection[] = [
  {
    id: 'proc-modes',
    title: '1 · Process modes: cooling, antisolvent, evaporative, reactive, melt',
    body: (
      <>
        <p>Industrial crystallizers generate supersaturation in one of a few ways, and the choice follows from the shape of the solubility curve <Cite ids="garside85 paul05" />. A steep, temperature-sensitive solubility (KNO₃, most APIs in organic solvents) favours <strong>cooling</strong>; a flat curve (NaCl) forces <strong>evaporative</strong> operation, where solvent removal at fixed T concentrates the liquor. <strong>Antisolvent</strong> addition lowers solubility by changing solvent composition and is common for heat-sensitive pharmaceuticals; local supersaturation at the feed point makes it mixing-sensitive <Cite ids="zhou06 woo09" />. <strong>Reactive</strong> crystallization (precipitation) creates the solute by reaction at very high supersaturation, so micromixing sets nucleation and the product size <Cite ids="schwarzer04" />. <strong>Melt</strong> crystallization (layer or suspension) purifies without solvent and is used for bulk organics.</p>
        <p>The pharmaceutical literature frames these choices as "form to function": the process must deliver the right polymorph, purity, size and shape together <Cite ids="variankaval08 gao17 kim03" />.</p>
        <Figure id="plot-solubility" title="Why KNO₃ is cooled and NaCl is evaporated" source={<>Handbook solubility values (CRC Handbook of Chemistry and Physics; Mullin, <em>Crystallization</em>, App. A). Points joined by straight lines; no fitting.</>}>
          <SolubilityData />
        </Figure>
      </>
    ),
  },
  {
    id: 'proc-msz',
    title: '2 · Metastable zone width and seeding',
    body: (
      <>
        <p>Between the solubility curve and the point where spontaneous nucleation is detected lies the metastable zone. Its width depends on cooling rate, volume, agitation, impurities and detection method, so it is a kinetic quantity, not a property of the compound <Cite ids="nyvlt68 kim01 kubota08" />. Nývlt's analysis relates the maximum undercooling to the cooling rate b:</p>
        <Eq>log b = (m − 1)·log(dc*/dT) + log kₙ + m·log ΔT<sub>max</sub></Eq>
        <p>FBRM and turbidity probes make MSZW and solubility measurement routine <Cite ids="barrett02" />. Seeding within the zone suppresses primary nucleation and fixes the polymorph <Cite ids="beckmann00 kitamura09" />. Kubota showed a critical seed loading above which a seeded batch grows only the seeds <Cite ids="kubota01" />, and seed recipes (mass and size distribution) can be optimised for a target CSD <Cite ids="aamir10" />. Ultrasound is an alternative way to trigger nucleation reproducibly <Cite ids="ruecroft05 kim03" />.</p>
      </>
    ),
  },
  {
    id: 'proc-pbm',
    title: '3 · Population balances, scale-up and mixing',
    body: (
      <>
        <p>The population balance <Cite ids="randolph62" /> tracks the number density n(L,t). For the continuous MSMPR crystallizer at steady state with size-independent growth it gives:</p>
        <Eq>n(L) = n₀ · exp(−L / Gτ),   dominant (mass-mode) size L<sub>D</sub> = 3Gτ,   L<sub>4,3</sub> = 4Gτ</Eq>
        <p>Batch and multidimensional problems are solved with high-resolution finite-volume schemes <Cite ids="gunawan04" /> or moment methods (QMOM) <Cite ids="mcgraw97 marchisio03" />. Model identification from batch data is reviewed by Rawlings et al. <Cite ids="rawlings93" />. On scale-up, power per volume and the just-suspended speed (Zwietering) set agitation <Cite ids="zwietering58" />, while feed-point micromixing governs antisolvent and reactive systems <Cite ids="schwarzer04" />. Attrition and breakage in stirred vessels can be followed in-line <Cite ids="kougoulos05" />.</p>
        <Figure id="plot-msmpr" title="MSMPR number density and mass density for three values of Gτ" source={<>Model curves, not data: analytic MSMPR solution <Cite ids="randolph62" />. Dashed curves peak at 3Gτ.</>}>
          <MsmprPlot />
        </Figure>
      </>
    ),
  },
  {
    id: 'proc-pat',
    title: '4 · PAT, QbD and control (SSC, DNC)',
    body: (
      <>
        <p>Process analytical technology underpins quality by design <Cite ids="yu04 yu14 simon15" />. FBRM measures chord-length distributions (inversion to a size distribution needs shape information <Cite ids="agimelen15" />). PVM and in-line imaging give shape, ATR-FTIR and ATR-UV give solution concentration, and Raman follows the solid form <Cite ids="simone14" />.</p>
        <p>Two feedback strategies dominate <Cite ids="braatz02 fujiwara05 nagy12 nagy13" />. <strong>Supersaturation control (SSC)</strong> uses concentration measurement to follow a set-point trajectory in the phase diagram, which is robust to kinetic uncertainty <Cite ids="zhou06 woo09 nagy08" />. <strong>Direct nucleation control (DNC)</strong> uses FBRM counts to drive heating and cooling cycles that dissolve fines <Cite ids="abubakar09 saleemi12" />. Open-loop programmed cooling (cubic profile) is the classical precursor <Cite ids="mullin71" />.</p>
        <Figure id="plot-profiles" title="Cooling profiles: linear, natural and controlled (60 → 20 °C)" source={<>Model curves, not data. The cubic law follows Mullin &amp; Nývlt <Cite ids="mullin71" />. Natural cooling is Newton cooling to a jacket 10 K below the end temperature.</>}>
          <ProfilesPlot />
        </Figure>
      </>
    ),
  },
  {
    id: 'proc-continuous',
    title: '5 · Continuous crystallization',
    body: (
      <p>Continuous options include MSMPR cascades <Cite ids="su15 quon12" />, plug-flow and tubular crystallizers <Cite ids="alvarez10" />, continuous oscillatory baffled crystallizers (COBC) <Cite ids="lawton09" /> and slug-flow crystallizers <Cite ids="jiang14" />. Reviews compare their residence-time distributions, fouling and start-up behaviour <Cite ids="zhang17 wood19" />. Vetter et al. mapped the particle sizes that batch and continuous configurations can reach <Cite ids="vetter14" />, and the MIT end-to-end plant showed crystallization integrated with synthesis and formulation <Cite ids="mascia13" />.</p>
    ),
  },
  {
    id: 'proc-forms',
    title: '6 · Polymorph, solvate and impurity control',
    body: (
      <p>Ritonavir is the standard warning: a more stable polymorph appeared two years after launch, and the product had to be reformulated <Cite ids="bauer01 chemburkar00" />. Polymorph control combines thermodynamic mapping with kinetic tools such as seeding, solvent choice and supersaturation <Cite ids="kitamura09 beckmann00" />, with Raman monitoring of transformations <Cite ids="simone14" />. Impurities can be adsorbed, occluded, included as solid solutions or carried in mother liquor. Urwin et al. give a workflow to diagnose which mechanism applies and how to reject it <Cite ids="urwin20" />.</p>
    ),
  },
  {
    id: 'proc-downstream',
    title: '7 · Downstream: filtration, drying, agglomeration, milling',
    body: (
      <p>Particle size and shape set cake resistance and filtration time <Cite ids="wakeman07" />. Needles filter slowly and break during agitated drying <Cite ids="lekhal04" />. Spherical agglomeration builds dense, free-flowing particles inside the crystallizer <Cite ids="kawashima82" />, while wet milling, sonication and temperature cycling reduce or narrow the size distribution <Cite ids="kim03 ruecroft05" />. Designing upstream for downstream performance is a theme of modern reviews <Cite ids="variankaval08 gao17" />.</p>
    ),
  },
  {
    id: 'proc-frontiers',
    title: '8 · Frontiers: ML, digital twins, templated nucleation',
    body: (
      <p>Machine learning is now used for solubility prediction, image-based size and shape measurement, and surrogate process models <Cite ids="xiouras22" />. Digital twins couple mechanistic PBMs to PAT data streams for monitoring and control <Cite ids="chen20" />. Heterogeneous surfaces and polymers can select nucleation conditions and forms, including surface chemistry, nanopore templating <Cite ids="diao11" /> and polymer-induced heteronucleation <Cite ids="lopezmejias09" />.</p>
    ),
  },
  {
    id: 'proc-refs',
    title: `References (${PROCESS_REFS.length})`,
    body: (
      <>
        <p>Key reviews to start with: <Cite ids={KEY_REVIEWS.join(' ')} />. All DOIs checked against Crossref.</p>
        <RefList refs={PROCESS_REFS} />
      </>
    ),
  },
]

export default function ProcessKnowledge() {
  return (
    <KnowledgeSections
      id="proc-knowledge"
      title="Industrial crystallization: methods and literature"
      intro={<p>A literature guide to crystallization process design, from solubility and metastable zones to PAT, control and continuous manufacturing. Plots show handbook data or clearly labelled model curves.</p>}
      sections={sections}
    />
  )
}
