import { cartToFrac, fracToCart } from '../../math'
import type { Vec3 } from '../../types'
import type { ExpandedStructure } from '../types'
import { parseCifTables } from '../parseCif'
import { BV_PARAMS } from '../bvParams'
import {
  BOND_TOL, IDENT, SymCodes, angleAt, applySym, buildContext, cellVolume, compose, dist, elData, image, invert,
  isBonded, isIdent, isMetal, rVdw, sameAssembly, smAtoms, symKey, torsion,
  type Context, type Img, type Nb, type SmAtom, type Sym,
} from './core'

export type Src = 'computed' | 'cif'
export interface Ref { j: number; g: Sym; cart: Vec3; code: string; label: string }
export interface Focus { key: string; label: string; anchorAu: number; rel: Vec3[]; /** Index pairs into rel to join with lines (default: consecutive). */ lines: [number, number][] }
export interface BondRow { a: Ref; b: Ref; d: number; text: string; type: string; partial: boolean; focus: Focus }
export interface AngleRow { a: Ref; b: Ref; c: Ref; v: number; text: string; type: string; focus: Focus }
export interface TorsionRow { a: Ref; b: Ref; c: Ref; d: Ref; v: number; text: string; hasH: boolean; focus: Focus }
export interface HBondRow { d: Ref; h: Ref | null; a: Ref; dh: number | null; ha: number | null; da: number; dha: number | null; text?: { dh?: string; ha?: string; da?: string; dha?: string }; hModelled: boolean; focus: Focus }
export interface ContactRow { a: Ref; b: Ref; d: number; vdw: number; delta: number; partial: boolean; focus: Focus }
export interface CoordLigand { ref: Ref; d: number; s: number | null }
export interface CoordRow {
  centre: Ref; el: string; cn: number; ligands: CoordLigand[]; polyhedron: string; tau?: { name: string; v: number }
  meanD: number; baurDelta: number; ox: number | null; oxSource: 'cif' | 'assumed' | null; bvs: number | null; bvsNote?: string; focus: Focus
}
export interface Component { atoms: number[]; formula: string; extended: 0 | 1 | 2 | 3 }
export interface Summary {
  formulaCif?: string; asuFormula: string; z?: number; zPrime?: number
  volume: number; densityCif?: number; densityCalc: number; vPerNonH: number | null
  packing: number | null; voidPct: number | null; packingNote?: string
  components: Component[]; moleculesInCell: number; cellContents: string
  nAsu: number; hModelled: boolean; ops: number
}
export interface Histo { key: string; values: number[] }
export interface SmallMolAnalysis {
  atoms: SmAtom[]
  bonds: { computed: BondRow[]; cif: BondRow[] }
  angles: { computed: AngleRow[]; cif: AngleRow[] }
  torsions: { computed: TorsionRow[]; cif: TorsionRow[] }
  hbonds: { computed: HBondRow[]; cif: HBondRow[] }
  contacts: ContactRow[]
  coordination: CoordRow[]
  summary: Summary
  bondHist: Histo[]; angleHist: Histo[]
  symCodes: { code: string; op: string }[]
  caveats: string[]
  criteria: string[]
}

const ANION_DEFAULT: Record<string, number> = { O: -2, N: -3, F: -1, Cl: -1, Br: -1, I: -1, S: -2, Se: -2, Te: -2, P: -3, As: -3, H: -1 }
const DONORS = new Set(['N', 'O', 'F'])
const ACCEPTORS = new Set(['N', 'O', 'F', 'Cl', 'Br', 'S'])
const ANIONS = new Set(['O', 'N', 'F', 'Cl', 'Br', 'I', 'S', 'Se', 'Te', 'H'])

function hill(counts: Map<string, number>): string {
  const fmt = (n: number) => (Math.abs(n - Math.round(n)) < 0.005 ? (Math.round(n) === 1 ? '' : String(Math.round(n))) : n.toFixed(2).replace(/0+$/, ''))
  const els = [...counts.keys()].filter((e) => counts.get(e)! > 1e-6)
  const hasC = els.includes('C')
  els.sort((a, b) => {
    if (hasC) { const r = (e: string) => (e === 'C' ? 0 : e === 'H' ? 1 : 2); if (r(a) !== r(b)) return r(a) - r(b) }
    return a.localeCompare(b)
  })
  return els.map((e) => `${e}${fmt(counts.get(e)!)}`).join(' ')
}
/** Canonical element pair / triple (alphabetical ends) for histogram grouping. */
const pairType = (a: string, b: string) => (a <= b ? `${a}–${b}` : `${b}–${a}`)
const tripleType = (a: string, b: string, c: string) => (a <= c ? `${a}–${b}–${c}` : `${c}–${b}–${a}`)

export interface AnalyzeOptions { cutoff?: number }

