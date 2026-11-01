/**
 * Other macromolecule formats → mmCIF text, so the existing PDB pipeline
 * (parseMmcif → buildMacroModel) is reused unchanged.
 *  - Legacy PDB (.pdb / .ent): CRYST1, SCALEn, ATOM/HETATM (model 1), SEQRES,
 *    HELIX/SHEET, EXPDTA, TITLE, HEADER, REMARK 2 resolution. CONECT is read
 *    (count reported) — bonds are still perceived from distances.
 *  - Schrödinger Maestro (.mae; .maegz/.mae.gz gunzipped by the caller):
 *    first f_m_ct block, m_atom table, m_bond table, optional PDB CRYST1 props.
 */
import { looksLikeMmcif } from './mmcif'

export type StructureFormat = 'mmcif' | 'pdb' | 'mae' | 'cif'

export const AMINO3 = 'ALA ARG ASN ASP CYS GLN GLU GLY HIS ILE LEU LYS MET PHE PRO SER THR TRP TYR VAL MSE SEC PYL'.split(' ')
const NUC = new Set('A C G U T DA DC DG DT DU I DI'.split(' '))
const WATER = new Set(['HOH', 'WAT', 'DOD', 'H2O', 'SPC', 'T3P', 'TIP3'])

export function looksLikePdb(text: string): boolean {
  return /^(ATOM  |HETATM)[ \d]{5} /m.test(text) && /^(ATOM  |HETATM).{24}\s*-?\d+\.\d{3}/m.test(text)
}
export function looksLikeMae(text: string): boolean {
  return /(^|\n)\s*f_m_ct\s*\{/.test(text) || /^\s*\{\s*\n?\s*s_m_m2io_version/.test(text)
}

export function detectFormat(text: string, name = ''): StructureFormat {
  const n = name.toLowerCase()
  if (looksLikeMmcif(text)) return 'mmcif'
  if (looksLikeMae(text) || /\.mae(gz)?$/.test(n)) return looksLikeMae(text) ? 'mae' : 'cif'
  if (looksLikePdb(text) || ((/\.(pdb|ent)$/.test(n)) && /^(ATOM|HETATM)/m.test(text))) return 'pdb'
  return 'cif'
}

/** File name for pasted text by detected format (keeps the historic .cif names for CIF). */
export function pastedName(text: string, cifName: string): string {
  const f = detectFormat(text)
  if (f === 'pdb') return 'pasted.pdb'
  if (f === 'mae') return 'pasted.mae'
  return cifName
}

// ---------------- mmCIF writer ----------------
function q(v: string | number | null | undefined): string {
  if (v == null) return '?'
  const s = String(v)
  if (s === '') return '.'
  if (/\s/.test(s) || /^[_#$'";[\]]/.test(s) || s === '.' || s === '?') {
    return s.includes("'") ? `"${s}"` : `'${s}'`
  }
  return s
}
function pair(lines: string[], key: string, v: string | number | null | undefined) {
  if (v == null || v === '') return
  lines.push(`${key} ${q(v)}`)
}
function loop(lines: string[], cat: string, cols: string[], rows: (string | number | null)[][]) {
  if (!rows.length) return
  lines.push('#', 'loop_', ...cols.map((c) => `${cat}.${c}`))
  for (const r of rows) lines.push(r.map(q).join(' '))
}

export interface AtomRec {
  group: 'ATOM' | 'HETATM'; serial: number; name: string; alt: string; comp: string; chain: string
  seq: number; ins: string; x: number; y: number; z: number; occ: number; b: number; el: string
}
export interface ConvertMeta {
  id?: string | null; title?: string | null; method?: string | null; resolution?: number | null
  cell?: { a: number; b: number; c: number; al: number; be: number; ga: number; sg: string | null } | null
  scale?: number[][] | null; scaleV?: number[] | null
  helix?: { chain: string; from: number; to: number }[]; sheet?: { chain: string; from: number; to: number }[]
  seqres?: Map<string, string[]>
}

/** Map SEQRES components onto observed residues (order-preserving identity alignment) → numbering. */
export function seqresNumbering(seqres: string[], observed: { comp: string; num: string }[]): (string | null)[] {
  const n = seqres.length, m = observed.length
  // DP: maximise matches, gaps free (LCS) — observed order is preserved.
  const S: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    S[i]![j] = Math.max(S[i - 1]![j]!, S[i]![j - 1]!, S[i - 1]![j - 1]! + (seqres[i - 1] === observed[j - 1]!.comp ? 1 : -1e-3))
  }
  const out: (string | null)[] = new Array(n).fill(null)
  let i = n, j = m
  while (i > 0 && j > 0) {
    const d = S[i - 1]![j - 1]! + (seqres[i - 1] === observed[j - 1]!.comp ? 1 : -1e-3)
    if (Math.abs(S[i]![j]! - d) < 1e-9) { out[i - 1] = observed[j - 1]!.num; i--; j-- }
    else if (S[i]![j] === S[i - 1]![j]) i--
    else j--
  }
  return out
}

export function atomsToMmcif(atoms: AtomRec[], meta: ConvertMeta): string {
  const L: string[] = [`data_${(meta.id ?? 'converted').replace(/\s+/g, '_')}`]
  pair(L, '_entry.id', meta.id ?? null)
  pair(L, '_struct.title', meta.title ?? null)
  if (meta.method) {
    const ms = meta.method.split(/\s*;\s*/).filter(Boolean)
    if (ms.length === 1) pair(L, '_exptl.method', ms[0]!)
    else loop(L, '_exptl', ['method'], ms.map((m) => [m]))
  }
  if (meta.resolution != null) pair(L, '_refine.ls_d_res_high', meta.resolution)
  if (meta.cell) {
    const c = meta.cell
    pair(L, '_cell.length_a', c.a); pair(L, '_cell.length_b', c.b); pair(L, '_cell.length_c', c.c)
    pair(L, '_cell.angle_alpha', c.al); pair(L, '_cell.angle_beta', c.be); pair(L, '_cell.angle_gamma', c.ga)
    pair(L, '_symmetry.space_group_name_H-M', c.sg)
  }
  if (meta.scale) {
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) pair(L, `_atom_sites.fract_transf_matrix[${i + 1}][${j + 1}]`, meta.scale[i]![j]!)
    for (let i = 0; i < 3; i++) pair(L, `_atom_sites.fract_transf_vector[${i + 1}]`, meta.scaleV?.[i] ?? 0)
  }
  loop(L, '_struct_conf', ['conf_type_id', 'id', 'beg_auth_asym_id', 'beg_auth_seq_id', 'end_auth_seq_id'],
    (meta.helix ?? []).map((h, k) => ['HELX_P', `HELX_P${k + 1}`, h.chain, h.from, h.to]))
  loop(L, '_struct_sheet_range', ['id', 'beg_auth_asym_id', 'beg_auth_seq_id', 'end_auth_seq_id'],
    (meta.sheet ?? []).map((h, k) => [String(k + 1), h.chain, h.from, h.to]))
  if (meta.seqres?.size) {
    const rows: (string | number | null)[][] = []
    for (const [chain, comps] of meta.seqres) {
      const seen: { comp: string; num: string }[] = []
      const got = new Set<string>()
      for (const a of atoms) {
        if (a.chain !== chain) continue
        const num = `${a.seq}${a.ins}`
        if (got.has(num)) continue
        got.add(num)
        if (a.group === 'ATOM' || AMINO3.includes(a.comp) || NUC.has(a.comp) || a.comp === 'MSE') seen.push({ comp: a.comp, num })
      }
      const nums = seqresNumbering(comps, seen)
      comps.forEach((comp, k) => rows.push([chain, k + 1, comp, nums[k] ?? '?', chain]))
    }
    loop(L, '_pdbx_poly_seq_scheme', ['asym_id', 'seq_id', 'mon_id', 'pdb_seq_num', 'pdb_strand_id'], rows)
  }
  loop(L, '_atom_site',
    ['group_PDB', 'id', 'type_symbol', 'label_atom_id', 'label_alt_id', 'label_comp_id', 'label_asym_id', 'auth_seq_id', 'pdbx_PDB_ins_code', 'Cartn_x', 'Cartn_y', 'Cartn_z', 'occupancy', 'B_iso_or_equiv', 'auth_comp_id', 'auth_asym_id', 'auth_atom_id', 'pdbx_PDB_model_num'],
    atoms.map((a) => [a.group, a.serial, a.el || 'X', a.name, a.alt || '.', a.comp, a.chain, a.seq, a.ins || '?', a.x.toFixed(3), a.y.toFixed(3), a.z.toFixed(3), a.occ.toFixed(2), a.b.toFixed(2), a.comp, a.chain, a.name, 1]))
  L.push('#', '')
  return L.join('\n')
}

// ---------------- legacy PDB ----------------
const col = (l: string, a: number, b: number) => l.slice(a - 1, b).trim()
const fnum = (s: string, d = 0) => { const v = parseFloat(s); return Number.isFinite(v) ? v : d }

function elementFromName(raw4: string, comp: string): string {
  // PDB convention: element right-justified in cols 13-14.
  const two = raw4.slice(0, 2)
  if (/^[A-Z]{2}$/i.test(two.trim()) && two[0] !== ' ' && !AMINO3.includes(comp) && !NUC.has(comp)) {
    const e = two[0]!.toUpperCase() + two[1]!.toLowerCase()
    if (/^(Fe|Zn|Mg|Ca|Mn|Cu|Co|Ni|Na|Cl|Br|Cd|Hg|Se|Pt|Au|Ag)$/.test(e)) return e
  }
  const t = raw4.replace(/^[\d\s]+/, '')
  return (t[0] ?? 'X').toUpperCase()
}

export interface PdbParseInfo { conect: number; models: number }

export function pdbToMmcif(text: string): { mmcif: string; info: PdbParseInfo } {
  const atoms: AtomRec[] = []
  const meta: ConvertMeta = { helix: [], sheet: [], seqres: new Map() }
  const title: string[] = []
  const methods: string[] = []
  const scale: number[][] = [], scaleV: number[] = []
  let models = 0, inModel = false, done = false, conect = 0
  for (const raw of text.split(/\r?\n/)) {
    const l = raw.padEnd(80)
    const rec = l.slice(0, 6)
    if (rec === 'HEADER') { const id = col(l, 63, 66); if (id) meta.id = id }
    else if (rec === 'TITLE ') title.push(col(l, 11, 80))
    else if (rec === 'EXPDTA') methods.push(col(l, 11, 79))
    else if (rec === 'REMARK' && col(l, 7, 10) === '2' && /RESOLUTION\./.test(l)) {
      const m = /RESOLUTION\.\s*([\d.]+)/.exec(l); if (m) meta.resolution = parseFloat(m[1]!)
    } else if (rec === 'CRYST1') {
      meta.cell = { a: fnum(col(l, 7, 15)), b: fnum(col(l, 16, 24)), c: fnum(col(l, 25, 33)), al: fnum(col(l, 34, 40), 90), be: fnum(col(l, 41, 47), 90), ga: fnum(col(l, 48, 54), 90), sg: col(l, 56, 66) || null }
    } else if (/^SCALE[123]$/.test(rec)) {
      const i = parseInt(rec[5]!, 10) - 1
      scale[i] = [fnum(col(l, 11, 20)), fnum(col(l, 21, 30)), fnum(col(l, 31, 40))]
      scaleV[i] = fnum(col(l, 46, 55))
    } else if (rec === 'SEQRES') {
      const ch = l[11]!.trim() || 'A'
      const list = meta.seqres!.get(ch) ?? []
      list.push(...col(l, 20, 80).split(/\s+/).filter(Boolean))
      meta.seqres!.set(ch, list)
    } else if (rec === 'HELIX ') {
      meta.helix!.push({ chain: l[19]!.trim() || 'A', from: parseInt(col(l, 22, 25), 10), to: parseInt(col(l, 34, 37), 10) })
    } else if (rec === 'SHEET ') {
      meta.sheet!.push({ chain: l[21]!.trim() || 'A', from: parseInt(col(l, 23, 26), 10), to: parseInt(col(l, 34, 37), 10) })
    } else if (rec === 'MODEL ') { models++; if (models > 1) done = true; inModel = true }
    else if (rec === 'ENDMDL') { if (inModel) done = true }
    else if (rec === 'CONECT') conect++
    else if ((rec === 'ATOM  ' || rec === 'HETATM') && !done) {
      const name4 = l.slice(12, 16)
      const comp = col(l, 18, 21) || 'UNK'
      const elCol = col(l, 77, 78)
      const el = elCol ? (elCol.length > 1 ? elCol[0]!.toUpperCase() + elCol.slice(1).toLowerCase() : elCol.toUpperCase()) : elementFromName(name4, comp)
      atoms.push({
        group: rec === 'ATOM  ' ? 'ATOM' : 'HETATM', serial: parseInt(col(l, 7, 11), 10) || atoms.length + 1,
        name: name4.trim(), alt: l[16]!.trim(), comp, chain: l[21]!.trim() || 'A',
        seq: parseInt(col(l, 23, 26), 10) || 0, ins: l[26]!.trim(),
        x: fnum(col(l, 31, 38)), y: fnum(col(l, 39, 46)), z: fnum(col(l, 47, 54)),
        occ: fnum(col(l, 55, 60), 1), b: fnum(col(l, 61, 66), 0), el,
      })
    }
  }
  if (!atoms.length) throw new Error('PDB file has no ATOM/HETATM records')
  if (title.length) meta.title = title.join(' ').replace(/\s+/g, ' ').trim()
  if (methods.length) meta.method = methods.join('; ')
  if (scale.length === 3 && scale.every(Boolean)) { meta.scale = scale; meta.scaleV = scaleV }
  return { mmcif: atomsToMmcif(atoms, meta), info: { conect, models } }
}

// ---------------- Maestro ----------------
const ELEMENTS = 'X H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi'.split(' ')

export interface MaeBlock { name: string; props: Map<string, string | null>; rows?: Map<string, (string | null)[]>; nRows?: number; children: MaeBlock[] }

function maeTokens(text: string): string[] {
  const out: string[] = []
  const re = /"((?:\\.|[^"\\])*)"|(\S+)/g
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(t))) {
      if (m[1] != null) out.push('\u0001' + m[1].replace(/\\(.)/g, '$1'))
      else {
        // split braces glued to words
        for (const p of m[2]!.split(/([{}])/)) if (p) out.push(p)
      }
    }
  }
  return out
}
const val = (t: string): string | null => (t === '<>' ? null : t.startsWith('\u0001') ? t.slice(1) : t)

