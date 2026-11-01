import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import FormsKnowledge from '../components/knowledge/FormsKnowledge'
import { FormsLogo } from '../components/brand/SectionLogos'
import { LineChart, palette } from '../components/knowledge/Charts'
import {
  classify, cocrystalEutectics, criticalAw, gRel, heatOfFusionRule, hydrationDG, phSolubilityBase, pHmax,
  saltProbability, transitionT,
} from '../data/forms/models'

const grid = (a: number, b: number, n = 101) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1))
function Slider({ id, label, value, min, max, step, onChange }: { id: string; label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <>
      <label className="teach-slider-label" htmlFor={id}>{label}</label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </>
  )
}

function DpkaWidget() {
  const uid = useId()
  const [acid, setAcid] = useState(4.2)
  const [base, setBase] = useState(5.2)
  const d = base - acid
  const c = classify(d)
  const text = { cocrystal: 'Cocrystal expected (no proton transfer).', continuum: 'Salt–cocrystal continuum: outcome depends on the crystal environment.', salt: 'Salt expected (proton transfer).' }[c]
  return (
    <div className="teach-panel" data-widget="dpka">
      <h3>ΔpKa classifier</h3>
      <Slider id={`${uid}-a`} label={`Acid pKa (HA) · ${acid.toFixed(1)}`} value={acid} min={-2} max={12} step={0.1} onChange={setAcid} />
      <Slider id={`${uid}-b`} label={`Base pKa (BH⁺) · ${base.toFixed(1)}`} value={base} min={-2} max={12} step={0.1} onChange={setBase} />
      <p className={`forms-verdict forms-${c}`} data-out="dpka">ΔpKa = {d.toFixed(1)} → <strong>{text}</strong>{c === 'continuum' && ` About ${Math.round(saltProbability(d) * 100)} % of CSD complexes in this range are ionised (Cruz-Cabeza 2012).`}</p>
      <p className="teach-caption">Try benzoic acid (4.2) with pyridine (5.2), or with a strong base such as an aliphatic amine (~10.6).</p>
    </div>
  )
}

function PhWidget() {
  const uid = useId()
  const [pKa, setPKa] = useState(7)
  const [lS0, setLS0] = useState(-2)
  const [lSs, setLSs] = useState(0)
  const S0 = 10 ** lS0, Ss = 10 ** lSs
  const pm = pHmax(pKa, S0, Ss)
  const pts = (k: 'S' | 'base' | 'salt') => grid(1, 11, 121).map((pH) => [pH, Math.log10(phSolubilityBase(pH, pKa, S0, Ss)[k])] as [number, number])
  const series = [
    { label: 'observed S', color: palette(0), pts: pts('S') },
    { label: 'free-base-limited', color: palette(1), dash: true, pts: pts('base') },
    { label: 'salt-limited', color: palette(2), dash: true, pts: pts('salt') },
  ]
  return (
    <div className="teach-panel" data-widget="ph-solubility">
      <h3>pH–solubility of a basic drug and its salt</h3>
      <LineChart ariaLabel="pH solubility profile" series={series} xLabel="pH" yLabel="log₁₀ S" xr={[1, 11]} yr={[lS0 - 0.5, lSs + 3]} h={240} />
      <Slider id={`${uid}-p`} label={`pKa · ${pKa.toFixed(1)}`} value={pKa} min={3} max={10} step={0.1} onChange={setPKa} />
      <Slider id={`${uid}-s0`} label={`log S₀ (free base) · ${lS0.toFixed(1)}`} value={lS0} min={-4} max={0} step={0.1} onChange={(v) => { setLS0(v); if (lSs < v) setLSs(v) }} />
      <Slider id={`${uid}-ss`} label={`log S (salt) · ${lSs.toFixed(1)}`} value={lSs} min={lS0} max={2} step={0.1} onChange={setLSs} />
      <p className="teach-caption" data-out="phmax">pH<sub>max</sub> = pKa + log(S₀/S<sub>salt</sub>) = <strong>{pm.toFixed(2)}</strong>. Below it the salt is the stable solid; above it the salt can disproportionate to the free base. Model (Kramer &amp; Flynn 1972).</p>
    </div>
  )
}

