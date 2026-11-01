import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ProcessKnowledge from '../components/knowledge/ProcessKnowledge'
import { ProcessLogo } from '../components/brand/SectionLogos'
import { LineChart, palette } from '../components/knowledge/Charts'
import {
  coolingT, coolingYield, msmprDominant, msmprMass, msmprMassMean, msmprN, mszw, productSize,
  saturationT, seedMass, solubility, type Profile, type Solute,
} from '../data/process/models'

type Mode = 'cooling' | 'evaporative' | 'antisolvent'
const grid = (a: number, b: number, n = 101) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1))

function Slider({ id, label, value, min, max, step, onChange }: { id: string; label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <>
      <label className="teach-slider-label" htmlFor={id}>{label}</label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </>
  )
}

function PhaseDiagram() {
  const uid = useId()
  const [solute, setSolute] = useState<Solute>('KNO3')
  const [mode, setMode] = useState<Mode>('cooling')
  const [T0, setT0] = useState(60)
  const [rate, setRate] = useState(0.5)
  const [m, setM] = useState(3)
  const [as, setAs] = useState(0.3)
  const dT = mszw(rate, m)
  const c0 = solubility(solute, T0)
  const series = useMemo(() => {
    const Ts = grid(0, 100)
    const s = [
      { label: `solubility ${solute} (handbook)`, color: palette(0), pts: Ts.map((T) => [T, solubility(solute, T)] as [number, number]) },
      { label: `MSZ limit (model, ΔT = ${dT.toFixed(1)} K)`, color: palette(1), dash: true, pts: Ts.filter((T) => T + dT <= 100).map((T) => [T, solubility(solute, T + dT)] as [number, number]) },
    ]
    if (mode === 'cooling') {
      s.push({ label: 'cooling trajectory', color: palette(2), pts: [[T0, c0], [Math.max(0, T0 - 40), c0]] })
    } else if (mode === 'evaporative') {
      s.push({ label: 'evaporative trajectory (const T)', color: palette(2), pts: [[T0, c0], [T0, c0 * 1.6]] })
    } else {
      s.push({ label: `solubility after antisolvent (model: c*·(1−x)², x=${as})`, color: palette(3), dash: true, pts: Ts.map((T) => [T, solubility(solute, T) * (1 - as) ** 2] as [number, number]) })
      s.push({ label: 'antisolvent trajectory (dilution, const T)', color: palette(2), pts: [[T0, c0], [T0, c0 * (1 - as)]] })
    }
    return s
  }, [solute, mode, T0, dT, c0, as])
  const ymax = solute === 'KNO3' ? 260 : 70
  const Tsat = saturationT(solute, c0)
  return (
    <section className="teach-section teach-interactive" aria-labelledby="proc-pd">
      <h2 id="proc-pd">Interactive · solubility, metastable zone and trajectories</h2>
      <p className="teach-caption">Solubility is handbook data; the metastable-zone limit is a Nývlt-type model, ΔT<sub>max</sub> ∝ b<sup>1/m</sup>, so it widens at faster cooling. Pick a mode to see how each one moves the liquor into the zone.</p>
      <div className="teach-grid-2">
        <div className="teach-panel" data-widget="phase-diagram">
          <LineChart ariaLabel="Solubility and metastable zone diagram" series={series} xLabel="T (°C)" yLabel="g / 100 g water" xr={[0, 100]} yr={[0, ymax]} />
        </div>
        <div className="teach-panel">
          <div className="pubs-mode-tabs" role="tablist" aria-label="Solute">
            {(['KNO3', 'NaCl'] as Solute[]).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={solute === k} className={`pubs-mode-tab${solute === k ? ' active' : ''}`} onClick={() => setSolute(k)}>{k}</button>
            ))}
          </div>
          <div className="pubs-mode-tabs" role="tablist" aria-label="Supersaturation mode">
            {(['cooling', 'evaporative', 'antisolvent'] as Mode[]).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={mode === k} className={`pubs-mode-tab${mode === k ? ' active' : ''}`} onClick={() => setMode(k)}>{k}</button>
            ))}
          </div>
          <Slider id={`${uid}-t0`} label={`Start (saturated) T₀ · ${T0} °C`} value={T0} min={20} max={90} step={1} onChange={setT0} />
          <Slider id={`${uid}-b`} label={`Cooling rate b · ${rate.toFixed(2)} K/min`} value={rate} min={0.05} max={2} step={0.05} onChange={setRate} />
          <Slider id={`${uid}-m`} label={`Apparent nucleation order m · ${m.toFixed(1)}`} value={m} min={1.5} max={6} step={0.5} onChange={setM} />
          {mode === 'antisolvent' && <Slider id={`${uid}-as`} label={`Antisolvent mass fraction x · ${as.toFixed(2)}`} value={as} min={0} max={0.7} step={0.05} onChange={setAs} />}
          <p className="teach-caption" data-out="msz">c₀ = {c0.toFixed(1)} g/100 g (T<sub>sat</sub> {Number.isFinite(Tsat) ? Tsat.toFixed(0) : '—'} °C). Model MSZW at this rate: {dT.toFixed(1)} K, so unseeded nucleation is expected near {(T0 - dT).toFixed(0)} °C. {solute === 'NaCl' && mode === 'cooling' && 'NaCl solubility barely changes with T, so cooling gives almost no yield: use evaporation.'}</p>
        </div>
      </div>
    </section>
  )
}