/** Parse all top-level blocks of a Maestro file. */
export function readMae(text: string): MaeBlock[] {
  const tk = maeTokens(text)
  let i = 0
  const block = (name: string): MaeBlock => {
    // tk[i] === '{'
    i++
    const keys: string[] = []
    while (i < tk.length && tk[i] !== ':::' && tk[i] !== '}') keys.push(tk[i++]!)
    const b: MaeBlock = { name, props: new Map(), children: [] }
    if (tk[i] === '}') { i++; return b }
    i++ // :::
    const idx = /\[(\d+)\]$/.exec(name)
    if (idx) {
      const n = parseInt(idx[1]!, 10)
      b.nRows = n
      b.rows = new Map(keys.map((k) => [k, [] as (string | null)[]]))
      const cols = keys.map((k) => b.rows!.get(k)!)
      for (let r = 0; r < n && i < tk.length; r++) {
        i++ // row index
        for (let c = 0; c < keys.length; c++) cols[c]!.push(val(tk[i++] ?? '<>'))
      }
      if (tk[i] === ':::') i++
      while (i < tk.length && tk[i] !== '}') i++
      i++
      return b
    }
    for (const k of keys) b.props.set(k, val(tk[i++] ?? '<>'))
    while (i < tk.length && tk[i] !== '}') {
      const nm = tk[i++]!
      if (tk[i] === '{') b.children.push(block(nm))
    }
    i++
    return b
  }
  const out: MaeBlock[] = []
  while (i < tk.length) {
    if (tk[i] === '{') out.push(block(''))
    else if (tk[i + 1] === '{') { const nm = tk[i++]!; out.push(block(nm)) }
    else i++
  }
  return out
}

