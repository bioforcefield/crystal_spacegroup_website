/**
 * Bond-length and bond-angle distributions by type, with Z-scores against literature targets.
 *
 * Covalent connectivity is taken from residue topology (the Engh & Huber per-residue bond list,
 * standard nucleotide connectivity, and peptide / phosphodiester links between consecutive residues
 * of a chain) — not inferred from distances. The only distance tests are (1) chain-break detection
 * for the inter-residue link (C–N or O3'–P > 2.0 Å ⇒ no link), (2) disulfides (mmCIF _struct_conn
 * conn_type disulf when present — same-ASU pairs only; otherwise SG–SG < 2.5 Å), and (3) the optional, clearly labelled ligand
 * element-pair distribution. Coordinates come from residuesOf(): model 1, first altloc per atom name,
 * so altlocs are never mixed within one residue.
 *
 * Z = (observed − ideal) / σ. |Z| > 4 is flagged as an outlier; RMS-Z per type.
 */
import type { Vec3 } from '../../types'
import type { MacroModel } from '../macro'
import type { Residue } from './residues'
import { EH2001_ANGLES, EH2001_BONDS } from './eh2001'

export type GeomGroup = 'pbb-bond' | 'pbb-angle' | 'psc-bond' | 'psc-angle' | 'nbb-bond' | 'nbb-angle' | 'lig-bond'
export const GEOM_GROUPS: { id: GeomGroup; label: string }[] = [
  { id: 'pbb-bond', label: 'Protein backbone bonds' },
  { id: 'pbb-angle', label: 'Protein backbone angles' },
  { id: 'psc-bond', label: 'Side-chain bonds' },
  { id: 'psc-angle', label: 'Disulfide angles & χSS' },
  { id: 'nbb-bond', label: 'Nucleic backbone bonds' },
  { id: 'nbb-angle', label: 'Nucleic backbone angles' },
  { id: 'lig-bond', label: 'Ligand bonds (distance-based)' },
]

