/**
 * Nucleic-acid analysis: backbone torsions, sugar pucker (Altona & Sundaralingam 1972),
 * base frames from the standard reference bases (Olson et al. 2001, J Mol Biol 313:229),
 * Watson–Crick pairing, and 3DNA base-pair / step parameters (Lu & Olson 2003, NAR 31:5108).
 */
import type { Vec3 } from '../../types'
import { add, cross, dihedral, dist, dot, lsFit, norm, RAD, rotate, scale, signedAngle, sub, unit } from './geom'
import type { Residue } from './residues'

export interface NucleicRow {
  res: Residue
  base: 'A' | 'G' | 'C' | 'T' | 'U' | null
  alpha: number | null; beta: number | null; gamma: number | null; delta: number | null
  epsilon: number | null; zeta: number | null; chi: number | null
  glyco: 'anti' | 'syn' | null
  P: number | null; tm: number | null; pucker: string | null
}
export interface BaseFrame { origin: Vec3; x: Vec3; y: Vec3; z: Vec3; rmsd: number }
export interface Params6 { a: number; b: number; c: number; d: number; e: number; f: number }
export interface BasePair {
  i: number; j: number
  r1: Residue; r2: Residue
  label: string
  /** Shear, Stretch, Stagger (Å); Buckle, Propeller, Opening (°). */
  shear: number; stretch: number; stagger: number; buckle: number; propeller: number; opening: number
  frame: BaseFrame
}
export interface Step {
  bp1: BasePair; bp2: BasePair; label: string
  shift: number; slide: number; rise: number; tilt: number; roll: number; twist: number
}

/** Standard base coordinates (3DNA Atomic_*.pdb, Olson et al. 2001), ring atoms only. */
const STD: Record<string, Record<string, Vec3>> = {
  A: { N9: [-1.291, 4.498, 0], C8: [0.024, 4.897, 0], N7: [0.877, 3.902, 0], C5: [0.071, 2.771, 0], C6: [0.369, 1.398, 0], N1: [-0.668, 0.532, 0], C2: [-1.912, 1.023, 0], N3: [-2.32, 2.29, 0], C4: [-1.267, 3.124, 0] },
  G: { N9: [-1.289, 4.551, 0], C8: [0.023, 4.962, 0], N7: [0.87, 3.969, 0], C5: [0.071, 2.833, 0], C6: [0.424, 1.46, 0], N1: [-0.7, 0.641, 0], C2: [-1.999, 1.087, 0], N3: [-2.342, 2.364, 0.001], C4: [-1.265, 3.177, 0] },
  C: { N1: [-1.285, 4.542, 0], C2: [-1.472, 3.158, 0], N3: [-0.391, 2.344, 0], C4: [0.837, 2.868, 0], C5: [1.056, 4.275, 0], C6: [-0.023, 5.068, 0] },
  T: { N1: [-1.284, 4.5, 0], C2: [-1.462, 3.135, 0], N3: [-0.298, 2.407, 0], C4: [0.994, 2.897, 0], C5: [1.106, 4.338, 0], C6: [-0.024, 5.057, 0] },
  U: { N1: [-1.284, 4.5, 0], C2: [-1.462, 3.131, 0], N3: [-0.302, 2.397, 0], C4: [0.989, 2.884, 0], C5: [1.089, 4.311, 0], C6: [-0.024, 5.053, 0] },
}
export const PUCKER_NAMES = ["C3'-endo", "C4'-exo", "O4'-endo", "C1'-exo", "C2'-endo", "C3'-exo", "C4'-endo", "O4'-exo", "C1'-endo", "C2'-exo"]

export function baseOf(comp: string): NucleicRow['base'] {
  const c = comp.replace(/^D/, '')
  return c === 'A' || c === 'G' || c === 'C' || c === 'T' || c === 'U' ? c : null
}

/** Altona–Sundaralingam pseudorotation from ν0..ν4 (deg). */
export function pseudorotation(nu: number[]): { P: number; tm: number; name: string } {
  const [v0, v1, v2, v3, v4] = nu as [number, number, number, number, number]
  const s = Math.sin(36 / RAD) + Math.sin(72 / RAD)
  let P = Math.atan2((v4 + v1) - (v3 + v0), 2 * v2 * s) * RAD
  if (P < 0) P += 360
  const tm = v2 / Math.cos(P / RAD)
  return { P, tm, name: PUCKER_NAMES[Math.floor(P / 36) % 10]! }
}

export function baseFrame(r: Residue): BaseFrame | null {
  const b = baseOf(r.comp)
  if (!b) return null
  const std = STD[b]!
  const P: Vec3[] = [], Q: Vec3[] = []
  for (const [nm, p] of Object.entries(std)) {
    const q = r.atoms.get(nm)
    if (q) { P.push(p); Q.push(q) }
  }
  if (P.length < 5) return null
  const { R, t, rmsd } = lsFit(P, Q)
  return { origin: t, x: [R[0]![0]!, R[1]![0]!, R[2]![0]!], y: [R[0]![1]!, R[1]![1]!, R[2]![1]!], z: [R[0]![2]!, R[1]![2]!, R[2]![2]!], rmsd }
}