function Profiles() {
  const uid = useId()
  const [T0, setT0] = useState(60)
  const [Tf, setTf] = useState(20)
  const kinds: Profile[] = ['linear', 'natural', 'cubic']
  const name = { linear: 'linear', natural: 'natural (Newton)', cubic: 'controlled cubic (Mullin–Nývlt)' }
  const th = grid(0, 1, 51)
  const temp = kinds.map((k, i) => ({ label: name[k], color: palette(i), pts: th.map((t) => [t, coolingT(k, t, T0, Tf)] as [number, number]) }))
  const rate = kinds.map((k, i) => ({ label: name[k], color: palette(i), pts: th.slice(1).map((t) => [t, (coolingT(k, t - 0.02, T0, Tf) - coolingT(k, t, T0, Tf)) / 0.02 / (T0 - Tf)] as [number, number]) }))
  return (
    <section className="teach-section teach-interactive" aria-labelledby="proc-cool">
      <h2 id="proc-cool">Interactive · cooling profile and supersaturation control</h2>
      <p className="teach-caption">Natural cooling is fastest at the start, when there is little crystal surface, so it causes a nucleation burst. The cubic profile cools slowly at first and faster as seed surface grows, which keeps supersaturation roughly constant (Mullin &amp; Nývlt 1971). Model curves.</p>
      <div className="teach-grid-2">
        <div className="teach-panel" data-widget="cooling-profiles">
          <LineChart ariaLabel="Temperature versus batch time" series={temp} xLabel="θ = t / t_batch" yLabel="T (°C)" xr={[0, 1]} yr={[Math.min(Tf - 10, 0), Math.max(T0, 10)]} />
        </div>
        <div className="teach-panel">
          <LineChart ariaLabel="Normalised cooling rate versus batch time" series={rate} xLabel="θ" yLabel="−dT/dθ ÷ ΔT" xr={[0, 1]} yr={[0, 3]} h={220} />
          <Slider id={`${uid}-t0`} label={`T₀ · ${T0} °C`} value={T0} min={30} max={90} step={1} onChange={(v) => { setT0(v); if (Tf >= v - 5) setTf(v - 5) }} />
          <Slider id={`${uid}-tf`} label={`T_final · ${Tf} °C`} value={Tf} min={0} max={T0 - 5} step={1} onChange={setTf} />
        </div>
      </div>
    </section>
  )
}

