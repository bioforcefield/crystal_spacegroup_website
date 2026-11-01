/**
 * Equations exactly as implemented in src/data/pdb/analysis/nucleic.ts
 * (pseudorotation(), baseFrame(), stepParams(), nucleicAnalysis()).
 */
import katex from 'katex'
import 'katex/dist/katex.min.css'
import type { NaEqKind } from './NaEquationsLazy'

function Tex({ t, block = true }: { t: string; block?: boolean }) {
  const html = katex.renderToString(t, { displayMode: block, throwOnError: false, output: 'htmlAndMathml' })
  return block ? <div className="ana-eq-math" dangerouslySetInnerHTML={{ __html: html }} /> : <span dangerouslySetInnerHTML={{ __html: html }} />
}

export const NA_EQ_REFS = {
  altona: { text: 'Altona, C. & Sundaralingam, M. (1972) Conformational analysis of the sugar ring in nucleosides and nucleotides. A new description using the concept of pseudorotation. J. Am. Chem. Soc. 94, 8205–8212.', doi: '10.1021/ja00778a043' },
  olson: { text: 'Olson, W. K., Bansal, M., Burley, S. K., Dickerson, R. E., et al. (2001) A standard reference frame for the description of nucleic acid base-pair geometry. J. Mol. Biol. 313, 229–237.', doi: '10.1006/jmbi.2001.4987' },
  lu: { text: 'Lu, X.-J. & Olson, W. K. (2003) 3DNA: a software package for the analysis, rebuilding and visualization of three-dimensional nucleic acid structures. Nucleic Acids Res. 31, 5108–5121.', doi: '10.1093/nar/gkg680' },
  elhassan: { text: 'El Hassan, M. A. & Calladine, C. R. (1995) The assessment of the geometry of dinucleotide steps in double-helical DNA; a new local calculation scheme. J. Mol. Biol. 251, 648–664.', doi: '10.1006/jmbi.1995.0462' },
} as const
type RefK = keyof typeof NA_EQ_REFS
function Refs({ keys }: { keys: RefK[] }) {
  return (
    <ol className="ana-eq-refs">
      {keys.map((k) => <li key={k}>{NA_EQ_REFS[k].text} <a href={`https://doi.org/${NA_EQ_REFS[k].doi}`} target="_blank" rel="noopener noreferrer">doi:{NA_EQ_REFS[k].doi}</a></li>)}
    </ol>
  )
}

function Pucker() {
  return (
    <>
      <p>Endocyclic torsions of the furanose ring (IUPAC):</p>
      <Tex t={String.raw`\begin{aligned}\nu_0&=\angle\,\mathrm{C4'{-}O4'{-}C1'{-}C2'} & \nu_1&=\angle\,\mathrm{O4'{-}C1'{-}C2'{-}C3'}\\ \nu_2&=\angle\,\mathrm{C1'{-}C2'{-}C3'{-}C4'} & \nu_3&=\angle\,\mathrm{C2'{-}C3'{-}C4'{-}O4'}\\ \nu_4&=\angle\,\mathrm{C3'{-}C4'{-}O4'{-}C1'}\end{aligned}`} />
      <p>Altona–Sundaralingam pseudorotation phase <Tex block={false} t="P" /> and amplitude <Tex block={false} t={String.raw`\tau_m`} /> (= <Tex block={false} t={String.raw`\nu_{\max}`} />):</p>
      <Tex t={String.raw`\tan P=\frac{(\nu_4+\nu_1)-(\nu_3+\nu_0)}{2\,\nu_2\,(\sin 36^\circ+\sin 72^\circ)}`} />
      <Tex t={String.raw`\tau_m=\frac{\nu_2}{\cos P}`} />
      <p>Implementation: <Tex block={false} t={String.raw`P=\operatorname{atan2}\!\big((\nu_4+\nu_1)-(\nu_3+\nu_0),\;2\nu_2(\sin36^\circ+\sin72^\circ)\big)`} />, mapped to <Tex block={false} t={String.raw`[0^\circ,360^\circ)`} />. Pucker names use ten 36° sectors starting at C3′-endo:</p>
      <Tex t={String.raw`\begin{aligned}0^\circ\le P<36^\circ&:\ \mathrm{C3'\text{-}endo}\ (\text{North, A-form})\\ 144^\circ\le P<180^\circ&:\ \mathrm{C2'\text{-}endo}\ (\text{South, B-form})\end{aligned}`} />
      <p className="muted">Sectors in order: C3′-endo, C4′-exo, O4′-endo, C1′-exo, C2′-endo, C3′-exo, C4′-endo, O4′-exo, C1′-endo, C2′-exo. For the helical-form hint and wheel colours the code groups North as <Tex block={false} t={String.raw`P<72^\circ`} /> or <Tex block={false} t={String.raw`P\ge324^\circ`} />, and South as <Tex block={false} t={String.raw`108^\circ\le P<216^\circ`} />. Cremer–Pople puckering coordinates are <em>not</em> computed here; only the Altona–Sundaralingam ν-based description.</p>
      <Refs keys={['altona']} />
    </>
  )
}

