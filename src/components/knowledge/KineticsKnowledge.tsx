import { useMemo } from 'react'
import { KINETICS_REFS } from '../../data/literature/refs'
import { AVRAMI_CASES, CNT_AB, avrami, cntRate } from '../../data/literature/publishedData'
import { Eq, Figure, KnowledgeSections, RefList, makeCite, type KSection } from './Knowledge'
import { LineChart, palette } from './Charts'

const Cite = makeCite(KINETICS_REFS)
const KEY_REVIEWS = ['kashchiev03', 'sosso16', 'deyoreo15', 'vekilov10', 'erdemir09', 'gebauer14', 'thanh14', 'ramkrishna14']

function CntPlot() {
  const series = useMemo(
    () =>
      CNT_AB.map((p, i) => ({
        label: `${p.system} (A=${p.A.toExponential(2)}, B=${p.B})`,
        color: palette(i),
        dash: i >= 5,
        pts: Array.from({ length: 81 }, (_, k) => {
          const S = 1.05 + (k * (3 - 1.05)) / 80
          const J = cntRate(p.A, p.B, S)
          return [S, J > 0 ? Math.log10(J) : -Infinity] as [number, number]
        }),
      })),
    [],
  )
  return <LineChart ariaLabel="log10 nucleation rate versus supersaturation ratio for nine systems" series={series} xLabel="supersaturation ratio S" yLabel="log₁₀ J  (m⁻³ s⁻¹)" xr={[1, 3]} yr={[0, 6]} />
}

function LinearisedPlot() {
  const series = useMemo(
    () =>
      CNT_AB.map((p, i) => ({
        label: p.system,
        color: palette(i),
        dash: i >= 5,
        pts: Array.from({ length: 41 }, (_, k) => {
          const x = (k * 10) / 40
          return [x, Math.log(p.A) - p.B * x] as [number, number]
        }),
      })),
    [],
  )
  return <LineChart ariaLabel="ln(J/S) versus 1/ln²S straight lines" series={series} xLabel="1 / ln²S" yLabel="ln(J/S)" xr={[0, 10]} yr={[-40, 15]} />
}

function AvramiPlot() {
  const series = AVRAMI_CASES.map((c, i) => ({
    label: c.label,
    color: palette(i),
    pts: Array.from({ length: 101 }, (_, k) => [k * 0.03, avrami(k * 0.03, 1, c.n)] as [number, number]),
  }))
  return <LineChart ariaLabel="JMAK transformed fraction versus time for n from 1 to 4" series={series} xLabel="k·t" yLabel="transformed fraction X" xr={[0, 3]} yr={[0, 1]} />
}