export function analyzeSmallMolecule(s: ExpandedStructure, cifText: string, opts: AnalyzeOptions = {}): SmallMolAnalysis {
  const tables = safeTables(cifText)
  const labelCol = tables ? tables.loops.some((l) => l.headers.includes('_atom_site_label')) : true
  const atoms = smAtoms(s, labelCol)
  const ctx = buildContext(s, atoms, opts.cutoff ?? 4.0)
  const codes = new SymCodes()
  const caveats: string[] = []
  const ref = (img: { j: number; g: Sym; cart: Vec3 }): Ref => {
    const code = codes.code(img.g)
    return { j: img.j, g: img.g, cart: img.cart, code, label: atoms[img.j]!.label + (code ? `^${code}` : '') }
  }
  const focus = (key: string, refs: Ref[], label: string, lines?: [number, number][]): Focus => {
    const anchor = refs[0]!.j
    const base = atoms[anchor]!.cart
    // re-express relative to the anchor's identity position (refs[0] might itself be an image)
    const g0inv = invert(refs[0]!.g)
    const rel = refs.map((r) => {
      const f = applySym(g0inv, applySym(r.g, atoms[r.j]!.frac))
      const c = fracToCart(f, ctx.cell)
      return [c[0] - base[0], c[1] - base[1], c[2] - base[2]] as Vec3
    })
    return { key, label, anchorAu: anchor, rel, lines: lines ?? refs.slice(1).map((_, k) => [k, k + 1] as [number, number]) }
  }

  /** For self pairs (i, i@g) keep exactly one of the two equivalent directions, decided by position. */
  const posKey = (f: Vec3) => f.map((v) => Math.round(v * 1000))
  const keepSelf = (i: number, n: Img) => {
    const p = posKey(n.frac), q = posKey(applySym(invert(n.g), atoms[i]!.frac))
    for (let k = 0; k < 3; k++) if (p[k] !== q[k]) return p[k]! < q[k]!
    return true
  }
  // ---- bonded neighbour lists ------------------------------------------------------------------
  const bonded: Nb[][] = ctx.nb.map((list, i) => list.filter((n) => sameAssembly(atoms[i]!, atoms[n.j]!) && isBonded(atoms[i]!.el, atoms[n.j]!.el, n.d)))
  const hModelled = atoms.some((a) => a.el === 'H' || a.el === 'D')

  // ---- bonds -----------------------------------------------------------------------------------
  const bondsC: BondRow[] = []
  for (let i = 0; i < atoms.length; i++) {
    for (const n of bonded[i]!) {
      if (n.j < i) continue
      if (n.j === i && !keepSelf(i, n)) continue
      const a = ref({ j: i, g: IDENT, cart: atoms[i]!.cart }), b = ref(n)
      bondsC.push({ a, b, d: n.d, text: n.d.toFixed(3), type: pairType(atoms[i]!.el, atoms[n.j]!.el), partial: atoms[i]!.occ < 0.99 || atoms[n.j]!.occ < 0.99, focus: focus(`b:${i}:${n.j}:${symKey(n.g)}`, [a, b], `${a.label}–${b.label} ${n.d.toFixed(3)} Å`) })
    }
  }
  // ---- angles ----------------------------------------------------------------------------------
  const anglesC: AngleRow[] = []
  for (let i = 0; i < atoms.length; i++) {
    const L = bonded[i]!
    for (let p = 0; p < L.length; p++) for (let q = p + 1; q < L.length; q++) {
      const n1 = L[p]!, n2 = L[q]!
      if (dist(n1.cart, n2.cart) < 0.3) continue
      const v = angleAt(n1.cart, atoms[i]!.cart, n2.cart)
      const a = ref(n1), b = ref({ j: i, g: IDENT, cart: atoms[i]!.cart }), c = ref(n2)
      anglesC.push({ a, b, c, v, text: v.toFixed(2), type: tripleType(atoms[n1.j]!.el, atoms[i]!.el, atoms[n2.j]!.el), focus: focus(`a:${i}:${p}:${q}`, [b, a, c], `${a.label}–${b.label}–${c.label} ${v.toFixed(2)}°`, [[0, 1], [0, 2]]) })
    }
  }
  // ---- torsions --------------------------------------------------------------------------------
  const torsC: TorsionRow[] = []
  for (const bd of bondsC) {
    const i = bd.a.j, gC = bd.b.g, jC = bd.b.j
    const Cc = bd.b.cart
    if (isMetal(atoms[i]!.el) || isMetal(atoms[jC]!.el)) continue
    for (const na of bonded[i]!) {
      if (dist(na.cart, Cc) < 0.3 || isMetal(atoms[na.j]!.el)) continue
      for (const nd0 of bonded[jC]!) {
        if (isMetal(atoms[nd0.j]!.el)) continue
        const gD = compose(gC, nd0.g)
        const fD = applySym(gD, atoms[nd0.j]!.frac)
        const cD = fracToCart(fD, ctx.cell)
        if (dist(cD, atoms[i]!.cart) < 0.3 || dist(cD, na.cart) < 0.3) continue
        const v = torsion(na.cart, atoms[i]!.cart, Cc, cD)
        const A = ref(na), B = bd.a, C = bd.b, D = ref({ j: nd0.j, g: gD, cart: cD })
        const hasH = [A, D].some((r) => atoms[r.j]!.el === 'H' || atoms[r.j]!.el === 'D')
        torsC.push({ a: A, b: B, c: C, d: D, v, text: v.toFixed(1), hasH, focus: focus(`t:${torsC.length}`, [B, A, C, D], `${A.label}–${B.label}–${C.label}–${D.label} ${v.toFixed(1)}°`, [[1, 0], [0, 2], [2, 3]]) })
      }
    }
  }
  // ---- H-bonds ---------------------------------------------------------------------------------
  const hbC: HBondRow[] = []
  const criteria: string[] = [
    `Bonds: d < r_cov(A) + r_cov(B) + ${BOND_TOL} Å (Cordero 2008 covalent radii; CSD-style tolerance); H···H never bonded; atoms in different disorder groups never paired.`,
    'H-bonds: D ∈ {N, O, F} covalently bonded to H; A ∈ {N, O, F, Cl, Br, S}; H···A < r_vdW(H) + r_vdW(A) − 0.12 Å (Bondi radii) and ∠D–H···A ≥ 110°.',
    'Short contacts: non-bonded, non-1,3 pairs with d < Σ r_vdW (Bondi 1964); elements without a Bondi radius are skipped.',
    'Coordination: ligands are neighbours more electronegative than the centre (O\'Keeffe–Brese c parameter) within min(1.3·d_min, 3.4 Å).',
  ]
  if (hModelled) {
    for (let h = 0; h < atoms.length; h++) {
      if (atoms[h]!.el !== 'H' && atoms[h]!.el !== 'D') continue
      const dn = bonded[h]!.find((n) => DONORS.has(atoms[n.j]!.el))
      if (!dn) continue
      const gi = invert(dn.g) // express with D at identity
      for (const n of ctx.nb[h]!) {
        const el = atoms[n.j]!.el
        if (!ACCEPTORS.has(el) || !sameAssembly(atoms[h]!, atoms[n.j]!)) continue
        if (dist(n.cart, dn.cart) < 0.3) continue
        const lim = (rVdw('H') ?? 1.2) + (rVdw(el) ?? 1.5) - 0.12
        if (n.d >= lim) continue
        const dha = angleAt(dn.cart, atoms[h]!.cart, n.cart)
        if (dha < 110) continue
        const D = ref({ j: dn.j, g: IDENT, cart: atoms[dn.j]!.cart })
        const gH = gi, gA = compose(gi, n.g)
        const H = ref(image(ctx, h, gH)), A = ref(image(ctx, n.j, gA))
        const da = dist(dn.cart, n.cart)
        hbC.push({ d: D, h: H, a: A, dh: dn.d, ha: n.d, da, dha, hModelled: true, focus: focus(`h:${hbC.length}`, [D, H, A], `${D.label}–${H.label}···${A.label}`) })
      }
    }
  } else if (atoms.some((a) => a.el === 'C') && !atoms.some((a) => isMetal(a.el))) {
    for (let i = 0; i < atoms.length; i++) {
      if (!DONORS.has(atoms[i]!.el) && atoms[i]!.el !== 'N') continue
      for (const n of ctx.nb[i]!) {
        if (n.j < i || !(DONORS.has(atoms[n.j]!.el)) || n.d >= 3.2 || n.d < 2.4) continue
        if (n.j === i && !keepSelf(i, n)) continue
        if (bonded[i]!.some((b) => dist(b.cart, n.cart) < 0.3)) continue
        // skip 1,3 pairs (e.g. the two O of a carboxylate)
        if (bonded[i]!.some((b) => isBonded(atoms[b.j]!.el, atoms[n.j]!.el, dist(b.cart, n.cart)))) continue
        const D = ref({ j: i, g: IDENT, cart: atoms[i]!.cart }), A = ref(n)
        hbC.push({ d: D, h: null, a: A, dh: null, ha: null, da: n.d, dha: null, hModelled: false, focus: focus(`h:${hbC.length}`, [D, A], `${D.label}···${A.label}`) })
      }
    }
  }
  // ---- short contacts --------------------------------------------------------------------------
  const contacts: ContactRow[] = []
  for (let i = 0; i < atoms.length; i++) {
    const ri = rVdw(atoms[i]!.el)
    if (ri == null) continue
    for (const n of ctx.nb[i]!) {
      if (n.j < i) continue
      if (n.j === i && !keepSelf(i, n)) continue
      const rj = rVdw(atoms[n.j]!.el)
      if (rj == null || !sameAssembly(atoms[i]!, atoms[n.j]!)) continue
      const vdw = ri + rj
      if (n.d >= vdw) continue
      if (isBonded(atoms[i]!.el, atoms[n.j]!.el, n.d)) continue
      if (bonded[i]!.some((b) => dist(b.cart, n.cart) < 0.3 || isBonded(atoms[b.j]!.el, atoms[n.j]!.el, dist(b.cart, n.cart)))) continue
      const a = ref({ j: i, g: IDENT, cart: atoms[i]!.cart }), b = ref(n)
      contacts.push({ a, b, d: n.d, vdw, delta: n.d - vdw, partial: atoms[i]!.occ < 0.99 || atoms[n.j]!.occ < 0.99, focus: focus(`c:${contacts.length}`, [a, b], `${a.label}···${b.label} ${n.d.toFixed(3)} Å`) })
    }
  }
  contacts.sort((p, q) => p.delta - q.delta)

  // ---- coordination & BVS ----------------------------------------------------------------------
  const oxCif = tables ? oxidationStates(tables.loops) : new Map<string, number>()
  const carbonFree = !atoms.some((a) => a.el === 'C')
  const coordination: CoordRow[] = []
  const en = (e: string) => elData(e)?.bvc ?? 0
  /** Anion-like: an anion-forming element not covalently bonded to a more electronegative non-metal (so S in SO4 is not). */
  const anionLike = atoms.map((a, i) => ANIONS.has(a.el) && a.el !== 'H' && a.el !== 'D' && !bonded[i]!.some((n) => !isMetal(atoms[n.j]!.el) && en(atoms[n.j]!.el) > en(a.el)))
  for (let i = 0; i < atoms.length; i++) {
    const el = atoms[i]!.el
    if (el === 'H' || el === 'D') continue
    if (!(isMetal(el) || (carbonFree && !anionLike[i]))) continue
    const ci = en(el)
    const cand = ctx.nb[i]!.filter((n) => anionLike[n.j] && en(atoms[n.j]!.el) > ci && sameAssembly(atoms[i]!, atoms[n.j]!))
    if (!cand.length) continue
    const dmin = cand[0]!.d
    const lig = cand.filter((n) => n.d <= Math.min(1.3 * dmin, 3.4))
    const C = ref({ j: i, g: IDENT, cart: atoms[i]!.cart })
    const refs = lig.map((n) => ref(n))
    const ds = lig.map((n) => n.d)
    const meanD = ds.reduce((p, q) => p + q, 0) / ds.length
    const baur = ds.reduce((p, q) => p + Math.abs(q - meanD) / meanD, 0) / ds.length
    const angs: number[] = []
    for (let p = 0; p < lig.length; p++) for (let q = p + 1; q < lig.length; q++) angs.push(angleAt(lig[p]!.cart, atoms[i]!.cart, lig[q]!.cart))
    const { polyhedron, tau } = classify(lig.length, angs)
    // BVS
    const anionOx = (e: string) => oxCif.get(e) ?? ANION_DEFAULT[e]
    const bvsFor = (ox: number): { sum: number; s: number[] } | null => {
      const s: number[] = []
      for (const n of lig) {
        const e = atoms[n.j]!.el
        const p = BV_PARAMS[`${el}:${ox}:${e}:${anionOx(e)}`]
        if (!p) return null
        s.push(Math.exp((p[0] - n.d) / p[1]))
      }
      return { sum: s.reduce((x, y) => x + y, 0), s }
    }
    let ox: number | null = oxCif.get(el) ?? null
    let oxSource: CoordRow['oxSource'] = ox != null ? 'cif' : null
    let res = ox != null ? bvsFor(ox) : null
    let bvsNote: string | undefined
    if (ox == null) {
      let best: { ox: number; r: { sum: number; s: number[] } } | null = null
      for (let o = 1; o <= 8; o++) {
        const r = bvsFor(o)
        if (r && (!best || Math.abs(r.sum - o) < Math.abs(best.r.sum - best.ox))) best = { ox: o, r }
      }
      if (best) { ox = best.ox; res = best.r; oxSource = 'assumed' }
    }
    if (!res) bvsNote = ox != null ? `no Brown–Altermatt / Brese–O'Keeffe parameter for ${el}${ox}+ with these ligands` : 'no tabulated parameter'
    coordination.push({
      centre: C, el, cn: lig.length,
      ligands: lig.map((n, k) => ({ ref: refs[k]!, d: n.d, s: res ? res.s[k]! : null })),
      polyhedron, tau, meanD, baurDelta: baur, ox: res ? ox : oxCif.get(el) ?? null, oxSource: res ? oxSource : oxCif.has(el) ? 'cif' : null,
      bvs: res ? res.sum : null, bvsNote,
      focus: focus(`m:${i}`, [C, ...refs], `${C.label} CN ${lig.length}`, refs.map((_, k) => [0, k + 1] as [number, number])),
    })
  }

  // ---- CIF-reported geometry (_geom_*) ---------------------------------------------------------
  const cifRows = tables ? cifGeometry(tables.loops, s, ctx, atoms, ref, focus) : { bonds: [], angles: [], torsions: [], hbonds: [], missing: 0 }
  if (cifRows.missing) caveats.push(`${cifRows.missing} CIF _geom_* row(s) refer to atoms that are not loaded (other disorder group or unmatched label/symmetry code); they are listed without 3D highlight or skipped.`)

  // ---- summary ---------------------------------------------------------------------------------
  const summary = buildSummary(s, ctx, atoms, bonded, tables, hModelled)

  // ---- histograms ------------------------------------------------------------------------------
  const group = <T,>(rows: T[], k: (r: T) => string, v: (r: T) => number): Histo[] => {
    const m = new Map<string, number[]>()
    for (const r of rows) { const key = k(r); if (!m.has(key)) m.set(key, []); m.get(key)!.push(v(r)) }
    return [...m.entries()].map(([key, values]) => ({ key, values })).sort((a, b) => b.values.length - a.values.length || a.key.localeCompare(b.key))
  }
  const bondHist = group(bondsC, (r) => r.type, (r) => r.d)
  const angleHist = group(anglesC, (r) => r.type, (r) => r.v)

  // ---- caveats ---------------------------------------------------------------------------------
  for (const w of s.warnings) if (/disorder|occupancy/i.test(w)) caveats.push(`Parser: ${w}. Only that group is analysed.`)
  if (atoms.some((a) => a.occ < 0.99)) caveats.push('Some sites have partial occupancy; contacts between partially occupied sites (marked ◐) may be mutually exclusive.')
  if (!hModelled && atoms.some((a) => a.el === 'C')) caveats.push('No H atoms are modelled: H-bonds are listed as D···A contacts only, and the computed density, packing coefficient and formula omit H.')
  if (s.operatorSource !== 'cif') caveats.push('Symmetry operators were not read from the CIF; CIF symmetry codes (n_klm) cannot be mapped.')
  if (ctx.reduced) caveats.push('Very large asymmetric unit × operators: neighbour search used the nearest lattice image only.')
  const noVdw = [...new Set(atoms.map((a) => a.el).filter((e) => rVdw(e) == null))]
  if (noVdw.length) caveats.push(`No Bondi van der Waals radius for ${noVdw.join(', ')}: short contacts and packing coefficient skip/omit them.`)
  caveats.push('Computed distances/angles carry no standard uncertainty; esd values in parentheses appear only in CIF-reported (_geom_*) tables.')
  if (coordination.some((c) => c.oxSource === 'assumed')) caveats.push('Oxidation states marked “assumed” were not in the CIF; the state giving the BVS closest to its formal value was chosen.')

  return {
    atoms,
    bonds: { computed: bondsC, cif: cifRows.bonds },
    angles: { computed: anglesC, cif: cifRows.angles },
    torsions: { computed: torsC, cif: cifRows.torsions },
    hbonds: { computed: hbC, cif: cifRows.hbonds },
    contacts, coordination, summary, bondHist, angleHist,
    symCodes: codes.list(), caveats, criteria,
  }
}