function HydrateWidget() {
  const uid = useId()
  const [awRef, setAwRef] = useState(0.3)
  const [dH, setDH] = useState(50)
  const [n, setN] = useState(1)
  const [T, setT] = useState(25)
  const [rh, setRh] = useState(50)
  const awc = criticalAw(T, awRef, dH, n)
  const dG = hydrationDG(rh / 100, awc, T, n)
  const series = [{ label: 'critical a_w (model)', color: palette(0), pts: grid(0, 80, 81).map((t) => [t, Math.min(1.2, criticalAw(t, awRef, dH, n))] as [number, number]) },
    { label: 'your condition', color: palette(2), pts: [[T - 1.5, rh / 100], [T + 1.5, rh / 100]] as [number, number][] }]
  return (
    <div className="teach-panel" data-widget="hydrate">
      <h3>Hydrate stability vs water activity / RH</h3>
      <LineChart ariaLabel="Critical water activity versus temperature" series={series} xLabel="T (°C)" yLabel="a_w (= RH/100)" xr={[0, 80]} yr={[0, 1]} h={240} />
      <Slider id={`${uid}-awr`} label={`Critical a_w at 25 °C · ${awRef.toFixed(2)}`} value={awRef} min={0.05} max={0.9} step={0.01} onChange={setAwRef} />
      <Slider id={`${uid}-dh`} label={`Dehydration enthalpy · ${dH} kJ/mol`} value={dH} min={10} max={120} step={5} onChange={setDH} />
      <Slider id={`${uid}-n`} label={`Waters per formula n · ${n}`} value={n} min={0.5} max={4} step={0.5} onChange={setN} />
      <Slider id={`${uid}-t`} label={`Temperature · ${T} °C`} value={T} min={0} max={80} step={1} onChange={setT} />
      <Slider id={`${uid}-rh`} label={`RH (or solvent a_w) · ${rh} %`} value={rh} min={0} max={100} step={1} onChange={setRh} />
      <p className="teach-caption" data-out="hydrate">a<sub>w,c</sub>({T} °C) = {awc.toFixed(2)} · ΔG<sub>hydration</sub> = {dG.toFixed(2)} kJ/mol → <strong>{dG < 0 ? 'hydrate stable' : 'anhydrate stable'}</strong>. Isolated-site hydrates switch sharply at a<sub>w,c</sub>. Channel hydrates take up water gradually instead. Model with illustrative parameters.</p>
    </div>
  )
}