function Frames() {
  return (
    <>
      <p>Each base gets a standard reference frame (Olson et al. 2001): the ideal base (3DNA <code>Atomic_*.pdb</code> ring atoms) is least-squares fitted onto the observed ring atoms; the fitted rotation columns give <Tex block={false} t={String.raw`\hat x,\hat y,\hat z`} /> and the translation gives the origin <Tex block={false} t={String.raw`\mathbf o`} />. For the strand-II base <Tex block={false} t={String.raw`\hat y`} /> and <Tex block={false} t={String.raw`\hat z`} /> are reversed.</p>
      <p>For two frames 1 and 2 (3DNA <code>bpstep_par</code>, Lu &amp; Olson 2003): bend angle and hinge</p>
      <Tex t={String.raw`\Gamma=\arccos(\hat z_1\!\cdot\!\hat z_2),\qquad \hat h=\frac{\hat z_1\times\hat z_2}{\lVert\hat z_1\times\hat z_2\rVert}`} />
      <p>Rotate frame 1 by <Tex block={false} t={String.raw`+\Gamma/2`} /> and frame 2 by <Tex block={false} t={String.raw`-\Gamma/2`} /> about <Tex block={false} t={String.raw`\hat h`} /> (primes), then build the middle (“mid-step triad”) frame:</p>
      <Tex t={String.raw`\begin{aligned}\hat x_m&=\widehat{\hat x_1'+\hat x_2'} & \hat y_m&=\widehat{\hat y_1'+\hat y_2'}\\ \hat z_m&=\widehat{\hat z_1'+\hat z_2'} & \mathbf o_m&=\tfrac12(\mathbf o_1+\mathbf o_2)\end{aligned}`} />
      <p>Angles (signed about <Tex block={false} t={String.raw`\hat z_m`} />) and translations:</p>
      <Tex t={String.raw`\begin{aligned}\Omega&=\angle_{\hat z_m}(\hat y_1',\hat y_2')\\ \phi&=\angle_{\hat z_m}(\hat h,\hat y_m)\\ (D_x,D_y,D_z)&=(\mathbf o_2-\mathbf o_1)\cdot(\hat x_m,\hat y_m,\hat z_m)\end{aligned}`} />
    </>
  )
}

function Bp() {
  return (
    <>
      <Frames />
      <p>Base pair: frame 1 = strand-II base (flipped), frame 2 = strand-I base.</p>
      <Tex t={String.raw`\begin{aligned}\text{Shear}&=D_x & \text{Buckle }\kappa&=\Gamma\sin\phi\\ \text{Stretch}&=D_y & \text{Propeller }\pi&=\Gamma\cos\phi\\ \text{Stagger}&=D_z & \text{Opening }\sigma&=\Omega\end{aligned}`} />
      <p className="muted">Pairs are accepted as Watson–Crick when ≥ 2 WC donor–acceptor distances are 2.5–3.5 Å, origins ≤ 4.5 Å apart and the base normals antiparallel (ẑ₁·ẑ₂ ≤ −0.5).</p>
      <Refs keys={['olson', 'lu']} />
    </>
  )
}

function StepEq() {
  return (
    <>
      <Frames />
      <p>Step: frames 1 and 2 are the middle frames of consecutive base pairs (i, i+1).</p>
      <Tex t={String.raw`\begin{aligned}\text{Shift}&=D_x & \text{Tilt }\tau&=\Gamma\sin\phi\\ \text{Slide}&=D_y & \text{Roll }\rho&=\Gamma\cos\phi\\ \text{Rise}&=D_z & \text{Twist}&=\Omega\end{aligned}`} />
      <p className="muted">This is the 3DNA construction, which follows the CEHS-type local scheme (El Hassan &amp; Calladine 1995): bend split symmetrically about the hinge, parameters expressed in the mid-step triad.</p>
      <Refs keys={['olson', 'lu', 'elhassan']} />
    </>
  )
}

export default function NaEquations({ kind }: { kind: NaEqKind }) {
  return <div className="ana-eq-body" data-testid={`ana-eq-body-${kind}`}>{kind === 'pucker' ? <Pucker /> : kind === 'bp' ? <Bp /> : <StepEq />}</div>
}
