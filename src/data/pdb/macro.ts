/**
 * Macromolecule (PDB) model + symmetry expansion for the CIF map.
 * One "molecule" = one whole asymmetric-unit copy per operator, so Nearest
 * pairing / straddle logic works on ASU centroids. Drawn atoms depend on the
 * representation (cartoon / backbone trace / full atoms).
 */
import { applyOperatorRaw, fracToCart } from '../math'
import { getDemo } from '../registry'
import { buildOperatorsFromTriplets } from '../groups/buildOperators'
import type { CellParams, Operator, Vec3 } from '../types'
import type { CifAtomSite, ExpandedStructure, SymmetryBond, SymmetryCopyAtom } from '../cif/types'
import { covalentRadius } from '../cif/molecules'
import type { ParsedMmcif, PdbAtomExtra } from './mmcif'
import { assignSecondary, type SsCode } from './secondary'

export type PdbRepresentation = 'cartoon' | 'trace' | 'full'
export const PDB_REPS: { v: PdbRepresentation; label: string; title: string }[] = [
  { v: 'cartoon', label: 'Cartoon', title: 'Helix ribbons, strand arrows, coil tubes (nucleic acids: P-trace ladder)' },
  { v: 'trace', label: 'Backbone trace', title: 'Cα / P trace lines with small Cα balls (pickable)' },
  { v: 'full', label: 'Full atoms', title: 'Every non-water atom as ball-and-stick' },
]
/** Max drawn atoms (ASU selection × operators) for Full atoms. */
export const PDB_FULL_ATOM_CAP = 150_000
/** Atom cap used by the supercell picker for macromolecules (atoms drawn). */
export const PDB_SUPERCELL_ATOM_CAP = 60_000

const AMINO = new Set('ALA ARG ASN ASP CYS GLN GLU GLY HIS ILE LEU LYS MET PHE PRO SER THR TRP TYR VAL MSE SEC PYL SEP TPO PTR HYP MLY CSO CSD KCX LLP CME OCS'.split(' '))
const NUCLEIC = new Set('A C G U T DA DC DG DT DU I DI'.split(' '))
/** Modified residues that are part of the polymer (not ligands). */
const MODIFIED = new Set('MSE SEP TPO PTR HYP MLY CSO CSD KCX LLP CME OCS PCA ACE NH2 FME'.split(' '))
/** Common ions / buffers / cryoprotectants: listed but flagged. */
export const COMMON_ADDITIVES = new Set(
  'SO4 PO4 GOL EDO PEG PG4 PGE 1PE ACT ACY DMS MPD TRS EPE MES BME CL NA K MG CA ZN MN NI CO CU CD IOD BR FMT IMD NO3 SCN CIT TLA MLI BOG LDA HEZ P6G'.split(' '),
)
export const METALS = new Set('FE ZN MG CA MN CU CO NI NA K CD HG FE2 NI2'.split(' ').map((s) => s[0] + s.slice(1).toLowerCase()))
for (const m of ['Fe', 'Zn', 'Mg', 'Ca', 'Mn', 'Cu', 'Co', 'Ni', 'Na', 'K', 'Cd', 'Hg']) METALS.add(m)

export function isAmino(comp: string) { return AMINO.has(comp) }
export function isNucleic(comp: string) { return NUCLEIC.has(comp) }

export interface LigandInfo {
  /** Deep-link id COMP_CHAIN_SEQ, e.g. HEM_A_142 */
  id: string
  comp: string
  chain: string
  seq: string
  atoms: number[]
  /** Common ion / buffer / additive. */
  additive: boolean
  label: string
}

export interface MacroModel {
  pdbId: string | null
  title: string | null
  method: string | null
  crystal: boolean
  nonCrystalReason?: string
  chains: string[]
  cell: CellParams
  operators: Operator[]
  operatorSource: 'cif' | 'demo' | 'identity'
  spaceGroupNumber: number | null
  spaceGroupName: string | null
  sites: CifAtomSite[]
  extras: PdbAtomExtra[]
  /** Cartesian of the ASU site (site frame, Å) via the app's fracToCart. */
  cart: Vec3[]
  /** Per-atom secondary structure (only meaningful on CA). */
  ss: SsCode[]
  ligands: LigandInfo[]
  /** Fractional centroid of the non-water ASU (for whole-copy unwrapping). */
  centroid: Vec3
  metadata: ExpandedStructure['metadata']
  warnings: string[]
  hasWater: boolean
}

export interface MacroInfo {
  model: MacroModel
  rep: PdbRepresentation
  showWaters: boolean
  /** Site index (into model.sites) for each asymmetric (drawn) atom. */
  siteOf: number[]
  /** Whether Full atoms fits under the cap. */
  fullAllowed: boolean
  fullAtomCount: number
}