const sections: KSection[] = [
  {
    id: 'kin-cnt',
    title: '1 · Classical nucleation theory',
    body: (
      <>
        <p>
          CNT treats a nucleus as a small piece of bulk crystal with a sharp interface. The
          work to form a cluster of n molecules balances a bulk gain against a surface
          penalty. For a sphere, the barrier and critical radius are <Cite ids="kashchiev03 sear07 karthika16" />:
        </p>
        <Eq>ΔG* = 16πγ³v² / (3(kT ln S)²), &nbsp;&nbsp; r* = 2γv / (kT ln S)</Eq>
        <p>The stationary rate is then usually written</p>
        <Eq>J = A S exp(−B / ln²S), &nbsp;&nbsp; B = 16πγ³v² / (3(kT)³)</Eq>
        <p>
          A is the kinetic (pre-exponential) factor and B the thermodynamic factor. Measured A
          values for solution nucleation are often 10³–10⁶ m⁻³ s⁻¹, many orders below the
          theoretical 10¹⁵–10²⁵ m⁻³ s⁻¹, a sign of heterogeneous nucleation on a few active
          sites <Cite ids="jiang11 brandel15" />. Simulations show CNT can describe the size
          and shape of critical nuclei well once the interfacial free energy is computed
          consistently <Cite ids="cheng17 auer01" />.
        </p>
      </>
    ),
  },
  {
    id: 'kin-nonclassical',
    title: '2 · Two-step nucleation and prenucleation clusters',
    body: (
      <ul>
        <li>
          <strong>Two-step nucleation.</strong> Order develops inside a dense liquid-like
          precursor rather than directly from solution. This was first predicted for
          proteins near a metastable critical point <Cite ids="tenwolde97" /> and is supported
          by experiments on proteins and small molecules
          <Cite ids="vekilov04 vekilov10 erdemir09" />. Lutsko gave a unified pathway theory <Cite ids="lutsko19" />.
        </li>
        <li>
          <strong>Prenucleation clusters (PNCs).</strong> Stable solute clusters exist in
          undersaturated and supersaturated CaCO₃ solutions before nucleation
          <Cite ids="gebauer08 gebauer14" />. Cryo-TEM shows template-controlled pathways
          through amorphous intermediates <Cite ids="pouget09" />.
        </li>
        <li>
          <strong>Particle attachment and multistep pathways.</strong> These are found in
          synthetic, biogenic and geologic systems <Cite ids="deyoreo15 vandriessche18" />, and
          liquid-cell TEM shows multistep nucleation of nanocrystals <Cite ids="nielsen14 loh17" />.
        </li>
      </ul>
    ),
  },
  {
    id: 'kin-msz',
    title: '3 · Induction time and metastable zone width',
    body: (
      <>
        <p>
          Nucleation is stochastic. With J constant in a volume V, the probability that at
          least one crystal has been detected by time t is <Cite ids="jiang11 brandel15" />
        </p>
        <Eq>P(t) = 1 − exp(−J V (t − t<sub>g</sub>))</Eq>
        <p>
          Here t<sub>g</sub> is the time to grow to a detectable size. Fitting hundreds of
          induction times in small stirred vials gives J at each S. The metastable zone width
          (MSZW), the undercooling reached before detection at a given cooling rate, is
          analysed with Nývlt's approach and Kubota's reinterpretation
          <Cite ids="nyvlt68 kubota08" />. It is measured routinely with FBRM
          <Cite ids="barrett02" />.
        </p>
      </>
    ),
  },
  {
    id: 'kin-growth',
    title: '4 · Growth mechanisms',
    body: (
      <>
        <ul>
          <li><strong>Spiral (BCF) growth</strong> at screw dislocations: R ∝ σ² at low σ, becoming linear at high σ <Cite ids="bcf51 deyoreo03" />.</li>
          <li><strong>Birth-and-spread (2D nucleation)</strong>: an exponential onset, R ∝ σ<sup>5/6</sup> exp(−K/σ) <Cite ids="deyoreo03" />.</li>
          <li><strong>Rough (continuous) growth</strong> above the roughening transition: R ∝ σ.</li>
        </ul>
        <p>The schematic curves at the top of this page illustrate these regimes.</p>
      </>
    ),
  },
  {
    id: 'kin-overall',
    title: '5 · Overall kinetics: JMAK, ripening, population balances',
    body: (
      <>
        <h4>Avrami / JMAK</h4>
        <Eq>X(t) = 1 − exp(−(k t)<sup>n</sup>)</Eq>
        <p>
          The Avrami exponent n reflects growth dimensionality and nucleation mode, e.g. n = 4
          for 3D growth with constant nucleation rate and n = 3 for 3D growth from pre-existing
          sites <Cite ids="avrami39 avrami40 avrami41" />.
        </p>
        <h4>Ostwald ripening (LSW)</h4>
        <p>
          Under diffusion control the mean radius coarsens as r̄³ − r̄₀³ ∝ t, and the size
          distribution tends to a universal shape <Cite ids="lifshitz61 wagner61" />. Burst
          nucleation followed by diffusion-limited growth (LaMer) is the classic route to
          monodisperse particles <Cite ids="lamer50 thanh14" />.
        </p>
        <h4>Population balance modelling</h4>
        <Eq>∂n/∂t + ∂(G n)/∂L = B<sub>0</sub> δ(L − L<sub>0</sub>) + (aggregation, breakage)</Eq>
        <p>
          Here n(L, t) is the number density in crystal size L, G the growth rate and B₀ the
          nucleation rate. PBMs are the basis of crystalliser design and control
          <Cite ids="hulburt64 ramkrishna02 ramkrishna14 nagy12" />.
        </p>
      </>
    ),
  },
  {
    id: 'kin-polymorph',
    title: '6 · Polymorph kinetics and the Ostwald rule of stages',
    body: (
      <p>
        Ostwald observed that the least stable form often crystallises first and then
        transforms stepwise <Cite ids="ostwald1897" />. The rule has structural and
        thermodynamic explanations and many exceptions <Cite ids="threlfall03" />. Which
        polymorph nucleates is set by relative barriers, solvent–cluster interactions and
        precursor structure <Cite ids="davey13 vandriessche18 brandel15" />.
      </p>
    ),
  },
  {
    id: 'kin-methods',
    title: '7 · Experimental and simulation methods',
    body: (
      <ul>
        <li><strong>Process analytics (PAT):</strong> FBRM chord-length counts, PVM imaging, ATR-FTIR/UV for concentration, used in feedback control <Cite ids="barrett02 nagy12" />.</li>
        <li><strong>In situ XRD / SAXS / WAXS:</strong> time-resolved phase and size evolution during formation <Cite ids="pienack11 pouget09" />.</li>
        <li><strong>Liquid-cell TEM:</strong> single-particle growth trajectories and nucleation pathways <Cite ids="zheng09 nielsen14 loh17" />.</li>
        <li><strong>Molecular simulation:</strong> brute-force MD reaches nucleation only at high driving force, so rare-event methods are used <Cite ids="anwar11 sosso16" />:
          <ul>
            <li>metadynamics <Cite ids="laio02 salvalaglio15" /></li>
            <li>seeding <Cite ids="espinosa16" /></li>
            <li>forward-flux sampling <Cite ids="allen05" /></li>
          </ul>
        </li>
      </ul>
    ),
  },
  {
    id: 'kin-frontiers',
    title: '8 · Frontiers',
    body: (
      <ul>
        <li><strong>Machine learning:</strong> deep-learning order parameters identify local crystal structure in simulations of nucleation <Cite ids="defever19" />. Data-driven process control builds on PAT data <Cite ids="nagy12" />.</li>
        <li><strong>Microfluidics:</strong> thousands of nanolitre droplets give nucleation statistics and screening <Cite ids="leng09" />.</li>
        <li><strong>Confinement:</strong> nanopores and droplets change the polymorph, stabilise metastable forms and alter rates <Cite ids="jiangward14 meldrum20" />.</li>
        <li><strong>Nonclassical pathways:</strong> PNCs, dense liquids and particle attachment <Cite ids="deyoreo15 gebauer14 lutsko19" />.</li>
      </ul>
    ),
  },
  {
    id: 'kin-results',
    title: '9 · Published results and plots',
    body: (
      <>
        <Figure
          id="plot-cnt-rates"
          title="Nucleation rate J(S) for nine organic systems"
          source={<>Curves computed from J = A·S·exp(−B/ln²S) using the fitted A and B in Brandel &amp; ter Horst 2015, Table 2 <Cite ids="brandel15" /> (m-ABA and L-His values from Jiang &amp; ter Horst 2011 <Cite ids="jiang11" />). Computed from published parameters; curves extend beyond each measured S range, so treat the extrapolated parts with care.</>}
        >
          <CntPlot />
        </Figure>
        <Figure
          id="plot-cnt-linear"
          title="The same data in the CNT linearisation: ln(J/S) = ln A − B / ln²S"
          source={<>Straight lines with intercept ln A and slope −B from Brandel &amp; ter Horst 2015, Table 2 <Cite ids="brandel15" />. Computed from published parameters.</>}
        >
          <LinearisedPlot />
        </Figure>
        <table className="know-table" data-plot="table-cnt">
          <thead><tr><th>System</th><th>A (m⁻³ s⁻¹)</th><th>B</th></tr></thead>
          <tbody>
            {CNT_AB.map((p) => (
              <tr key={p.system}><td>{p.system}</td><td>{p.A.toLocaleString('en-US')}</td><td>{p.B}</td></tr>
            ))}
          </tbody>
        </table>
        <Figure
          id="plot-avrami"
          title="JMAK curves for the theoretical Avrami exponents"
          source={<>Model curves, not experimental data: X = 1 − exp(−(kt)ⁿ) with the classical exponents from Avrami 1939–41 <Cite ids="avrami39 avrami40 avrami41" />.</>}
        >
          <AvramiPlot />
        </Figure>
      </>
    ),
  },
  {
    id: 'kin-refs',
    title: `References (${KINETICS_REFS.length})`,
    body: (
      <>
        <p>Key reviews to start with: <Cite ids={KEY_REVIEWS.join(' ')} />. All DOIs checked against Crossref.</p>
        <RefList refs={KINETICS_REFS} />
      </>
    ),
  },
]

export default function KineticsKnowledge() {
  return (
    <KnowledgeSections
      id="kin-knowledge"
      title="Kinetics: theory, methods and literature"
      intro={<p>A literature-based guide to nucleation and growth kinetics, with plots computed only from published parameters.</p>}
      sections={sections}
    />
  )
}
