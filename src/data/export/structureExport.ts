/**
 * Coordinate export for Lattice Lab: PDB / mmCIF / CIF / Maestro / XYZ for the asymmetric unit or
 * any displayed cell view (Nearest, Cell whole, Cell atoms) × P1 supercell.
 * ASU exports keep the original space group + symmetry operators; expanded views are written as P1
 * with the displayed (super)cell so they are self-consistent crystal files.
 */
import { cartToFrac, fracToCart } from '../math'
import type { CellParams, Vec3 } from '../types'
import type { ExpandedStructure } from '../cif/types'
import { placeCifStructure } from '../cif/placement'
import { supercellTranslations } from '../supercell'
import { atomsToMmcif, type AtomRec } from '../pdb/formats'
import { covalentBondsGrid, type MacroModel } from '../pdb/macro'

export type ExportView = 'asu' | 'nearest' | 'whole' | 'wrapped'
export type ExportFormat = 'pdb' | 'cif' | 'mmcif' | 'mae' | 'xyz'
export const EXPORT_VIEWS: { v: ExportView; label: string }[] = [
  { v: 'asu', label: 'Asymmetric unit' },
  { v: 'nearest', label: 'Nearest' },
  { v: 'whole', label: 'Cell (whole)' },
  { v: 'wrapped', label: 'Cell (atoms)' },
]
export const EXPORT_FORMATS: { v: ExportFormat; label: string; ext: string; mime: string }[] = [
  { v: 'cif', label: 'CIF', ext: 'cif', mime: 'chemical/x-cif' },
  { v: 'pdb', label: 'PDB', ext: 'pdb', mime: 'chemical/x-pdb' },
  { v: 'mmcif', label: 'mmCIF', ext: 'mmcif.cif', mime: 'chemical/x-mmcif' },
  { v: 'mae', label: 'Maestro', ext: 'mae', mime: 'text/plain' },
  { v: 'xyz', label: 'XYZ', ext: 'xyz', mime: 'chemical/x-xyz' },
]

export interface XAtom extends AtomRec { label: string }
export interface ExportSet {
  atoms: XAtom[]
  cell: CellParams | null
  /** Space group written to CRYST1 / CIF ('P 1' for expanded views). */
  sg: string | null
  /** Symmetry operators (xyz triplets) — ASU only; P1 otherwise. */
  ops: string[]
  title: string
  remarks: string[]
  multiples: [number, number, number]
}

const CHAIN_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('')
const resParts = (s: string) => { const m = /^(-?\d+)([A-Za-z]?)$/.exec(s.trim()); return m ? { seq: parseInt(m[1]!, 10), ins: m[2]! } : { seq: parseInt(s, 10) || 1, ins: '' } }
const elCase = (e: string) => (e ? e[0]!.toUpperCase() + e.slice(1).toLowerCase() : 'X')
const B_PER_U = 8 * Math.PI * Math.PI

/** Asymmetric unit of a PDB entry straight from the macromolecule model (every atom). */
export function macroAsuSet(m: MacroModel): ExportSet {
  const atoms: XAtom[] = m.extras.map((e, i) => {
    const s = m.sites[i]!
    const p = m.cart[i]!
    const r = resParts(e.seq)
    return {
      group: e.hetero ? 'HETATM' : 'ATOM', serial: i + 1, name: e.atomName, alt: '', comp: e.comp, chain: e.chain,
      seq: r.seq, ins: r.ins, x: p[0], y: p[1], z: p[2], occ: s.occupancy ?? 1,
      b: e.b ?? (s.uIso != null ? s.uIso * B_PER_U : 0), el: elCase(s.element), label: s.label,
    }
  })
  return {
    atoms, cell: m.crystal ? m.cell : null, sg: m.crystal ? m.spaceGroupName : null,
    ops: m.crystal ? m.operators.map((o) => o.triplet) : [], title: m.title ?? m.pdbId ?? 'structure', remarks: [], multiples: [1, 1, 1],
  }
}