export function buildMacroModel(pm: ParsedMmcif): MacroModel {
  const { parsed, extras } = pm
  const warnings = [...parsed.warnings]
  let operators: Operator[]
  let operatorSource: MacroModel['operatorSource']
  if (parsed.cifOperators.length) {
    operators = parsed.cifOperators
    operatorSource = pm.crystal ? 'cif' : 'identity'
  } else {
    const demo = parsed.spaceGroupNumber != null ? getDemo(parsed.spaceGroupNumber) : undefined
    if (demo?.operators?.length) {
      operators = demo.operators
      operatorSource = 'demo'
    } else {
      operators = buildOperatorsFromTriplets(['x,y,z'])
      operatorSource = 'identity'
      if (pm.crystal) warnings.push('Space group not recognised — showing the asymmetric unit only')
    }
  }
  if (!pm.crystal) warnings.unshift(`${pm.nonCrystalReason}: showing the deposited coordinates without crystal symmetry`)
  const cell = parsed.cell
  const cart = parsed.atoms.map((s) => fracToCart(s.fractional, cell))
  const ss = assignSecondary(extras, cart, pm.ss)
  // Ligands: non-polymer, non-water HETATM grouped by residue.
  const ligMap = new Map<string, LigandInfo>()
  extras.forEach((e, i) => {
    if (!e.hetero || e.water || MODIFIED.has(e.comp) || AMINO.has(e.comp) || NUCLEIC.has(e.comp)) return
    const id = `${e.comp}_${e.chain}_${e.seq}`
    let L = ligMap.get(id)
    if (!L) ligMap.set(id, (L = { id, comp: e.comp, chain: e.chain, seq: e.seq, atoms: [], additive: COMMON_ADDITIVES.has(e.comp), label: `${e.comp} ${e.seq} ${e.chain}` }))
    L.atoms.push(i)
  })
  const ligands = [...ligMap.values()].sort((a, b) => Number(a.additive) - Number(b.additive) || b.atoms.length - a.atoms.length)
  const c: Vec3 = [0, 0, 0]
  let n = 0
  parsed.atoms.forEach((s, i) => {
    if (extras[i]!.water) return
    c[0] += s.fractional[0]; c[1] += s.fractional[1]; c[2] += s.fractional[2]; n++
  })
  const centroid: Vec3 = n ? [c[0] / n, c[1] / n, c[2] / n] : [0.5, 0.5, 0.5]
  return {
    pdbId: pm.pdbId, title: pm.title, method: pm.method, crystal: pm.crystal, nonCrystalReason: pm.nonCrystalReason,
    chains: pm.chains, cell, operators, operatorSource, spaceGroupNumber: parsed.spaceGroupNumber, spaceGroupName: parsed.spaceGroupName,
    sites: parsed.atoms, extras, cart, ss, ligands, centroid, metadata: parsed.metadata, warnings,
    hasWater: extras.some((e) => e.water),
  }
}

const isLigandAtom = (e: PdbAtomExtra) => e.hetero && !e.water && !MODIFIED.has(e.comp) && !AMINO.has(e.comp) && !NUCLEIC.has(e.comp)
/** Atoms of a nucleotide used by the ladder cartoon. */
export function ladderAtom(e: PdbAtomExtra): 'P' | 'C1' | 'N' | null {
  if (!NUCLEIC.has(e.comp)) return null
  if (e.atomName === 'P') return 'P'
  if (e.atomName === "C1'" || e.atomName === 'C1*') return 'C1'
  const purine = /G|A|I/.test(e.comp)
  if ((purine && e.atomName === 'N1') || (!purine && e.atomName === 'N3')) return 'N'
  return null
}

/** Site indices drawn for a representation. */
export function selectSites(m: MacroModel, rep: PdbRepresentation, showWaters: boolean): number[] {
  const out: number[] = []
  m.extras.forEach((e, i) => {
    if (e.water) { if (showWaters && rep === 'full') out.push(i); return }
    if (rep === 'full') { out.push(i); return }
    if (isLigandAtom(e)) { out.push(i); return }
    if (e.ca) { out.push(i); return }
    if (rep === 'cartoon') {
      if (AMINO.has(e.comp) && e.atomName === 'O' && !e.hetero) out.push(i)
      else if (ladderAtom(e)) out.push(i)
    } else if (NUCLEIC.has(e.comp) && e.atomName === 'P') out.push(i)
  })
  return out
}

/** Uniform-grid covalent bond search over the given site indices (ASU frame). */
export function covalentBondsGrid(cart: Vec3[], elements: string[], idx: number[], skip?: (i: number, j: number) => boolean): [number, number][] {
  const cs = 2.6
  const grid = new Map<string, number[]>()
  const key = (p: Vec3) => `${Math.floor(p[0] / cs)},${Math.floor(p[1] / cs)},${Math.floor(p[2] / cs)}`
  idx.forEach((i, k) => {
    const kk = key(cart[i]!)
    let g = grid.get(kk)
    if (!g) grid.set(kk, (g = []))
    g.push(k)
  })
  const out: [number, number][] = []
  idx.forEach((i, k) => {
    const p = cart[i]!
    const gx = Math.floor(p[0] / cs), gy = Math.floor(p[1] / cs), gz = Math.floor(p[2] / cs)
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const g = grid.get(`${gx + dx},${gy + dy},${gz + dz}`)
      if (!g) continue
      for (const k2 of g) {
        if (k2 <= k) continue
        const j = idx[k2]!
        if (elements[i] === 'H' && elements[j] === 'H') continue
        const q = cart[j]!
        const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])
        const lim = Math.min((covalentRadius(elements[i]!) + covalentRadius(elements[j]!)) * 1.25, 2.5)
        if (d > 0.4 && d <= lim && !(skip && skip(i, j))) out.push([k, k2])
      }
    }
  })
  return out
}