function BurgerWidget() {
  const uid = useId()
  const [TmA, setTmA] = useState(450)
  const [HA, setHA] = useState(28)
  const [TmB, setTmB] = useState(440)
  const [HB, setHB] = useState(32)
  const A = { Tm: TmA, dHf: HA }, B = { Tm: TmB, dHf: HB }
  const Tt = transitionT(A, B)
  const rule = heatOfFusionRule(A, B)
  const lo = 250, hi = Math.max(TmA, TmB) + 10
  const series = [
    { label: 'form I: G − G_liq', color: palette(0), pts: grid(lo, TmA, 60).map((T) => [T, gRel(A, T)] as [number, number]) },
    { label: 'form II: G − G_liq', color: palette(1), pts: grid(lo, TmB, 60).map((T) => [T, gRel(B, T)] as [number, number]) },
    { label: 'liquid (reference)', color: palette(4), dash: true, pts: [[lo, 0], [hi, 0]] as [number, number][] },
  ]
  const ymin = Math.min(gRel(A, lo), gRel(B, lo))
  return (
    <div className="teach-panel" data-widget="burger">
      <h3>Burger–Ramberger explorer (E/G diagram)</h3>
      <LineChart ariaLabel="Free energy versus temperature for two polymorphs" series={series} xLabel="T (K)" yLabel="G − G_liq (kJ/mol)" xr={[lo, hi]} yr={[Math.floor(ymin), 1]} h={240} />
      <Slider id={`${uid}-ta`} label={`Form I T_m · ${TmA} K`} value={TmA} min={300} max={600} step={1} onChange={setTmA} />
      <Slider id={`${uid}-ha`} label={`Form I ΔH_f · ${HA} kJ/mol`} value={HA} min={5} max={60} step={0.5} onChange={setHA} />
      <Slider id={`${uid}-tb`} label={`Form II T_m · ${TmB} K`} value={TmB} min={300} max={600} step={1} onChange={setTmB} />
      <Slider id={`${uid}-hb`} label={`Form II ΔH_f · ${HB} kJ/mol`} value={HB} min={5} max={60} step={0.5} onChange={setHB} />
      <p className="teach-caption" data-out="burger">Heat-of-fusion rule: <strong>{rule}</strong> (the higher-melting form has the {rule === 'enantiotropic' ? 'lower' : 'higher'} ΔH<sub>f</sub>). Linear-ΔG estimate of T<sub>t</sub>: {Number.isFinite(Tt) && Tt > 0 ? `${Tt.toFixed(0)} K` : 'none'}{Number.isFinite(Tt) && Tt > 0 && Tt < Math.min(TmA, TmB) ? ' (below both melting points, consistent with enantiotropy)' : ' (no crossing below melting, consistent with monotropy)'}. Model; real ΔC<sub>p</sub> terms shift T<sub>t</sub>.</p>
    </div>
  )
}

function CocrystalWidget() {
  const uid = useId()
  const [SA, setSA] = useState(10)
  const [SB, setSB] = useState(200)
  const [lK, setLK] = useState(2.5)
  const Ksp = 10 ** lK
  const r = cocrystalEutectics(SA, SB, Ksp)
  const series = useMemo(() => {
    const s: { label: string; color: string; dash?: boolean; pts: [number, number][] }[] = [
      { label: 'cocrystal solubility [A]=Ksp/[B]', color: palette(0), pts: grid(Math.max(1, Ksp / SA / 2), SB, 120).map((b) => [b, Ksp / b] as [number, number]) },
      { label: 'drug A solubility', color: palette(1), dash: true, pts: [[0, SA], [SB, SA]] },
      { label: 'coformer B solubility', color: palette(2), dash: true, pts: [[SB, 0], [SB, SA * 2]] },
    ]
    return s
  }, [SA, SB, Ksp])
  return (
    <div className="teach-panel" data-widget="cocrystal">
      <h3>Cocrystal phase-solubility explorer (1:1)</h3>
      <LineChart ariaLabel="Cocrystal phase solubility diagram" series={series} xLabel="[coformer B] (mM)" yLabel="[drug A] (mM)" xr={[0, SB * 1.1]} yr={[0, SA * 2]} h={240} />
      <Slider id={`${uid}-sa`} label={`Drug solubility S_A · ${SA} mM`} value={SA} min={1} max={50} step={1} onChange={setSA} />
      <Slider id={`${uid}-sb`} label={`Coformer solubility S_B · ${SB} mM`} value={SB} min={20} max={1000} step={10} onChange={setSB} />
      <Slider id={`${uid}-k`} label={`log Ksp · ${lK.toFixed(1)}`} value={lK} min={0} max={4} step={0.1} onChange={setLK} />
      <p className="teach-caption" data-out="cocrystal">Eutectic E1 (cocrystal + A): [A] = {r.E1.A.toFixed(1)}, [B] = {r.E1.B.toFixed(1)} mM · K<sub>eu</sub> = {r.Keu.toFixed(2)} → cocrystal {r.Keu > 1 ? <strong>more soluble than the drug (it transforms in pure solvent; needs excess coformer)</strong> : <strong>less soluble than the drug (stable in pure solvent)</strong>}. {r.exists ? 'Both eutectics exist: a stable cocrystal region is present.' : 'No stable cocrystal region at these values.'} Stoichiometric solubility √Ksp = {r.Scc.toFixed(1)} mM. Model (Nehm et al. 2006; Good &amp; Rodríguez-Hornedo 2009).</p>
    </div>
  )
}