/** Asymmetric unit of a small-molecule CIF structure. */
export function smallAsuSet(s: ExpandedStructure, title: string): ExportSet {
  const atoms: XAtom[] = s.asymmetric.map((a, i) => {
    const p = fracToCart(a.fractional, s.cell)
    return {
      group: 'HETATM', serial: i + 1, name: a.label.slice(0, 4), alt: '', comp: compOf(a.residue), chain: 'A', seq: 1, ins: '',
      x: p[0], y: p[1], z: p[2], occ: a.occupancy ?? 1, b: a.uIso != null ? a.uIso * B_PER_U : 0, el: elCase(a.element), label: a.label,
    }
  })
  return { atoms, cell: s.cell, sg: s.spaceGroupName, ops: s.operators.map((o) => o.triplet), title, remarks: [], multiples: [1, 1, 1] }
}
const compOf = (r?: string) => (r && /^[A-Za-z0-9]{1,3}$/.test(r) ? r.toUpperCase() : 'UNL')

/**
 * Expanded view: atoms placed as the viewer places them for `mode`, replicated over the supercell.
 * Each (molecule-copy, op, translation) gets its own chain id (macro) / residue number (small molecule)
 * so residues stay distinct after re-parsing. Written in P1 with the supercell lattice.
 */
export function viewSet(
  s: ExpandedStructure, mode: Exclude<ExportView, 'asu'>, opts: {
    multiples?: [number, number, number]; include?: (ai: number) => boolean; selectedOp?: number; title: string
  },
): ExportSet {
  const multiples = opts.multiples ?? [1, 1, 1]
  const placed = placeCifStructure(s, mode, opts.selectedOp ?? 1, null)
  const ts = supercellTranslations(multiples)
  const include = (ai: number) => !placed.hidden?.has(ai) && (opts.include?.(ai) ?? true)
  const atoms: XAtom[] = []
  const chainMap = new Map<string, string>()
  let poolI = 0, wrapped = false
  const resMap = new Map<string, number>()
  for (const t of ts) {
    const d = fracToCart(t, s.cell)
    s.atoms.forEach((a, ai) => {
      if (!include(ai)) return
      const p = placed.positions[ai]!
      const tk = t.join(',')
      let chain: string, seq: number, ins = '', comp: string, name: string, het: boolean
      if (a.pdb) {
        const ck = `${a.pdb.chain}|${a.opIndex}|${tk}`
        let c = chainMap.get(ck)
        if (!c) { c = CHAIN_POOL[poolI % CHAIN_POOL.length]!; if (poolI >= CHAIN_POOL.length) wrapped = true; poolI++; chainMap.set(ck, c) }
        const r = resParts(a.pdb.seq)
        chain = c; seq = r.seq; ins = r.ins; comp = a.pdb.comp; name = a.pdb.atomName; het = a.pdb.hetero
      } else {
        const rk = `${a.moleculeId}|${tk}`
        let n = resMap.get(rk)
        if (n == null) { n = resMap.size + 1; resMap.set(rk, n) }
        chain = 'A'; seq = n; comp = compOf(a.residue); name = a.label.slice(0, 4); het = true
      }
      atoms.push({
        group: het ? 'HETATM' : 'ATOM', serial: atoms.length + 1, name, alt: '', comp, chain, seq, ins,
        x: p[0] + d[0], y: p[1] + d[1], z: p[2] + d[2], occ: a.occupancy ?? 1, b: (a.pdb?.b ?? (a.uIso != null ? a.uIso * B_PER_U : 0)),
        el: elCase(a.element), label: `${a.label}_${atoms.length + 1}`,
      })
    })
  }
  const c = s.cell
  const sc: CellParams = { ...c, a: c.a * multiples[0], b: c.b * multiples[1], c: c.c * multiples[2] }
  const vname = EXPORT_VIEWS.find((v) => v.v === mode)!.label
  const remarks = [
    `Lattice Lab export: ${vname} view, ${multiples.join('x')} cell(s), Cartesian coordinates in the original cell frame.`,
    `Expanded from ${s.spaceGroupName ?? '?'}${s.spaceGroupNumber ? ` (#${s.spaceGroupNumber})` : ''}; written as P 1 with the displayed (super)cell.`,
  ]
  if (wrapped) remarks.push('More than 62 molecule copies: chain IDs repeat.')
  return { atoms, cell: sc, sg: 'P 1', ops: ['x,y,z'], title: opts.title, remarks, multiples }
}

// ---------------- writers ----------------
const fx = (v: number, w: number, d: number) => v.toFixed(d).padStart(w)
function pdbName(name: string, el: string): string {
  if (name.length >= 4) return name.slice(0, 4)
  return el.length === 1 ? ` ${name}`.padEnd(4) : name.padEnd(4)
}

export function toPdb(set: ExportSet, opts: { conect?: boolean } = {}): string {
  const L: string[] = []
  L.push(`HEADER    ${'LATTICE LAB EXPORT'.padEnd(40)}`)
  const title = set.title.toUpperCase().replace(/\s+/g, ' ')
  for (let i = 0; i < title.length || i === 0; i += 70) L.push(`TITLE   ${i ? String(i / 70 + 1).padStart(2) : '  '}${title.slice(i, i + 70)}`)
  set.remarks.forEach((r) => { for (let i = 0; i < r.length; i += 68) L.push(`REMARK 250 ${r.slice(i, i + 68)}`) })
  if (set.cell) {
    const c = set.cell
    L.push(`CRYST1${fx(c.a, 9, 3)}${fx(c.b, 9, 3)}${fx(c.c, 9, 3)}${fx(c.alphaDeg ?? 90, 7, 2)}${fx(c.betaDeg ?? 90, 7, 2)}${fx(c.gammaDeg ?? 90, 7, 2)} ${(set.sg ?? 'P 1').slice(0, 11).padEnd(11)}   1`)
  }
  const serialOf: number[] = []
  let serial = 0, prevChain: string | null = null
  set.atoms.forEach((a, i) => {
    if (prevChain != null && a.chain !== prevChain && set.atoms[i - 1]!.group === 'ATOM') { serial++; L.push(`TER   ${String(serial % 100000).padStart(5)}`) }
    serial++
    serialOf[i] = serial
    prevChain = a.chain
    L.push(
      `${a.group.padEnd(6)}${String(serial % 100000).padStart(5)} ${pdbName(a.name, a.el)}${(a.alt || ' ').slice(0, 1)}${a.comp.slice(0, 3).padStart(3)} ${a.chain.slice(0, 1)}${String(a.seq % 10000).padStart(4)}${(a.ins || ' ').slice(0, 1)}   ${fx(a.x, 8, 3)}${fx(a.y, 8, 3)}${fx(a.z, 8, 3)}${fx(a.occ, 6, 2)}${fx(Math.min(a.b, 999.99), 6, 2)}          ${a.el.toUpperCase().padStart(2)}  `,
    )
  })
  if (opts.conect) {
    for (const [i, j] of hetBonds(set)) L.push(`CONECT${String(serialOf[i]! % 100000).padStart(5)}${String(serialOf[j]! % 100000).padStart(5)}`)
  }
  L.push('END', '')
  return L.join('\n')
}

/** Covalent bonds by distance (all atoms). */
export function exportBonds(set: ExportSet): [number, number][] {
  const cart = set.atoms.map((a) => [a.x, a.y, a.z] as Vec3)
  const els = set.atoms.map((a) => a.el)
  return covalentBondsGrid(cart, els, cart.map((_, i) => i))
}
const hetBonds = (set: ExportSet) => exportBonds(set).filter(([i, j]) => set.atoms[i]!.group === 'HETATM' || set.atoms[j]!.group === 'HETATM')

export function toMmcifText(set: ExportSet): string {
  const c = set.cell
  return atomsToMmcif(set.atoms, {
    id: set.title.replace(/[^A-Za-z0-9_]+/g, '_').slice(0, 40), title: set.title,
    cell: c ? { a: c.a, b: c.b, c: c.c, al: c.alphaDeg ?? 90, be: c.betaDeg ?? 90, ga: c.gammaDeg ?? 90, sg: set.sg } : null,
  })
}

const q = (s: string) => (/^[^\s'"#$_;[\]]+$/.test(s) ? s : `'${s.replace(/'/g, '')}'`)
/** Core-CIF with fractional coordinates (ASU: original space group + ops; views: P 1 supercell). */
export function toCif(set: ExportSet): string {
  if (!set.cell) throw new Error('No unit cell — CIF export needs a crystal lattice (use PDB, mmCIF or XYZ).')
  const c = set.cell
  const name = set.title.replace(/[^A-Za-z0-9_]+/g, '_').slice(0, 60) || 'structure'
  const L = [
    `data_${name}${set.sg === 'P 1' && set.remarks.length ? `_P1_${set.multiples.join('x')}` : ''}`,
    `_audit_creation_method 'crystalspacegroups.com Lattice Lab export'`,
    ...set.remarks.map((r) => `# ${r}`),
    `_symmetry_space_group_name_H-M '${set.sg ?? 'P 1'}'`,
    `_cell_length_a ${c.a.toFixed(5)}`, `_cell_length_b ${c.b.toFixed(5)}`, `_cell_length_c ${c.c.toFixed(5)}`,
    `_cell_angle_alpha ${(c.alphaDeg ?? 90).toFixed(4)}`, `_cell_angle_beta ${(c.betaDeg ?? 90).toFixed(4)}`, `_cell_angle_gamma ${(c.gammaDeg ?? 90).toFixed(4)}`,
    'loop_', '_symmetry_equiv_pos_as_xyz', ...(set.ops.length ? set.ops : ['x,y,z']).map((o) => `'${o.replace(/\s+/g, '')}'`),
    'loop_', '_atom_site_label', '_atom_site_type_symbol', '_atom_site_fract_x', '_atom_site_fract_y', '_atom_site_fract_z',
    '_atom_site_occupancy', '_atom_site_U_iso_or_equiv', '_atom_site_label_comp_id', '_atom_site_auth_asym_id', '_atom_site_auth_seq_id',
  ]
  const seen = new Set<string>()
  set.atoms.forEach((a, i) => {
    let lab = a.label.replace(/\s+/g, '') || `${a.el}${i + 1}`
    if (seen.has(lab)) lab = `${lab}_${i + 1}`
    seen.add(lab)
    const f = cartToFrac([a.x, a.y, a.z], c)
    L.push(`${q(lab)} ${a.el} ${f.map((v) => v.toFixed(6)).join(' ')} ${a.occ.toFixed(3)} ${(a.b / B_PER_U).toFixed(4)} ${q(a.comp)} ${q(a.chain)} ${a.seq}${a.ins}`)
  })
  L.push('')
  return L.join('\n')
}

const ATOMIC = 'X H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi'.split(' ')
const mq = (s: string) => (s === '' ? '""' : /[\s"]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s)
/** Maestro .mae (one f_m_ct with m_atom + m_bond; bond orders are 1 — perceived from distances). */
export function toMae(set: ExportSet): string {
  const bonds = exportBonds(set)
  const c = set.cell
  const L = ['{', '  s_m_m2io_version', '  :::', '  2.0.0', '}', '', 'f_m_ct {', '  s_m_title']
  const props: [string, string][] = []
  if (c) {
    props.push(['r_pdb_PDB_CRYST1_a', c.a.toFixed(4)], ['r_pdb_PDB_CRYST1_b', c.b.toFixed(4)], ['r_pdb_PDB_CRYST1_c', c.c.toFixed(4)],
      ['r_pdb_PDB_CRYST1_alpha', (c.alphaDeg ?? 90).toFixed(3)], ['r_pdb_PDB_CRYST1_beta', (c.betaDeg ?? 90).toFixed(3)], ['r_pdb_PDB_CRYST1_gamma', (c.gammaDeg ?? 90).toFixed(3)],
      ['s_pdb_PDB_CRYST1_Space_Group', set.sg ?? 'P 1'])
  }
  props.forEach(([k]) => L.push(`  ${k}`))
  L.push('  :::', `  ${mq(set.title)}`, ...props.map(([, v]) => `  ${mq(v)}`))
  L.push(`  m_atom[${set.atoms.length}] {`, '    # First column is atom index #',
    '    i_m_mmod_type', '    r_m_x_coord', '    r_m_y_coord', '    r_m_z_coord', '    i_m_residue_number', '    s_m_insertion_code', '    s_m_chain_name',
    '    s_m_pdb_residue_name', '    s_m_pdb_atom_name', '    i_m_atomic_number', '    r_m_pdb_occupancy', '    r_m_pdb_tfactor', '    :::')
  set.atoms.forEach((a, i) => {
    const z = Math.max(0, ATOMIC.indexOf(a.el))
    L.push(`    ${i + 1} 64 ${a.x.toFixed(6)} ${a.y.toFixed(6)} ${a.z.toFixed(6)} ${a.seq} ${mq(a.ins || ' ')} ${mq(a.chain)} ${mq(a.comp.padEnd(4))} ${mq(pdbName(a.name, a.el))} ${z} ${a.occ.toFixed(3)} ${a.b.toFixed(3)}`)
  })
  L.push('    :::', '  }')
  if (bonds.length) {
    L.push(`  m_bond[${bonds.length}] {`, '    # First column is bond index #', '    i_m_from', '    i_m_to', '    i_m_order', '    :::')
    bonds.forEach(([i, j], k) => L.push(`    ${k + 1} ${i + 1} ${j + 1} 1`))
    L.push('    :::', '  }')
  }
  L.push('}', '')
  return L.join('\n')
}

export function toXyz(set: ExportSet): string {
  const c = set.cell
  const comment = `${set.title}${c ? ` | cell ${c.a.toFixed(4)} ${c.b.toFixed(4)} ${c.c.toFixed(4)} ${(c.alphaDeg ?? 90).toFixed(2)} ${(c.betaDeg ?? 90).toFixed(2)} ${(c.gammaDeg ?? 90).toFixed(2)} ${set.sg ?? ''}` : ''}`
  return [String(set.atoms.length), comment.replace(/\n/g, ' '), ...set.atoms.map((a) => `${a.el.padEnd(2)} ${fx(a.x, 12, 5)} ${fx(a.y, 12, 5)} ${fx(a.z, 12, 5)}`), ''].join('\n')
}

export function writeExport(set: ExportSet, fmt: ExportFormat): string {
  switch (fmt) {
    case 'pdb': return toPdb(set, { conect: true })
    case 'cif': return toCif(set)
    case 'mmcif': return toMmcifText(set)
    case 'mae': return toMae(set)
    case 'xyz': return toXyz(set)
  }
}

/** e.g. 4hhb_asu.pdb, 4hhb_whole_2x2x1.cif */
export function exportFileName(base: string, view: ExportView | 'pocket', fmt: ExportFormat, multiples: [number, number, number] = [1, 1, 1]): string {
  const b = (base || 'structure').replace(/[^A-Za-z0-9_.-]+/g, '_').replace(/\.(cif|pdb|ent|mae|maegz|gz)$/i, '').slice(0, 60)
  const m = view !== 'asu' && view !== 'pocket' ? `_${multiples.join('x')}` : ''
  const ext = EXPORT_FORMATS.find((f) => f.v === fmt)!.ext
  return `${b}_${view === 'wrapped' ? 'cell' : view}${m}.${ext}`
}

// ---------------- remote originals ----------------
export function rcsbDownloads(id: string): { label: string; url: string }[] {
  const U = id.toUpperCase(), l = id.toLowerCase()
  return [
    { label: 'mmCIF (.cif)', url: `https://files.rcsb.org/download/${U}.cif` },
    { label: 'PDB (.pdb, if available)', url: `https://files.rcsb.org/download/${U}.pdb` },
    { label: 'PDBML (.xml.gz)', url: `https://files.rcsb.org/download/${U}.xml.gz` },
    { label: 'Biological assembly 1 (.cif)', url: `https://files.rcsb.org/download/${U}-assembly1.cif` },
    { label: 'Structure factors (.cif)', url: `https://files.rcsb.org/download/${U}-sf.cif` },
    { label: 'Validation report (PDF)', url: `https://files.rcsb.org/pub/pdb/validation_reports/${l.slice(1, 3)}/${l}/${l}_full_validation.pdf.gz` },
  ]
}

/** Selected ligand + binding-pocket residues (ASU copies only). */
export function pocketSet(m: MacroModel, ligandAtoms: number[], pocket: { chain: string; seq: string; symCode?: string | null }[], title: string): ExportSet {
  const all = macroAsuSet(m)
  const keep = new Set(pocket.filter((p) => !p.symCode).map((p) => `${p.chain}|${p.seq}`))
  const lig = new Set(ligandAtoms)
  const atoms = all.atoms.filter((_, i) => lig.has(i) || keep.has(`${m.extras[i]!.chain}|${m.extras[i]!.seq}`))
  return { ...all, atoms, title, remarks: [`Lattice Lab export: ligand + pocket (${keep.size} residues within contact range).`] }
}