/**
 * 3DNA bpstep_par: parameters of frame 2 relative to frame 1 and the middle frame.
 * Returns [shift, slide, rise, tilt, roll, twist] (or shear…opening for a pair).
 */
export function stepParams(f1: BaseFrame, f2: BaseFrame): { p: Params6; mid: BaseFrame } {
  const z1 = f1.z, z2 = f2.z
  const gamma = Math.acos(Math.max(-1, Math.min(1, dot(z1, z2)))) * RAD
  let hinge = cross(z1, z2)
  if (norm(hinge) < 1e-8) hinge = add(f1.x, f2.x)
  hinge = unit(hinge)
  const r2 = (v: Vec3) => rotate(v, hinge, -gamma / 2)
  const r1 = (v: Vec3) => rotate(v, hinge, gamma / 2)
  const x1 = r1(f1.x), y1 = r1(f1.y), x2 = r2(f2.x), y2 = r2(f2.y)
  const zm = unit(add(r1(z1), r2(z2)))
  const xm = unit(add(x1, x2)), ym = unit(add(y1, y2))
  const twist = signedAngle(y1, y2, zm)
  const phi = signedAngle(hinge, ym, zm) / RAD
  const roll = gamma * Math.cos(phi), tilt = gamma * Math.sin(phi)
  const om = scale(add(f1.origin, f2.origin), 0.5)
  const d = sub(f2.origin, f1.origin)
  return {
    p: { a: dot(d, xm), b: dot(d, ym), c: dot(d, zm), d: tilt, e: roll, f: twist },
    mid: { origin: om, x: xm, y: ym, z: zm, rmsd: 0 },
  }
}

const WC: Record<string, [string, string][]> = {
  AT: [['N1', 'N3'], ['N6', 'O4']], AU: [['N1', 'N3'], ['N6', 'O4']],
  GC: [['N1', 'N3'], ['N2', 'O2'], ['O6', 'N4']],
}
function wcHbonds(a: Residue, b: Residue): number[] | null {
  const ba = baseOf(a.comp), bb = baseOf(b.comp)
  if (!ba || !bb) return null
  let pairs = WC[ba + bb], swap = false
  if (!pairs) { pairs = WC[bb + ba]; swap = true }
  if (!pairs) return null
  const ds: number[] = []
  for (const [p, q] of pairs) {
    const A = (swap ? b : a).atoms.get(p), B = (swap ? a : b).atoms.get(q)
    if (A && B) ds.push(dist(A, B))
  }
  return ds
}