function Msmpr() {
  const uid = useId()
  const [G, setG] = useState(0.05)
  const [tau, setTau] = useState(60)
  const Gt = G * 60 * tau // µm (G in µm/s, τ in min)
  const Lmax = Math.max(200, 10 * Gt)
  const Ls = grid(0, Lmax, 121)
  const mmax = msmprMass(3 * Gt, 1, Gt)
  const series = [
    { label: 'number density n/n₀', color: palette(0), pts: Ls.map((L) => [L, msmprN(L, 1, 1, Gt)] as [number, number]) },
    { label: 'mass density L³n (normalised)', color: palette(1), dash: true, pts: Ls.map((L) => [L, msmprMass(L, 1, Gt) / mmax] as [number, number]) },
  ]
  return (
    <section className="teach-section teach-interactive" aria-labelledby="proc-msmpr">
      <h2 id="proc-msmpr">Interactive · MSMPR population balance (CSD)</h2>
      <p className="teach-caption">Steady-state MSMPR: n(L) = n₀ exp(−L/Gτ). Longer residence time or faster growth shifts the mass distribution to larger sizes. Model curves (Randolph &amp; Larson 1962).</p>
      <div className="teach-grid-2">
        <div className="teach-panel" data-widget="msmpr">
          <LineChart ariaLabel="MSMPR distributions" series={series} xLabel="L (µm)" yLabel="normalised" xr={[0, Lmax]} yr={[0, 1]} />
        </div>
        <div className="teach-panel">
          <Slider id={`${uid}-g`} label={`Growth rate G · ${G.toFixed(3)} µm/s`} value={G} min={0.005} max={0.2} step={0.005} onChange={setG} />
          <Slider id={`${uid}-tau`} label={`Residence time τ · ${tau} min`} value={tau} min={10} max={240} step={5} onChange={setTau} />
          <p className="teach-caption" data-out="msmpr">Gτ = {Gt.toFixed(0)} µm · dominant (mass-mode) size 3Gτ = {msmprDominant(1, Gt).toFixed(0)} µm · L₄,₃ = 4Gτ = {msmprMassMean(1, Gt).toFixed(0)} µm. Coefficient of variation by mass is fixed at 50 %, which is why single-stage MSMPRs cannot narrow the distribution.</p>
        </div>
      </div>
    </section>
  )
}