export interface MaeParseInfo { bonds: number; title: string | null; cts: number }

export function maeToMmcif(text: string): { mmcif: string; info: MaeParseInfo } {
  const blocks = readMae(text)
  const cts = blocks.filter((b) => /^[fp]_m_ct$/.test(b.name))
  const ct = cts[0]
  if (!ct) throw new Error('Maestro file has no f_m_ct block')
  const atomB = ct.children.find((c) => c.name.startsWith('m_atom['))
  if (!atomB?.rows) throw new Error('Maestro ct has no m_atom table')
  const R = atomB.rows
  const colOf = (...ks: string[]) => { for (const k of ks) { const c = R.get(k); if (c) return c } return null }
  const xs = colOf('r_m_x_coord'), ys = colOf('r_m_y_coord'), zs = colOf('r_m_z_coord')
  if (!xs || !ys || !zs) throw new Error('Maestro m_atom table has no coordinates')
  const anum = colOf('i_m_atomic_number'), resn = colOf('s_m_pdb_residue_name'), resi = colOf('i_m_residue_number')
  const ins = colOf('s_m_insertion_code'), chain = colOf('s_m_chain_name'), pname = colOf('s_m_pdb_atom_name'), aname = colOf('s_m_atom_name')
  const occ = colOf('r_m_pdb_occupancy'), bf = colOf('r_m_pdb_tfactor'), het = colOf('i_m_pdb_convert_problem')
  void het
  const atoms: AtomRec[] = []
  const n = atomB.nRows ?? xs.length
  const nameCount = new Map<string, number>()
  for (let k = 0; k < n; k++) {
    const z = anum ? parseInt(anum[k] ?? '0', 10) : 0
    const el = ELEMENTS[z] ?? (pname?.[k]?.trim()[0] ?? 'X')
    const comp = (resn?.[k] ?? '').trim() || 'UNL'
    const ch = (chain?.[k] ?? '').trim() || 'A'
    const seq = parseInt(resi?.[k] ?? '1', 10) || 1
    let name = (pname?.[k] ?? aname?.[k] ?? '').trim()
    const rk = `${ch}|${seq}|${comp}`
    if (!name) { const c = (nameCount.get(rk + el) ?? 0) + 1; nameCount.set(rk + el, c); name = `${el.toUpperCase()}${c}` }
    const poly = AMINO3.includes(comp) || NUC.has(comp) || ['HIE', 'HID', 'HIP', 'CYX', 'ASH', 'GLH', 'LYN', 'ARN'].includes(comp)
    atoms.push({
      group: poly ? 'ATOM' : 'HETATM', serial: k + 1, name, alt: '', comp: normalizeComp(comp), chain: ch, seq,
      ins: (ins?.[k] ?? '').trim(), x: parseFloat(xs[k]!), y: parseFloat(ys[k]!), z: parseFloat(zs[k]!),
      occ: occ?.[k] != null ? parseFloat(occ[k]!) : 1, b: bf?.[k] != null ? parseFloat(bf[k]!) : 0, el,
    })
    if (WATER.has(comp)) atoms[atoms.length - 1]!.comp = 'HOH'
  }
  const bondB = ct.children.find((c) => c.name.startsWith('m_bond['))
  const P = (k: string) => ct.props.get(k) ?? null
  const ca = P('r_pdb_PDB_CRYST1_a'), cb = P('r_pdb_PDB_CRYST1_b'), cc = P('r_pdb_PDB_CRYST1_c')
  const title = P('s_m_title') ?? P('s_pdb_PDB_TITLE')
  const meta: ConvertMeta = {
    id: P('s_pdb_PDB_ID') ?? null,
    title,
    method: P('s_pdb_PDB_EXPDTA') ?? null,
    resolution: P('r_pdb_PDB_RESOLUTION') != null ? parseFloat(P('r_pdb_PDB_RESOLUTION')!) : null,
    cell: ca && cb && cc ? {
      a: parseFloat(ca), b: parseFloat(cb), c: parseFloat(cc),
      al: parseFloat(P('r_pdb_PDB_CRYST1_alpha') ?? '90'), be: parseFloat(P('r_pdb_PDB_CRYST1_beta') ?? '90'), ga: parseFloat(P('r_pdb_PDB_CRYST1_gamma') ?? '90'),
      sg: P('s_pdb_PDB_CRYST1_Space_Group'),
    } : null,
  }
  return { mmcif: atomsToMmcif(atoms, meta), info: { bonds: bondB?.nRows ?? 0, title, cts: cts.length } }
}