/** Local-index bonds for a representation. */
function repBonds(m: MacroModel, rep: PdbRepresentation, sel: number[]): [number, number][] {
  const els = m.sites.map((s) => s.element)
  if (rep === 'full') return covalentBondsGrid(m.cart, els, sel, (i, j) => m.extras[i]!.water || m.extras[j]!.water || (m.extras[i]!.chain !== m.extras[j]!.chain && !(els[i] === 'S' && els[j] === 'S')))
  // ligand bonds within each ligand
  const out: [number, number][] = []
  const localOf = new Map(sel.map((s, k) => [s, k]))
  const ligLocal = sel.map((s, k) => (isLigandAtom(m.extras[s]!) ? k : -1)).filter((k) => k >= 0)
  for (const [a, b] of covalentBondsGrid(m.cart, els, ligLocal.map((k) => sel[k]!))) out.push([ligLocal[a]!, ligLocal[b]!])
  if (rep === 'trace') {
    let prev = -1
    for (let k = 0; k < sel.length; k++) {
      const e = m.extras[sel[k]!]!
      if (!(e.ca || (NUCLEIC.has(e.comp) && e.atomName === 'P'))) continue
      if (prev >= 0) {
        const pe = m.extras[sel[prev]!]!
        const p = m.cart[sel[prev]!]!, q = m.cart[sel[k]!]!
        const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])
        if (pe.chain === e.chain && pe.ca === e.ca && d < (e.ca ? 4.3 : 8.0)) out.push([prev, k])
      }
      prev = k
    }
  }
  void localOf
  return out
}

/** Expand a macromolecule for a representation into the shared ExpandedStructure shape. */
export function expandMacro(m: MacroModel, rep: PdbRepresentation, showWaters = false): ExpandedStructure {
  const fullCount = m.extras.reduce((n, e) => n + (e.water && !showWaters ? 0 : 1), 0) * m.operators.length
  const fullAllowed = fullCount <= PDB_FULL_ATOM_CAP
  const effRep: PdbRepresentation = rep === 'full' && !fullAllowed ? 'cartoon' : rep
  const sel = selectSites(m, effRep, showWaters)
  const asymmetric = sel.map((i) => m.sites[i]!)
  const lbonds = repBonds(m, effRep, sel)
  const atoms: SymmetryCopyAtom[] = []
  const bonds: SymmetryBond[] = []
  const moleculeOpIndex: number[] = []
  m.operators.forEach((op, k) => {
    const base = atoms.length
    const c = applyOperatorRaw(op, m.centroid)
    const shift: Vec3 = m.crystal ? [-Math.floor(c[0]), -Math.floor(c[1]), -Math.floor(c[2])] : [0, 0, 0]
    sel.forEach((si, auIndex) => {
      const s = m.sites[si]!
      const r = m.crystal ? applyOperatorRaw(op, s.fractional) : s.fractional
      const disp: Vec3 = [r[0] + shift[0], r[1] + shift[1], r[2] + shift[2]]
      const fr: Vec3 = m.crystal ? [disp[0] - Math.floor(disp[0]), disp[1] - Math.floor(disp[1]), disp[2] - Math.floor(disp[2])] : disp
      const dc = fracToCart(disp, m.cell)
      atoms.push({
        auIndex, label: s.label, element: s.element, opIndex: op.index,
        fractional: fr, cartesian: m.crystal ? fracToCart(fr, m.cell) : dc,
        displayFractional: disp, displayCartesian: dc, moleculeId: k,
        residue: s.residue, occupancy: s.occupancy, uIso: s.uIso, pdb: m.extras[si],
      })
    })
    for (const [a, b] of lbonds) bonds.push({ a: base + a, b: base + b, opIndex: op.index, moleculeId: k })
    moleculeOpIndex.push(op.index)
  })
  const macro: MacroInfo = { model: m, rep: effRep, showWaters, siteOf: sel, fullAllowed, fullAtomCount: fullCount }
  const warnings = [...m.warnings]
  if (rep === 'full' && !fullAllowed) warnings.push(`Full atoms would draw ${fullCount.toLocaleString()} atoms (cap ${PDB_FULL_ATOM_CAP.toLocaleString()}) — showing the cartoon`)
  return {
    cell: m.cell, operators: m.operators, operatorSource: m.operatorSource,
    spaceGroupNumber: m.spaceGroupNumber, spaceGroupName: m.spaceGroupName,
    asymmetric, atoms, bonds, moleculeCount: m.operators.length, moleculeOpIndex,
    hbonds: [], metadata: { ...m.metadata, z: undefined }, warnings, macro,
  }
}