export default function FormsPage() {
  return (
    <div className="teach-page forms-page proc-page">
      <header className="teach-hero">
        <p className="eyebrow">Solid state · materials science</p>
        <h1 className="lattice-lab-title">
          <FormsLogo size={30} className="lattice-lab-logo" />
          Solid forms
        </h1>
        <p className="teach-lead">Polymorphs, hydrates and solvates, salts, cocrystals, amorphous and co-amorphous systems, eutectics and mesophases. Interactive tools cover the rules used to choose between them, followed by a referenced literature review.</p>
      </header>
      <aside className="teach-callout teach-callout-warn" role="note">
        <p className="teach-callout-title">Disclaimer</p>
        <p>The ΔpKa relation is a published CSD statistic. All other widgets are textbook models with illustrative parameters, not measurements for a specific compound.</p>
      </aside>
      <section className="teach-section" aria-labelledby="forms-ideas">
        <h2 id="forms-ideas">Ideas in brief</h2>
        <ul className="teach-bullets">
          <li><strong>One molecule, many solids:</strong> packing (polymorphs), composition (hydrates, solvates, salts, cocrystals) and order (amorphous, mesophases) all change properties.</li>
          <li><strong>Thermodynamics decides stability</strong> (T, a<sub>w</sub>, pH, coformer activity); <strong>kinetics decides what you get first.</strong></li>
          <li>Try the examples in <Link to="/cif">Lattice Lab</Link>: <Link to="/cif/cod/1010962">calcite</Link> / <Link to="/cif/cod/2100187">aragonite</Link>, <Link to="/cif/cod/9009083">rutile</Link> / <Link to="/cif/cod/9009086">anatase</Link>, and the hydrate <Link to="/cif/cod/9012596">baylissite</Link>.</li>
        </ul>
      </section>
      <section className="teach-section teach-interactive" aria-labelledby="forms-salt">
        <h2 id="forms-salt">Interactive · salt or cocrystal, and pH<sub>max</sub></h2>
        <div className="teach-grid-2"><DpkaWidget /><PhWidget /></div>
      </section>
      <section className="teach-section teach-interactive" aria-labelledby="forms-stab">
        <h2 id="forms-stab">Interactive · polymorph and hydrate stability</h2>
        <div className="teach-grid-2"><BurgerWidget /><HydrateWidget /></div>
      </section>
      <section className="teach-section teach-interactive" aria-labelledby="forms-cc">
        <h2 id="forms-cc">Interactive · cocrystal phase diagram</h2>
        <div className="teach-grid-2"><CocrystalWidget />
          <div className="teach-panel"><p className="teach-caption">Read the diagram like a ternary phase diagram projected onto the drug and coformer axes. Above the hyperbola the solution is supersaturated with cocrystal. Above the dashed drug line, drug crystallises. The two eutectic points bound the region where cocrystal is the only stable solid, which is where to run slurry screening and reaction crystallization.</p></div>
        </div>
      </section>
      <FormsKnowledge />
      <footer className="teach-footer">
        <p>Teaching models only. Not calibrated to a specific compound.</p>
        <p><Link to="/process">Process</Link>{' · '}<Link to="/kinetics">Kinetics</Link>{' · '}<Link to="/morphology">Morphology</Link>{' · '}<Link to="/cif">Lattice Lab</Link>{' · '}<Link to="/">Home</Link></p>
      </footer>
    </div>
  )
}