function Calculators() {
  const uid = useId()
  const [solute, setSolute] = useState<Solute>('KNO3')
  const [T0, setT0] = useState(60)
  const [Tf, setTf] = useState(20)
  const [evap, setEvap] = useState(0)
  const [water, setWater] = useState(1000)
  const [Ls, setLs] = useState(50)
  const [Lp, setLp] = useState(200)
  const y = coolingYield(solute, T0, Tf, evap)
  const Y = (y.mass * water) / 100
  const Ws = seedMass(Y, Ls, Lp)
  return (
    <section className="teach-section teach-interactive" aria-labelledby="proc-calc">
      <h2 id="proc-calc">Interactive · yield and seed-loading calculators</h2>
      <div className="teach-grid-2">
        <div className="teach-panel" data-widget="yield">
          <h3>Yield (equilibrium, anhydrous)</h3>
          <label className="teach-slider-label" htmlFor={`${uid}-sol`}>Solute</label>
          <select id={`${uid}-sol`} value={solute} onChange={(e) => setSolute(e.target.value as Solute)}>
            <option value="KNO3">KNO3</option><option value="NaCl">NaCl</option>
          </select>
          <Slider id={`${uid}-yt0`} label={`Saturated at T₀ · ${T0} °C`} value={T0} min={10} max={100} step={1} onChange={(v) => { setT0(v); if (Tf > v) setTf(v) }} />
          <Slider id={`${uid}-ytf`} label={`Final T · ${Tf} °C`} value={Tf} min={0} max={T0} step={1} onChange={setTf} />
          <Slider id={`${uid}-ev`} label={`Water evaporated · ${(evap * 100).toFixed(0)} %`} value={evap} min={0} max={0.9} step={0.05} onChange={setEvap} />
          <Slider id={`${uid}-w`} label={`Water charge · ${water} g`} value={water} min={100} max={5000} step={100} onChange={setWater} />
          <p className="teach-caption" data-out="yield">Dissolved: {(solubility(solute, T0) * water / 100).toFixed(0)} g · crystallized: <strong>{Y.toFixed(0)} g</strong> ({(y.frac * 100).toFixed(1)} %). Yield = c*(T₀) − c*(T<sub>f</sub>)(1 − E), per 100 g water.</p>
        </div>
        <div className="teach-panel" data-widget="seeding">
          <h3>Seed loading (seeds grow, no nucleation)</h3>
          <Slider id={`${uid}-ls`} label={`Seed size L_s · ${Ls} µm`} value={Ls} min={5} max={300} step={5} onChange={(v) => { setLs(v); if (Lp <= v) setLp(v + 5) }} />
          <Slider id={`${uid}-lp`} label={`Target product size L_p · ${Lp} µm`} value={Lp} min={Ls + 5} max={1000} step={5} onChange={setLp} />
          <p className="teach-caption" data-out="seed">Mass balance W<sub>p</sub> = W<sub>s</sub>(L<sub>p</sub>/L<sub>s</sub>)³, W<sub>p</sub> − W<sub>s</sub> = yield ⇒ seed mass <strong>{Number.isFinite(Ws) ? Ws.toFixed(1) : '—'} g</strong>, a seed loading of {Number.isFinite(Ws) && Y > 0 ? ((Ws / Y) * 100).toFixed(2) : '—'} % of yield. Check: {Y > 0 && Number.isFinite(Ws) ? productSize(Ls, Ws / Y).toFixed(0) : '—'} µm. Kubota et al. (2001) found that loadings above a critical value suppress secondary nucleation.</p>
        </div>
      </div>
    </section>
  )
}

export default function ProcessPage() {
  return (
    <div className="teach-page proc-page">
      <header className="teach-hero">
        <p className="eyebrow">Crystallization · process engineering</p>
        <h1 className="lattice-lab-title">
          <ProcessLogo size={30} className="lattice-lab-logo" />
          Industrial crystallization
        </h1>
        <p className="teach-lead">From solubility curves and metastable zones to seeding, population balances, PAT-based control and continuous crystallizers. Interactive teaching models are followed by a referenced literature review.</p>
      </header>
      <aside className="teach-callout teach-callout-warn" role="note">
        <p className="teach-callout-title">Disclaimer</p>
        <p>Solubility values are handbook data for KNO₃ and NaCl in water. Metastable zones, profiles, CSDs and seed loadings are textbook models for teaching, not design calculations for a real plant.</p>
      </aside>
      <section className="teach-section" aria-labelledby="proc-ideas">
        <h2 id="proc-ideas">Ideas in brief</h2>
        <ul className="teach-bullets">
          <li><strong>Supersaturation</strong> drives everything; the process mode (cooling, antisolvent, evaporative, reactive, melt) is just how you create it.</li>
          <li><strong>Stay in the metastable zone</strong>, seed early, and let growth consume supersaturation instead of nucleation.</li>
          <li><strong>The CSD</strong> follows from nucleation and growth via the population balance and governs filtration, drying and dissolution.</li>
          <li><strong>PAT + control</strong> (FBRM, ATR-FTIR, Raman; SSC, DNC) turn a recipe into a robust process.</li>
        </ul>
      </section>
      <PhaseDiagram />
      <Profiles />
      <Msmpr />
      <Calculators />
      <ProcessKnowledge />
      <footer className="teach-footer">
        <p>Teaching models only. Not calibrated to a specific compound, solvent or crystallizer.</p>
        <p>
          <Link to="/kinetics">Kinetics</Link>{' · '}<Link to="/morphology">Crystal morphology</Link>{' · '}<Link to="/cif">Lattice Lab</Link>{' · '}<Link to="/">Home</Link>
        </p>
      </footer>
    </div>
  )
}