function safeTables(text: string) {
  try {
    if (!text) return null
    const t = parseCifTables(text)
    // CIF tags are case-insensitive
    return { pairs: new Map([...t.pairs].map(([k, v]) => [k.toLowerCase(), v])), loops: t.loops.map((l) => ({ headers: l.headers.map((h) => h.toLowerCase()), rows: l.rows })) }
  } catch { return null }
}

function classify(cn: number, angs: number[]): { polyhedron: string; tau?: { name: string; v: number } } {
  const sorted = [...angs].sort((a, b) => b - a)
  if (cn === 1) return { polyhedron: 'terminal' }
  if (cn === 2) return { polyhedron: sorted[0]! > 160 ? 'linear' : 'bent' }
  if (cn === 3) { const sum = angs.reduce((p, q) => p + q, 0); return { polyhedron: sum > 355 ? (sorted[0]! > 150 ? 'T-shaped' : 'trigonal planar') : 'trigonal pyramidal' } }
  if (cn === 4) {
    const t4 = (360 - (sorted[0]! + sorted[1]!)) / 141
    return { polyhedron: t4 > 0.85 ? 'tetrahedral' : t4 < 0.15 ? 'square planar' : 'seesaw / distorted', tau: { name: 'τ4', v: t4 } }
  }
  if (cn === 5) {
    const t5 = (sorted[0]! - sorted[1]!) / 60
    return { polyhedron: t5 > 0.5 ? 'trigonal bipyramidal' : 'square pyramidal', tau: { name: 'τ5', v: t5 } }
  }
  if (cn === 6) {
    const trans = angs.filter((a) => a > 150).length
    return { polyhedron: trans >= 3 ? 'octahedral' : trans === 0 ? 'trigonal prismatic' : 'distorted octahedral' }
  }
  return { polyhedron: `${cn}-coordinate` }
}