/** Maestro / force-field protonation-state names → PDB names. */
function normalizeComp(c: string): string {
  return ({ HIE: 'HIS', HID: 'HIS', HIP: 'HIS', CYX: 'CYS', ASH: 'ASP', GLH: 'GLU', LYN: 'LYS', ARN: 'ARG' } as Record<string, string>)[c] ?? c
}

/** Convert any supported macromolecule text to mmCIF; CIF/mmCIF text is returned unchanged. */
export function toMmcifIfNeeded(text: string, name = ''): { text: string; format: StructureFormat; note?: string } {
  const f = detectFormat(text, name)
  if (f === 'pdb') {
    const r = pdbToMmcif(text)
    return { text: r.mmcif, format: f, note: r.info.conect ? `Legacy PDB: ${r.info.conect} CONECT records read; bonds perceived from distances` : undefined }
  }
  if (f === 'mae') {
    const r = maeToMmcif(text)
    return { text: r.mmcif, format: f, note: `Maestro: first of ${r.info.cts} structure block(s), ${r.info.bonds} bonds in m_bond` }
  }
  return { text, format: f }
}

const isGzipName = (n: string) => /\.(gz|maegz)$/i.test(n)
/** Read an uploaded File as text, gunzipping .gz / .maegz in the browser. */
export async function readStructureFile(file: File): Promise<{ name: string; text: string }> {
  const head = new Uint8Array(await file.slice(0, 2).arrayBuffer())
  const gz = head[0] === 0x1f && head[1] === 0x8b
  let name = file.name
  if (!gz) return { name, text: await file.text() }
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot gunzip files — decompress the file first.')
  const stream = file.stream().pipeThrough(new DecompressionStream('gzip'))
  const text = await new Response(stream).text()
  if (isGzipName(name)) name = name.replace(/\.maegz$/i, '.mae').replace(/\.gz$/i, '')
  return { name, text }
}