export function nucleicAnalysis(residues: Residue[]): { rows: NucleicRow[]; pairs: BasePair[]; steps: Step[]; form: string | null } {
  const nuc = residues.filter((r) => r.kind === 'nucleic')
  const rows: NucleicRow[] = []
  const at = (r: Residue | null | undefined, n: string) => r?.atoms.get(n)
  const tor = (...p: (Vec3 | undefined)[]) => (p.every(Boolean) ? dihedral(p[0]!, p[1]!, p[2]!, p[3]!) : null)
  for (let k = 0; k < nuc.length; k++) {
    const r = nuc[k]!
    let prev: Residue | null = k > 0 && nuc[k - 1]!.chain === r.chain ? nuc[k - 1]! : null
    let next: Residue | null = k + 1 < nuc.length && nuc[k + 1]!.chain === r.chain ? nuc[k + 1]! : null
    if (prev && !(at(prev, "O3'") && at(r, 'P') && dist(at(prev, "O3'")!, at(r, 'P')!) < 2.0)) prev = null
    if (next && !(at(r, "O3'") && at(next, 'P') && dist(at(r, "O3'")!, at(next, 'P')!) < 2.0)) next = null
    const base = baseOf(r.comp)
    const pur = base === 'A' || base === 'G'
    const chi = tor(at(r, "O4'"), at(r, "C1'"), at(r, pur ? 'N9' : 'N1'), at(r, pur ? 'C4' : 'C2'))
    const nu = [
      tor(at(r, "C4'"), at(r, "O4'"), at(r, "C1'"), at(r, "C2'")),
      tor(at(r, "O4'"), at(r, "C1'"), at(r, "C2'"), at(r, "C3'")),
      tor(at(r, "C1'"), at(r, "C2'"), at(r, "C3'"), at(r, "C4'")),
      tor(at(r, "C2'"), at(r, "C3'"), at(r, "C4'"), at(r, "O4'")),
      tor(at(r, "C3'"), at(r, "C4'"), at(r, "O4'"), at(r, "C1'")),
    ]
    const ps = nu.every((v) => v != null) ? pseudorotation(nu as number[]) : null
    rows.push({
      res: r, base,
      alpha: tor(at(prev, "O3'"), at(r, 'P'), at(r, "O5'"), at(r, "C5'")),
      beta: tor(at(r, 'P'), at(r, "O5'"), at(r, "C5'"), at(r, "C4'")),
      gamma: tor(at(r, "O5'"), at(r, "C5'"), at(r, "C4'"), at(r, "C3'")),
      delta: tor(at(r, "C5'"), at(r, "C4'"), at(r, "C3'"), at(r, "O3'")),
      epsilon: tor(at(r, "C4'"), at(r, "C3'"), at(r, "O3'"), at(next, 'P')),
      zeta: tor(at(r, "C3'"), at(r, "O3'"), at(next, 'P'), at(next, "O5'")),
      chi, glyco: chi == null ? null : Math.abs(chi) > 90 ? 'anti' : 'syn',
      P: ps?.P ?? null, tm: ps?.tm ?? null, pucker: ps?.name ?? null,
    })
  }
  // —— base pairing (Watson–Crick H-bond geometry) ——
  const frames = nuc.map(baseFrame)
  const cand: { i: number; j: number; score: number }[] = []
  for (let i = 0; i < nuc.length; i++) {
    const fi = frames[i]
    if (!fi) continue
    for (let j = i + 1; j < nuc.length; j++) {
      const fj = frames[j]
      if (!fj || dist(fi.origin, fj.origin) > 4.5) continue
      const hb = wcHbonds(nuc[i]!, nuc[j]!)
      if (!hb || hb.length < 2) continue
      const good = hb.filter((d) => d >= 2.5 && d <= 3.5).length
      if (good < 2 || dot(fi.z, fj.z) > -0.5) continue
      cand.push({ i, j, score: hb.reduce((s, d) => s + d, 0) / hb.length })
    }
  }
  cand.sort((a, b) => a.score - b.score)
  const used = new Set<number>()
  const pairs: BasePair[] = []
  for (const c of cand) {
    if (used.has(c.i) || used.has(c.j)) continue
    used.add(c.i); used.add(c.j)
    const f1 = frames[c.i]!, f0 = frames[c.j]!
    // strand II frame: reverse y and z (3DNA convention)
    const f2: BaseFrame = { ...f0, y: scale(f0.y, -1), z: scale(f0.z, -1) }
    const { p, mid } = stepParams(f2, f1)
    const r1 = nuc[c.i]!, r2 = nuc[c.j]!
    pairs.push({
      i: c.i, j: c.j, r1, r2, label: `${r1.chain}${r1.seq}${baseOf(r1.comp)}-${baseOf(r2.comp)}${r2.chain}${r2.seq}`,
      shear: p.a, stretch: p.b, stagger: p.c, buckle: p.d, propeller: p.e, opening: p.f, frame: mid,
    })
  }
  pairs.sort((a, b) => a.i - b.i)
  // —— steps: consecutive pairs along strand I with partners consecutive on strand II ——
  const steps: Step[] = []
  for (let k = 0; k + 1 < pairs.length; k++) {
    const a = pairs[k]!, b = pairs[k + 1]!
    if (b.i !== a.i + 1 || b.r1.chain !== a.r1.chain || Math.abs(b.j - a.j) !== 1) continue
    const { p } = stepParams(a.frame, b.frame)
    steps.push({ bp1: a, bp2: b, label: `${baseOf(a.r1.comp)}${baseOf(b.r1.comp)}/${baseOf(b.r2.comp)}${baseOf(a.r2.comp)} ${a.r1.chain}${a.r1.seq}`, shift: p.a, slide: p.b, rise: p.c, tilt: p.d, roll: p.e, twist: p.f })
  }
  // —— helical form hint ——
  let form: string | null = null
  const pk = rows.filter((r) => r.P != null)
  if (pk.length) {
    const c2 = pk.filter((r) => r.P! >= 108 && r.P! < 216).length / pk.length
    const c3 = pk.filter((r) => r.P! < 72 || r.P! >= 324).length / pk.length
    const tw = steps.length ? steps.reduce((s, x) => s + x.twist, 0) / steps.length : null
    const sl = steps.length ? steps.reduce((s, x) => s + x.slide, 0) / steps.length : null
    if (c2 >= 0.6 && (sl == null || sl > -0.8)) form = `B-like (${Math.round(c2 * 100)}% C2′-endo-family puckers${tw != null ? `, mean twist ${tw.toFixed(1)}°` : ''})`
    else if (c3 >= 0.6 && (sl == null || sl < -0.8)) form = `A-like (${Math.round(c3 * 100)}% C3′-endo-family puckers${sl != null ? `, mean slide ${sl.toFixed(2)} Å` : ''})`
    else form = 'Mixed / intermediate'
  }
  return { rows, pairs, steps, form }
}