type Loop = { headers: string[]; rows: string[][] }
function col(l: Loop, ...names: string[]) { for (const n of names) { const i = l.headers.indexOf(n); if (i >= 0) return i } return -1 }
const num = (s: string | undefined) => { if (s == null || s === '?' || s === '.') return NaN; return parseFloat(s.replace(/\(.*\)$/, '')) }

function oxidationStates(loops: Loop[]): Map<string, number> {
  const m = new Map<string, number>()
  const l = loops.find((x) => x.headers.includes('_atom_type_oxidation_number'))
  if (!l) return m
  const ci = col(l, '_atom_type_symbol'), co = col(l, '_atom_type_oxidation_number')
  const conflict = new Set<string>()
  for (const r of l.rows) {
    const sym = r[ci] ?? ''
    const el = (sym.match(/^[A-Z][a-z]?/) ?? [''])[0]!
    const ox = num(r[co])
    if (!el || !Number.isFinite(ox) || Math.abs(ox - Math.round(ox)) > 1e-6) continue
    if (m.has(el) && m.get(el) !== ox) conflict.add(el)
    m.set(el, ox)
  }
  for (const e of conflict) m.delete(e) // mixed valence: let BVS pick per site
  return m
}

function parseSymCode(code: string | undefined, s: ExpandedStructure): Sym | null {
  if (!code || code === '.' || code === '?' || code === '1_555' || code === '1') return IDENT
  if (s.operatorSource !== 'cif') return null
  const m = code.match(/^(\d+)(?:_(\d)(\d)(\d))?$/)
  if (!m) return null
  const op = s.operators[parseInt(m[1]!, 10) - 1]
  if (!op) return null
  const L = m[2] ? [+m[2] - 5, +m[3]! - 5, +m[4]! - 5] : [0, 0, 0]
  return { R: op.R, t: [op.t[0] + L[0]!, op.t[1] + L[1]!, op.t[2] + L[2]!] }
}