export interface GeomItem {
  group: GeomGroup
  kind: 'bond' | 'angle' | 'torsion'
  /** Display type, e.g. "N–CA", "C–N (peptide)", "C–S", "N–CA–C". */
  type: string
  /** Atoms measured, e.g. "A12 C – A13 N". */
  atoms: string
  res: Residue
  value: number
  ideal: number | null
  sigma: number | null
  z: number | null
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
export function dihedral(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3) {
  const b1 = sub(p1, p0), b2 = sub(p2, p1), b3 = sub(p3, p2)
  const cr = (u: Vec3, v: Vec3): Vec3 => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
  const n1 = cr(b1, b2), n2 = cr(b2, b3)
  return (Math.atan2(Math.hypot(...b2) * dot(b1, n2), dot(n1, n2)) * 180) / Math.PI
}
export function angle(a: Vec3, b: Vec3, c: Vec3) {
  const u = sub(a, b), v = sub(c, b)
  const cs = dot(u, v) / (Math.hypot(...u) * Math.hypot(...v))
  return (Math.acos(Math.max(-1, Math.min(1, cs))) * 180) / Math.PI
}

type Target = { atoms: string[]; mu: number; sd: number }
function parseEH(src: string) {
  const m = new Map<string, Target[]>()
  for (const line of src.split('\n')) {
    const p = line.trim().split(/\s+/)
    if (p.length !== 4) continue
    const [at, res, mu, sd] = p as [string, string, string, string]
    const l = m.get(res) ?? []
    l.push({ atoms: at.split('-'), mu: +mu, sd: +sd })
    m.set(res, l)
  }
  return m
}
let EHB: Map<string, Target[]> | null = null
let EHA: Map<string, Target[]> | null = null
function eh() {
  if (!EHB) { EHB = parseEH(EH2001_BONDS); EHA = parseEH(EH2001_ANGLES) }
  return { B: EHB!, A: EHA! }
}

/**
 * Peptide (inter-residue) targets, Engh & Huber 2001 general values (as tabulated in
 * Berkholz et al. 2009, Structure 17:1316, Table 1). Gly/Pro-specific peptide values are not used;
 * C–N–CA for a Pro acceptor is measured but not Z-scored (its ring closure shifts it by ~2°).
 */
export const PEPTIDE = {
  CN: { mu: 1.336, sd: 0.023 },
  CACN: { mu: 117.2, sd: 2.2 },
  CNCA: { mu: 121.7, sd: 2.5 },
  OCN: { mu: 122.7, sd: 1.6 },
}

/**
 * Pro-acceptor (trans) peptide link and disulfide targets from the CCP4 Monomer Library,
 * list/mon_lib_list.cif (github.com/MonomerLibrary/monomers), link entries data_link_PTRANS and
 * data_link_disulf, transcribed verbatim. No Gly-specific peptide link exists in that library and no
 * other fetchable machine-readable source was found, so Gly acceptors keep the general targets above.
 */
export const PEPTIDE_PRO = {
  CN: { mu: 1.352, sd: 0.010 },
  CACN: { mu: 118.415, sd: 1.50 },
  OCN: { mu: 121.016, sd: 1.53 },
  CNCA: { mu: 120.469, sd: 1.50 },
  CNCD: { mu: 124.005, sd: 1.50 },
}
export const DISULF = { SS: { mu: 2.031, sd: 0.020 }, CBSGSG: { mu: 103.8, sd: 1.8 } }
export const LINK_SOURCE = 'CCP4 Monomer Library mon_lib_list.cif, links PTRANS and disulf (github.com/MonomerLibrary/monomers)'

/** Nucleic targets: Gelbin et al. 1996 / Parkinson et al. 1996 (ribose, deoxyribose). */
type RD = [number, number, number, number] // ribo mu, sd, deoxy mu, sd
export const NA_BONDS: Record<string, RD> = {
  "P-O5'": [1.593, 0.010, 1.593, 0.010],
  "O3'-P": [1.607, 0.012, 1.607, 0.012],
  "O5'-C5'": [1.440, 0.016, 1.440, 0.016], // phosphorylated O5'
  "C5'-C4'": [1.510, 0.013, 1.511, 0.008],
  "C4'-C3'": [1.524, 0.011, 1.528, 0.010],
  "C3'-O3'": [1.433, 0.019, 1.433, 0.019], // phosphorylated O3'
  "C1'-N": [1.471, 0.017, 1.474, 0.020],
}
export const NA_ANGLES: Record<string, RD> = {
  "O3'-P-O5'": [104.0, 1.9, 104.0, 1.9],
  "P-O5'-C5'": [120.9, 1.6, 120.9, 1.6],
  "O5'-C5'-C4'": [109.4, 0.8, 109.4, 0.8],
  "C5'-C4'-C3'": [115.5, 1.5, 114.7, 1.5],
  "C4'-C3'-O3'": [110.6, 2.6, 110.3, 2.2],
  "C3'-O3'-P": [119.7, 1.2, 119.7, 1.2],
  "O4'-C1'-N": [108.2, 1.0, 107.8, 0.8],
  "C2'-C1'-N": [113.4, 1.6, 114.2, 1.6],
  "C1'-N9-C4": [127.1, 1.8, 125.9, 1.4],
  "C1'-N1-C2": [117.9, 1.3, 117.8, 1.4],
}

const PURINE = new Set(['A', 'G', 'DA', 'DG', 'I', 'DI'])
const isDeoxy = (comp: string) => comp.startsWith('D')
const el = (name: string) => (name.replace(/[^A-Z]/gi, '')[0] ?? '?').toUpperCase()
const lab = (r: Residue, a: string) => `${r.chain}${r.seq} ${a}`
const zOf = (v: number, mu: number | null, sd: number | null) => (mu == null || sd == null || sd <= 0 ? null : (v - mu) / sd)

function linked(a: Residue, b: Residue, atA: string, atB: string) {
  if (a.chain !== b.chain) return false
  const p = a.atoms.get(atA), q = b.atoms.get(atB)
  return !!p && !!q && dist(p, q) < 2.0
}

export function geometryAnalysis(residues: Residue[], disulfides?: import('../mmcif').DisulfideRecord[]): GeomItem[] {
  const out: GeomItem[] = []
  const { B, A } = eh()
  const push = (group: GeomGroup, kind: GeomItem['kind'], type: string, atoms: string, res: Residue, value: number, mu: number | null, sd: number | null) => {
    out.push({ group, kind, type, atoms, res, value, ideal: mu, sigma: sd, z: zOf(value, mu, sd) })
  }
  const BB = new Set(['N-CA', 'CA-C', 'C-O'])
  const BBA = new Set(['N-CA-C', 'CA-C-O'])
  const cys: Residue[] = []
  for (let i = 0; i < residues.length; i++) {
    const r = residues[i]!
    const nx = residues[i + 1]
    if (r.kind === 'protein') {
      if (r.comp === 'CYS' && r.atoms.has('SG')) cys.push(r)
      for (const t of B.get(r.comp) ?? []) {
        const [a, b] = t.atoms as [string, string]
        const p = r.atoms.get(a), q = r.atoms.get(b)
        if (!p || !q) continue
        const key = `${a}-${b}`
        const bb = BB.has(key)
        const type = bb ? key.replace('-', '–') : [el(a), el(b)].sort().join('–')
        push(bb ? 'pbb-bond' : 'psc-bond', 'bond', type, `${lab(r, a)} – ${b}`, r, dist(p, q), t.mu, t.sd)
      }
      for (const t of A.get(r.comp) ?? []) {
        const key = t.atoms.join('-')
        if (!BBA.has(key)) continue
        const [a, b, c] = t.atoms as [string, string, string]
        const p = r.atoms.get(a), q = r.atoms.get(b), s = r.atoms.get(c)
        if (p && q && s) push('pbb-angle', 'angle', key.replace(/-/g, '–'), `${lab(r, a)}–${b}–${c}`, r, angle(p, q, s), t.mu, t.sd)
      }
      if (nx && nx.kind === 'protein' && linked(r, nx, 'C', 'N')) {
        const C = r.atoms.get('C')!, N = nx.atoms.get('N')!, CA = r.atoms.get('CA'), O = r.atoms.get('O'), CA2 = nx.atoms.get('CA'), CD2 = nx.atoms.get('CD')
        const at = `${lab(r, 'C')} – ${lab(nx, 'N')}`
        // Pro acceptor: CCP4 PTRANS targets, reported as separate "→Pro" types so their histograms keep one target.
        const pro = nx.comp === 'PRO'
        const T = pro ? PEPTIDE_PRO : PEPTIDE
        const sfx = pro ? ' →Pro' : ''
        push('pbb-bond', 'bond', `C–N (peptide${pro ? ', →Pro' : ''})`, at, r, dist(C, N), T.CN.mu, T.CN.sd)
        if (CA) push('pbb-angle', 'angle', `CA–C–N${sfx}`, `${lab(r, 'CA')}–C–${lab(nx, 'N')}`, r, angle(CA, C, N), T.CACN.mu, T.CACN.sd)
        if (O) push('pbb-angle', 'angle', `O–C–N${sfx}`, `${lab(r, 'O')}–C–${lab(nx, 'N')}`, r, angle(O, C, N), T.OCN.mu, T.OCN.sd)
        if (CA2) push('pbb-angle', 'angle', `C–N–CA${sfx}`, `${lab(r, 'C')}–${lab(nx, 'N')}–CA`, nx, angle(C, N, CA2), T.CNCA.mu, T.CNCA.sd)
        if (pro && CD2) push('pbb-angle', 'angle', 'C–N–CD →Pro', `${lab(r, 'C')}–${lab(nx, 'N')}–CD`, nx, angle(C, N, CD2), PEPTIDE_PRO.CNCD.mu, PEPTIDE_PRO.CNCD.sd)
      }
    } else if (r.kind === 'nucleic') {
      const d = isDeoxy(r.comp) ? 2 : 0
      const pur = PURINE.has(r.comp)
      const Nn = pur ? 'N9' : 'N1'
      const bond = (a: string, b: string, k: string, ra = r, rb = r, type?: string) => {
        const p = ra.atoms.get(a), q = rb.atoms.get(b)
        const t = NA_BONDS[k]!
        if (p && q) push('nbb-bond', 'bond', type ?? k.replace(/-/g, '–'), `${lab(ra, a)} – ${rb === ra ? b : lab(rb, b)}`, r, dist(p, q), t[d]!, t[d + 1]!)
      }
      const ang = (a: [Residue, string], b: [Residue, string], c: [Residue, string], k: string, type?: string) => {
        const p = a[0].atoms.get(a[1]), q = b[0].atoms.get(b[1]), s = c[0].atoms.get(c[1])
        const t = NA_ANGLES[k]!
        if (p && q && s) push('nbb-angle', 'angle', type ?? k.replace(/-/g, '–'), `${lab(a[0], a[1])}–${b[1]}–${c[1]}`, r, angle(p, q, s), t[d]!, t[d + 1]!)
      }
      const pv = residues[i - 1]
      const prevLinked = !!pv && pv.kind === 'nucleic' && linked(pv, r, "O3'", 'P')
      const nextLinked = !!nx && nx.kind === 'nucleic' && linked(r, nx, "O3'", 'P')
      if (r.atoms.has('P')) bond('P', "O5'", "P-O5'")
      // O5'–C5' / O5'–C5'–C4' targets are for phosphorylated O5' (Gelbin 1996); only scored when P is present.
      if (r.atoms.has('P')) bond("O5'", "C5'", "O5'-C5'")
      bond("C5'", "C4'", "C5'-C4'")
      bond("C4'", "C3'", "C4'-C3'")
      if (nextLinked) bond("C3'", "O3'", "C3'-O3'")
      if (nextLinked) bond("O3'", 'P', "O3'-P", r, nx!)
      bond("C1'", Nn, "C1'-N", r, r, `C1'–${Nn} (glycosidic)`)
      if (prevLinked) ang([pv!, "O3'"], [r, 'P'], [r, "O5'"], "O3'-P-O5'")
      if (r.atoms.has('P')) ang([r, 'P'], [r, "O5'"], [r, "C5'"], "P-O5'-C5'")
      if (r.atoms.has('P')) ang([r, "O5'"], [r, "C5'"], [r, "C4'"], "O5'-C5'-C4'")
      ang([r, "C5'"], [r, "C4'"], [r, "C3'"], "C5'-C4'-C3'")
      if (nextLinked) ang([r, "C4'"], [r, "C3'"], [r, "O3'"], "C4'-C3'-O3'")
      if (nextLinked) ang([r, "C3'"], [r, "O3'"], [nx!, 'P'], "C3'-O3'-P")
      ang([r, "O4'"], [r, "C1'"], [r, Nn], "O4'-C1'-N", `O4'–C1'–${Nn}`)
      ang([r, "C2'"], [r, "C1'"], [r, Nn], "C2'-C1'-N", `C2'–C1'–${Nn}`)
      if (pur) ang([r, "C1'"], [r, 'N9'], [r, 'C4'], "C1'-N9-C4")
      else ang([r, "C1'"], [r, 'N1'], [r, 'C2'], "C1'-N1-C2")
    }
  }
  // Disulfides: _struct_conn (disulf) when the file has it, else SG–SG < 2.5 Å. CCP4 'disulf' link targets.
  const pairs: [Residue, Residue][] = []
  if (disulfides) {
    const byKey = new Map(cys.map((c) => [`${c.chain}|${c.seq}`, c]))
    for (const d of disulfides) {
      if (d.sym1 !== d.sym2 && !(d.sym1 === '1_555' && d.sym2 === '1_555')) continue // crystal-symmetry partner: not measured in the ASU
      const a = byKey.get(`${d.chain1}|${d.seq1}`), b = byKey.get(`${d.chain2}|${d.seq2}`)
      if (a && b && a !== b) pairs.push([a, b])
    }
  } else {
    for (let i = 0; i < cys.length; i++) for (let j = i + 1; j < cys.length; j++) {
      if (dist(cys[i]!.atoms.get('SG')!, cys[j]!.atoms.get('SG')!) < 2.5) pairs.push([cys[i]!, cys[j]!])
    }
  }
  for (const [a, b] of pairs) {
    const sa = a.atoms.get('SG')!, sb = b.atoms.get('SG')!, ca = a.atoms.get('CB'), cb = b.atoms.get('CB')
    push('psc-bond', 'bond', 'S–S (disulfide)', `${lab(a, 'SG')} – ${lab(b, 'SG')}`, a, dist(sa, sb), DISULF.SS.mu, DISULF.SS.sd)
    if (ca) push('psc-angle', 'angle', 'CB–SG–SG (disulfide)', `${lab(a, 'CB')}–SG–${lab(b, 'SG')}`, a, angle(ca, sa, sb), DISULF.CBSGSG.mu, DISULF.CBSGSG.sd)
    if (cb) push('psc-angle', 'angle', 'CB–SG–SG (disulfide)', `${lab(b, 'CB')}–SG–${lab(a, 'SG')}`, b, angle(cb, sb, sa), DISULF.CBSGSG.mu, DISULF.CBSGSG.sd)
    if (ca && cb) push('psc-angle', 'torsion', 'χSS CB–SG–SG–CB', `${lab(a, 'CB')}–SG–SG–${lab(b, 'CB')}`, a, dihedral(ca, sa, sb, cb), null, null)
  }
  return out
}

/** Covalent radii (Cordero et al. 2008), Å — used only for the ligand distance-based distribution. */
const RCOV: Record<string, number> = { H: 0.31, B: 0.84, C: 0.76, N: 0.71, O: 0.66, F: 0.57, P: 1.07, S: 1.05, CL: 1.02, BR: 1.2, I: 1.39, SE: 1.2, SI: 1.11 }

/** Ligand (non-polymer, non-water) intra-residue element-pair distances within r1+r2+0.4 Å. No Z. */
export function ligandBonds(model: MacroModel, residues: Residue[]): GeomItem[] {
  const out: GeomItem[] = []
  for (const r of residues) {
    if (r.kind !== 'other') continue
    const at: { n: string; e: string; p: Vec3 }[] = []
    const seen = new Set<string>()
    for (let i = r.site; i < model.extras.length; i++) {
      const e = model.extras[i]!
      if (`${e.chain}|${e.seq}|${e.comp}` !== r.key) break
      const n = e.atomName.replace(/\*/g, "'")
      if (seen.has(n)) continue // first altloc only
      seen.add(n)
      const E = (model.sites[i]?.element || el(n)).toUpperCase()
      if (RCOV[E] == null || E === 'H') continue
      at.push({ n, e: E, p: model.cart[i]! })
    }
    if (at.length < 2 || at.length > 300) continue
    for (let i = 0; i < at.length; i++) for (let j = i + 1; j < at.length; j++) {
      const a = at[i]!, b = at[j]!
      const d = dist(a.p, b.p)
      if (d > 0.6 && d < RCOV[a.e]! + RCOV[b.e]! + 0.4) {
        const cap = (s: string) => s[0] + s.slice(1).toLowerCase()
        out.push({ group: 'lig-bond', kind: 'bond', type: [cap(a.e), cap(b.e)].sort().join('–'), atoms: `${lab(r, a.n)} – ${b.n}`, res: r, value: d, ideal: null, sigma: null, z: null })
      }
    }
  }
  return out
}

export interface GeomTypeSummary { group: GeomGroup; type: string; kind: GeomItem['kind']; n: number; mean: number; sd: number; ideal: number | null; sigma: number | null; rmsZ: number | null; nZ: number; outliers: number }
export function summarizeGeom(items: GeomItem[]): GeomTypeSummary[] {
  const m = new Map<string, GeomItem[]>()
  for (const it of items) { const k = `${it.group}\u0000${it.type}`; const l = m.get(k) ?? []; l.push(it); m.set(k, l) }
  const out: GeomTypeSummary[] = []
  for (const l of m.values()) {
    const v = l.map((x) => x.value)
    const mean = v.reduce((s, x) => s + x, 0) / v.length
    const sd = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, v.length - 1))
    const zs = l.map((x) => x.z).filter((z): z is number => z != null)
    const ideals = new Set(l.map((x) => x.ideal))
    const f = l[0]!
    out.push({
      group: f.group, type: f.type, kind: f.kind, n: l.length, mean, sd,
      ideal: ideals.size === 1 ? f.ideal : null, sigma: ideals.size === 1 ? f.sigma : null,
      rmsZ: zs.length ? Math.sqrt(zs.reduce((s, z) => s + z * z, 0) / zs.length) : null, nZ: zs.length,
      outliers: zs.filter((z) => Math.abs(z) > 4).length,
    })
  }
  const order = GEOM_GROUPS.map((g) => g.id)
  return out.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || a.type.localeCompare(b.type))
}