function cifGeometry(loops: Loop[], s: ExpandedStructure, ctx: Context, atoms: SmAtom[], ref: (i: Img) => Ref, focus: (k: string, r: Ref[], l: string, lines?: [number, number][]) => Focus) {
  const byLabel = new Map<string, number>()
  atoms.forEach((_a, i) => { if (!byLabel.has(s.asymmetric[i]!.label)) byLabel.set(s.asymmetric[i]!.label, i) })
  let missing = 0
  const get = (label: string | undefined, code: string | undefined): Ref | null => {
    const j = label != null ? byLabel.get(label) : undefined
    const g = parseSymCode(code, s)
    if (j == null || !g) return null
    return ref(image(ctx, j, g))
  }
  const bonds: BondRow[] = [], angles: AngleRow[] = [], torsions: TorsionRow[] = [], hbonds: HBondRow[] = []
  const lb = loops.find((l) => l.headers.includes('_geom_bond_distance'))
  if (lb) {
    const c1 = col(lb, '_geom_bond_atom_site_label_1'), c2 = col(lb, '_geom_bond_atom_site_label_2'), cd = col(lb, '_geom_bond_distance')
    const s1 = col(lb, '_geom_bond_site_symmetry_1'), s2 = col(lb, '_geom_bond_site_symmetry_2')
    for (const r of lb.rows) {
      const a = get(r[c1], r[s1]), b = get(r[c2], r[s2])
      if (!a || !b) { missing++; continue }
      const d = num(r[cd])
      bonds.push({ a, b, d, text: r[cd]!, type: pairType(atoms[a.j]!.el, atoms[b.j]!.el), partial: atoms[a.j]!.occ < 0.99 || atoms[b.j]!.occ < 0.99, focus: focus(`cb:${bonds.length}`, [a, b], `${a.label}–${b.label} ${r[cd]} Å`) })
    }
  }
  const la = loops.find((l) => l.headers.includes('_geom_angle'))
  if (la) {
    const c = [1, 2, 3].map((k) => col(la, `_geom_angle_atom_site_label_${k}`)), sy = [1, 2, 3].map((k) => col(la, `_geom_angle_site_symmetry_${k}`)), cv = col(la, '_geom_angle')
    for (const r of la.rows) {
      const [a, b, cc] = [0, 1, 2].map((k) => get(r[c[k]!], r[sy[k]!]))
      if (!a || !b || !cc) { missing++; continue }
      angles.push({ a, b, c: cc, v: num(r[cv]), text: r[cv]!, type: tripleType(atoms[a.j]!.el, atoms[b.j]!.el, atoms[cc.j]!.el), focus: focus(`ca:${angles.length}`, [b, a, cc], `${a.label}–${b.label}–${cc.label} ${r[cv]}°`, [[0, 1], [0, 2]]) })
    }
  }
  const lt = loops.find((l) => l.headers.includes('_geom_torsion'))
  if (lt) {
    const c = [1, 2, 3, 4].map((k) => col(lt, `_geom_torsion_atom_site_label_${k}`)), sy = [1, 2, 3, 4].map((k) => col(lt, `_geom_torsion_site_symmetry_${k}`)), cv = col(lt, '_geom_torsion')
    for (const r of lt.rows) {
      const [a, b, cc, d] = [0, 1, 2, 3].map((k) => get(r[c[k]!], r[sy[k]!]))
      if (!a || !b || !cc || !d) { missing++; continue }
      const hasH = [a, d].some((x) => atoms[x.j]!.el === 'H')
      torsions.push({ a, b, c: cc, d, v: num(r[cv]), text: r[cv]!, hasH, focus: focus(`ct:${torsions.length}`, [b, a, cc, d], `${a.label}–${b.label}–${cc.label}–${d.label} ${r[cv]}°`, [[1, 0], [0, 2], [2, 3]]) })
    }
  }
  const lh = loops.find((l) => l.headers.includes('_geom_hbond_atom_site_label_d'))
  if (lh) {
    const cD = col(lh, '_geom_hbond_atom_site_label_d'), cH = col(lh, '_geom_hbond_atom_site_label_h'), cA = col(lh, '_geom_hbond_atom_site_label_a')
    const sA = col(lh, '_geom_hbond_site_symmetry_a')
    const k = ['_geom_hbond_distance_dh', '_geom_hbond_distance_ha', '_geom_hbond_distance_da', '_geom_hbond_angle_dha'].map((n) => col(lh, n))
    for (const r of lh.rows) {
      const D = get(r[cD], '.'), H = r[cH] && r[cH] !== '?' && r[cH] !== '.' ? get(r[cH], '.') : null, A = get(r[cA], r[sA])
      if (!D || !A) { missing++; continue }
      hbonds.push({ d: D, h: H, a: A, dh: num(r[k[0]!]), ha: num(r[k[1]!]), da: num(r[k[2]!]), dha: num(r[k[3]!]), text: { dh: r[k[0]!], ha: r[k[1]!], da: r[k[2]!], dha: r[k[3]!] }, hModelled: !!H, focus: focus(`ch:${hbonds.length}`, H ? [D, H, A] : [D, A], `${D.label}${H ? `–${H.label}` : ''}···${A.label}`) })
    }
  }
  return { bonds, angles, torsions, hbonds, missing }
}

function orbitSize(ctx: Context, x: Vec3): number {
  const seen: Vec3[] = []
  for (const op of ctx.ops) {
    const y = applySym(op, x).map((v) => v - Math.floor(v + 1e-6)) as Vec3
    if (!seen.some((p) => { const d = [0, 1, 2].map((k) => { const t = p[k]! - y[k]!; return t - Math.round(t) }) as Vec3; return dist(fracToCart(d, ctx.cell), [0, 0, 0]) < 0.05 })) seen.push(y)
  }
  return seen.length
}

function buildSummary(s: ExpandedStructure, ctx: Context, atoms: SmAtom[], bonded: Nb[][], tables: ReturnType<typeof safeTables>, hModelled: boolean): Summary {
  const V = cellVolume(ctx.cell)
  const asu = new Map<string, number>(), cellC = new Map<string, number>()
  let mass = 0, nonH = 0
  const orbits = atoms.map((a) => orbitSize(ctx, a.frac))
  atoms.forEach((a, i) => {
    asu.set(a.el, (asu.get(a.el) ?? 0) + a.occ)
    const n = a.occ * orbits[i]!
    cellC.set(a.el, (cellC.get(a.el) ?? 0) + n)
    mass += n * (elData(a.el)?.m ?? 0)
    if (a.el !== 'H' && a.el !== 'D') nonH += n
  })
  const densCifRaw = tables?.pairs.get('_exptl_crystal_density_diffrn')
  const densityCif = densCifRaw ? num(densCifRaw) : undefined

  // components: union-find over bonds within the ASU, then a walk over (atom, operator) images to detect extended networks
  const comp = componentsOf(ctx, atoms, bonded)

  // packing coefficient & void (grid)
  let packing: number | null = null, voidPct: number | null = null, packingNote: string | undefined
  const missingVdw = atoms.some((a) => rVdw(a.el) == null)
  if (comp.some((c) => c.extended > 0)) packingNote = 'not computed: packing coefficient / void are defined for molecular crystals, not extended (network or ionic) structures'
  else if (missingVdw) packingNote = 'not computed: some elements have no Bondi radius'
  else {
    const g = packGrid(ctx, atoms)
    packing = g.packing; voidPct = g.voidPct
    packingNote = `grid ${g.spacing.toFixed(2)} Å; void = space reachable by a 1.2 Å probe (approximate)`
  }
  return {
    formulaCif: s.metadata.formula, asuFormula: hill(asu), z: s.metadata.z, zPrime: s.metadata.zPrime,
    volume: V, densityCif: Number.isFinite(densityCif) ? densityCif : undefined, densityCalc: (mass * 1.66054) / V,
    vPerNonH: nonH > 0 ? V / nonH : null, packing, voidPct, packingNote,
    components: comp, moleculesInCell: s.moleculeCount, cellContents: hill(cellC),
    nAsu: atoms.length, hModelled, ops: ctx.ops.length,
  }
}

function rank(vs: Vec3[]): number {
  const rows = vs.map((v) => [...v])
  let r = 0
  for (let c = 0; c < 3 && r < rows.length; c++) {
    let p = rows.findIndex((row, k) => k >= r && Math.abs(row[c]!) > 1e-6)
    if (p < 0) continue
    ;[rows[r], rows[p]] = [rows[p]!, rows[r]!]
    for (let k = 0; k < rows.length; k++) if (k !== r) { const f = rows[k]![c]! / rows[r]![c]!; for (let q = 0; q < 3; q++) rows[k]![q]! -= f * rows[r]![q]! }
    r++
  }
  return r
}

export function componentsOf(_ctx: Context, atoms: SmAtom[], bonded: Nb[][]): Component[] {
  const parent = atoms.map((_, i) => i)
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x]!)))
  bonded.forEach((L, i) => L.forEach((n) => { parent[find(i)] = find(n.j) }))
  const groups = new Map<number, number[]>()
  atoms.forEach((_, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r)!.push(i) })
  const out: Component[] = []
  for (const members of groups.values()) {
    const rkey = (g: Sym) => `${g.R.flat().map((x) => Math.round(x)).join(',')}|${g.t.map((x) => { const f = x - Math.floor(x + 1e-6); return Math.round(f * 1e4) % 10000 }).join(',')}`
    const seen = new Map<string, Vec3>()
    const diffs: Vec3[] = []
    const q: { j: number; g: Sym }[] = [{ j: members[0]!, g: IDENT }]
    seen.set(`${members[0]}|${rkey(IDENT)}`, applySym(IDENT, atoms[members[0]!]!.frac))
    const frac0 = (j: number, g: Sym) => applySym(g, atoms[j]!.frac)
    let steps = 0
    while (q.length && steps++ < 20000) {
      const cur = q.shift()!
      for (const n of bonded[cur.j]!) {
        const g = compose(cur.g, n.g)
        const key = `${n.j}|${rkey(g)}`
        const pos = frac0(n.j, g)
        const prev = seen.get(key)
        if (prev) {
          const d: Vec3 = [pos[0] - prev[0], pos[1] - prev[1], pos[2] - prev[2]]
          if (d.some((v) => Math.abs(v) > 0.5)) diffs.push(d.map((v) => Math.round(v)) as Vec3)
          continue
        }
        seen.set(key, pos)
        q.push({ j: n.j, g })
      }
    }
    const counts = new Map<string, number>()
    for (const i of members) counts.set(atoms[i]!.el, (counts.get(atoms[i]!.el) ?? 0) + atoms[i]!.occ)
    out.push({ atoms: members, formula: hill(counts), extended: Math.min(3, rank(diffs)) as Component['extended'] })
  }
  void isIdent
  return out
}

function packGrid(ctx: Context, atoms: SmAtom[]) {
  const V = cellVolume(ctx.cell)
  const spacing = Math.max(0.2, Math.cbrt(V / 300000))
  const len = [fracToCart([1, 0, 0], ctx.cell), fracToCart([0, 1, 0], ctx.cell), fracToCart([0, 0, 1], ctx.cell)].map((v) => Math.hypot(...v))
  const n = len.map((l) => Math.max(8, Math.ceil(l / spacing))) as [number, number, number]
  const N = n[0] * n[1] * n[2]
  // reciprocal row norms: fractional extent of a sphere of radius r along axis k is r·|a*_k|
  const inv = [cartToFrac([1, 0, 0], ctx.cell), cartToFrac([0, 1, 0], ctx.cell), cartToFrac([0, 0, 1], ctx.cell)]
  const rs = [0, 1, 2].map((k) => Math.hypot(inv[0]![k]!, inv[1]![k]!, inv[2]![k]!))
  // all atoms in the cell
  const sites: { f: Vec3; r: number }[] = []
  for (const a of atoms) {
    const seen: Vec3[] = []
    for (const op of ctx.ops) {
      const y = applySym(op, a.frac).map((v) => v - Math.floor(v)) as Vec3
      if (seen.some((p) => dist(fracToCart([0, 1, 2].map((k) => { const t = p[k]! - y[k]!; return t - Math.round(t) }) as Vec3, ctx.cell), [0, 0, 0]) < 0.05)) continue
      seen.push(y)
      sites.push({ f: y, r: rVdw(a.el)! })
    }
  }
  const stamp = (grid: Uint8Array, f: Vec3, r: number) => {
    const lo = [0, 1, 2].map((k) => Math.floor((f[k]! - r * rs[k]!) * n[k]!)), hi = [0, 1, 2].map((k) => Math.ceil((f[k]! + r * rs[k]!) * n[k]!))
    const r2 = r * r
    for (let a = lo[0]!; a <= hi[0]!; a++) for (let b = lo[1]!; b <= hi[1]!; b++) for (let c = lo[2]!; c <= hi[2]!; c++) {
      const d = fracToCart([a / n[0] - f[0], b / n[1] - f[1], c / n[2] - f[2]], ctx.cell)
      if (d[0] * d[0] + d[1] * d[1] + d[2] * d[2] > r2) continue
      const ia = ((a % n[0]) + n[0]) % n[0], ib = ((b % n[1]) + n[1]) % n[1], ic = ((c % n[2]) + n[2]) % n[2]
      grid[(ia * n[1] + ib) * n[2] + ic] = 1
    }
  }
  const occ = new Uint8Array(N)
  for (const s of sites) stamp(occ, s.f, s.r)
  let filled = 0
  for (let k = 0; k < N; k++) filled += occ[k]!
  const probe = 1.2
  const blocked = new Uint8Array(N)
  for (const s of sites) stamp(blocked, s.f, s.r + probe)
  const voidG = new Uint8Array(N)
  for (let a = 0; a < n[0]; a++) for (let b = 0; b < n[1]; b++) for (let c = 0; c < n[2]; c++) {
    if (blocked[(a * n[1] + b) * n[2] + c]) continue
    stamp(voidG, [a / n[0], b / n[1], c / n[2]], probe)
  }
  let v = 0
  for (let k = 0; k < N; k++) v += voidG[k]!
  return { packing: filled / N, voidPct: (100 * v) / N, spacing: Math.max(...len.map((l, k) => l / n[k]!)) }
}

// ---- CSV & report -------------------------------------------------------------------------------
const q = (s: string | number | null | undefined) => { const t = s == null ? '' : String(s); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t }
export function analysisCsv(r: SmallMolAnalysis, src: Src = 'computed'): string {
  const L: string[] = []
  const pick = <T,>(x: { computed: T[]; cif: T[] }) => (src === 'cif' && x.cif.length ? x.cif : x.computed)
  const srcName = (n: number) => (src === 'cif' && n ? 'CIF _geom_*' : 'computed')
  const s = r.summary
  L.push('# Summary', 'key,value')
  const kv: [string, string | number | undefined | null][] = [
    ['formula (CIF)', s.formulaCif], ['ASU contents', s.asuFormula], ['cell contents', s.cellContents], ['Z', s.z], ["Z'", s.zPrime],
    ['V (Å3)', s.volume.toFixed(2)], ['density CIF (g/cm3)', s.densityCif], ['density calc (g/cm3)', s.densityCalc.toFixed(3)],
    ['V per non-H atom (Å3)', s.vPerNonH?.toFixed(2)], ['packing coefficient', s.packing?.toFixed(3)], ['void % (1.2 Å probe)', s.voidPct?.toFixed(1)],
    ['ASU components', s.components.map((c) => `${c.formula}${c.extended ? ` (${c.extended}D extended)` : ''}`).join('; ')],
  ]
  for (const [k, v] of kv) L.push(`${q(k)},${q(v)}`)
  const bonds = pick(r.bonds)
  L.push('', `# Bonds (${srcName(r.bonds.cif.length)})`, 'atom1,atom2,type,d_A')
  for (const b of bonds) L.push([b.a.label, b.b.label, b.type, b.text].map(q).join(','))
  const ang = pick(r.angles)
  L.push('', `# Angles (${srcName(r.angles.cif.length)})`, 'atom1,atom2,atom3,type,angle_deg')
  for (const a of ang) L.push([a.a.label, a.b.label, a.c.label, a.type, a.text].map(q).join(','))
  const tor = pick(r.torsions)
  L.push('', `# Torsions (${srcName(r.torsions.cif.length)})`, 'atom1,atom2,atom3,atom4,torsion_deg')
  for (const t of tor) L.push([t.a.label, t.b.label, t.c.label, t.d.label, t.text].map(q).join(','))
  const hb = pick(r.hbonds)
  L.push('', `# Hydrogen bonds (${srcName(r.hbonds.cif.length)})`, 'D,H,A,D-H,H...A,D...A,D-H...A')
  for (const h of hb) L.push([h.d.label, h.h?.label ?? '(H not modelled)', h.a.label, h.text?.dh ?? h.dh?.toFixed(3), h.text?.ha ?? h.ha?.toFixed(3), h.text?.da ?? h.da.toFixed(3), h.text?.dha ?? h.dha?.toFixed(1)].map(q).join(','))
  L.push('', '# Short contacts (d < sum of Bondi vdW radii)', 'atom1,atom2,d_A,sum_vdW_A,delta_A')
  for (const c of r.contacts) L.push([c.a.label, c.b.label, c.d.toFixed(3), c.vdw.toFixed(2), c.delta.toFixed(3)].map(q).join(','))
  L.push('', '# Coordination / bond valence', 'centre,CN,polyhedron,tau,mean_d_A,Baur_delta,ox_state,ox_source,BVS,ligands')
  for (const c of r.coordination) L.push([c.centre.label, c.cn, c.polyhedron, c.tau ? `${c.tau.name}=${c.tau.v.toFixed(2)}` : '', c.meanD.toFixed(3), c.baurDelta.toFixed(4), c.ox, c.oxSource, c.bvs?.toFixed(2), c.ligands.map((l) => `${l.ref.label} ${l.d.toFixed(3)}`).join('; ')].map(q).join(','))
  L.push('', '# Symmetry codes', 'code,operator')
  for (const c of r.symCodes) L.push(`${q(c.code)},${q(c.op)}`)
  L.push('', '# Caveats')
  for (const c of r.caveats) L.push(q(c))
  return L.join('\n') + '\n'
}
