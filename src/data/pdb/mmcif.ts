/**
 * Lightweight PDBx/mmCIF reader for RCSB crystal structures (teaching use).
 * Line-based and fast enough for typical entries (≤ ~100k atoms). Reads the
 * cell, space group, experiment method, fractionalization matrix and
 * _atom_site (model 1, highest-occupancy altloc). Produces a ParsedCif so the existing
 * CIF-map pipeline can be reused, plus macromolecule extras per atom.
 */
import { WATERS } from './waters'
import { buildOperatorsFromTriplets } from '../groups/buildOperators'
import { findGroup } from '../spaceGroupCatalog'
import type { CellParams, Operator, Vec3 } from '../types'
import type { CifAtomSite, ParsedCif } from '../cif/types'

export const CRYSTAL_METHODS = ['X-RAY DIFFRACTION', 'NEUTRON DIFFRACTION', 'ELECTRON CRYSTALLOGRAPHY', 'FIBER DIFFRACTION', 'POWDER DIFFRACTION']

export interface MmcifTables {
  pairs: Map<string, string>
  loops: Map<string, { headers: string[]; rows: string[][] }>
}

const TOKEN_RE = /'(.*?)'(?=\s|$)|"(.*?)"(?=\s|$)|(\S+)/g

export function splitMmcifLine(line: string): string[] {
  const out: string[] = []
  TOKEN_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = TOKEN_RE.exec(line))) out.push(m[1] ?? m[2] ?? m[3]!)
  return out
}

/** Read key/value pairs and loops (categories lower-cased, e.g. "_atom_site"). */
export function readMmcif(text: string): MmcifTables {
  const lines = text.split(/\r?\n/)
  const pairs = new Map<string, string>()
  const loops = new Map<string, { headers: string[]; rows: string[][] }>()
  let i = 0
  const n = lines.length
  const readTextBlock = (): string => {
    // lines[i] starts with ';'
    const buf = [lines[i]!.slice(1)]
    i++
    while (i < n && !lines[i]!.startsWith(';')) buf.push(lines[i++]!)
    i++ // closing ;
    return buf.join('\n').trim()
  }
  while (i < n) {
    const line = lines[i]!
    const t = line.trim()
    if (!t || t[0] === '#' || t.startsWith('data_')) { i++; continue }
    if (t === 'loop_') {
      i++
      const headers: string[] = []
      while (i < n && lines[i]!.trim().startsWith('_')) headers.push(lines[i++]!.trim().toLowerCase())
      const cat = headers[0]?.split('.')[0] ?? ''
      const rows: string[][] = []
      let cur: string[] = []
      while (i < n) {
        const l = lines[i]!
        const lt = l.trim()
        if (l.startsWith(';')) { cur.push(readTextBlock()); }
        else {
          if (!lt) { i++; continue }
          if (lt[0] === '#' || lt[0] === '_' || lt === 'loop_' || lt.startsWith('data_')) break
          for (const tok of splitMmcifLine(lt)) cur.push(tok)
          i++
        }
        while (cur.length >= headers.length) {
          rows.push(cur.slice(0, headers.length))
          cur = cur.slice(headers.length)
        }
      }
      if (headers.length && !loops.has(cat)) loops.set(cat, { headers, rows })
      continue
    }
    if (t[0] === '_') {
      const toks = splitMmcifLine(t)
      const key = toks[0]!.toLowerCase()
      if (toks.length >= 2) { pairs.set(key, toks[1]!); i++; continue }
      i++
      if (i < n && lines[i]!.startsWith(';')) pairs.set(key, readTextBlock())
      else if (i < n) { pairs.set(key, splitMmcifLine(lines[i]!.trim())[0] ?? ''); i++ }
      continue
    }
    i++
  }
  return { pairs, loops }
}

/** A value from a pair or the first row of a one-category loop. */
export function mmcifValue(t: MmcifTables, key: string): string | null {
  const k = key.toLowerCase()
  let v = t.pairs.get(k)
  if (v == null) {
    const loop = t.loops.get(k.split('.')[0]!)
    const idx = loop?.headers.indexOf(k) ?? -1
    if (loop && idx >= 0) v = loop.rows[0]?.[idx]
  }
  return v == null || v === '?' || v === '.' ? null : v
}

export function mmcifValues(t: MmcifTables, key: string): string[] {
  const k = key.toLowerCase()
  const v = t.pairs.get(k)
  if (v != null) return [v]
  const loop = t.loops.get(k.split('.')[0]!)
  const idx = loop?.headers.indexOf(k) ?? -1
  return loop && idx >= 0 ? loop.rows.map((r) => r[idx]!) : []
}

/** Map a PDB Hermann–Mauguin symbol to an ITA number + optional explicit ops (non-standard settings). */
export function pdbSpaceGroup(hmRaw: string | null, itNumber?: number | null): { number: number | null; triplets?: string[]; note?: string } {
  if (!hmRaw) return { number: itNumber ?? null }
  const hm = hmRaw.trim().replace(/\s+/g, ' ')
  const toks = hm.split(' ')
  // Body-centred monoclinic I 1 2 1 (PDB setting of C2)
  if (hm.toUpperCase() === 'I 1 2 1') {
    return {
      number: 5,
      triplets: ['x,y,z', '-x,y,-z', 'x+1/2,y+1/2,z+1/2', '-x+1/2,y+1/2,-z+1/2'],
      note: 'I 1 2 1 (non-standard setting of C2) — operators built for the I-centred cell',
    }
  }
  let name = hm
  if (toks[0] === 'H') name = ['R', ...toks.slice(1)].join(' ')
  // Monoclinic full symbols "P 1 21 1" → "P 21"
  if (toks.length === 4 && toks[1] === '1' && toks[3] === '1') name = `${toks[0]} ${toks[2]}`
  const entry = findGroup(name.replace(/\s+/g, '')) ?? findGroup(name)
  const number = entry?.number ?? itNumber ?? null
  return { number }
}

const num = (s: string | null | undefined): number | null => {
  if (s == null) return null
  const v = parseFloat(s)
  return Number.isFinite(v) ? v : null
}

/** Fractionalization matrix from cell (PDB convention: a ‖ x, b in xy). */
export function fracMatrixFromCell(c: CellParams): { M: number[][]; v: Vec3 } {
  const d = Math.PI / 180
  const al = (c.alphaDeg ?? 90) * d, be = (c.betaDeg ?? 90) * d, ga = (c.gammaDeg ?? 90) * d
  const ca = Math.cos(al), cb = Math.cos(be), cg = Math.cos(ga), sg = Math.sin(ga)
  const V = c.a * c.b * c.c * Math.sqrt(1 - ca * ca - cb * cb - cg * cg + 2 * ca * cb * cg)
  return {
    M: [
      [1 / c.a, -cg / (c.a * sg), (ca * cg - cb) * c.b * c.c / (V * sg)],
      [0, 1 / (c.b * sg), (cb * cg - ca) * c.a * c.c / (V * sg)],
      [0, 0, c.a * c.b * sg / V],
    ],
    v: [0, 0, 0],
  }
}

export interface PdbAtomExtra {
  chain: string
  /** label_asym_id (mmCIF chain instance). */
  asym: string
  comp: string
  seq: string
  atomName: string
  hetero: boolean
  water: boolean
  ca: boolean
  b?: number
}

export interface ParsedMmcif {
  parsed: ParsedCif
  /** All model-1 atoms with macromolecule extras (index-aligned with parsed.atoms). */
  extras: PdbAtomExtra[]
  method: string | null
  crystal: boolean
  /** Why the entry is treated as non-crystallographic. */
  nonCrystalReason?: string
  pdbId: string | null
  title: string | null
  chains: string[]
  resolutionA?: number
  /** Deposited secondary structure ranges (auth chain + auth seq numbers). */
  ss: SsRange[]
  /** Deposited polymer sequence per auth chain (SEQRES / _pdbx_poly_seq_scheme); num = auth numbering. */
  seqres: Map<string, SeqresEntry[]>
}

export interface SeqresEntry { comp: string; num: string | null }

export function readSeqres(t: MmcifTables): Map<string, SeqresEntry[]> {
  const out = new Map<string, SeqresEntry[]>()
  const L = t.loops.get('_pdbx_poly_seq_scheme')
  if (!L) return out
  const H = (k: string) => L.headers.indexOf(`_pdbx_poly_seq_scheme.${k}`)
  const ch = H('pdb_strand_id') >= 0 ? H('pdb_strand_id') : H('asym_id'), mon = H('mon_id')
  const num = H('pdb_seq_num') >= 0 ? H('pdb_seq_num') : H('auth_seq_num'), ins = H('pdb_ins_code')
  if (ch < 0 || mon < 0) return out
  for (const r of L.rows) {
    const c = r[ch]!
    let list = out.get(c)
    if (!list) out.set(c, (list = []))
    const n = num >= 0 ? r[num]! : '?'
    const i = ins >= 0 && r[ins] !== '.' && r[ins] !== '?' ? r[ins]! : ''
    list.push({ comp: r[mon]!, num: n === '?' || n === '.' ? null : n + i })
  }
  return out
}

export interface SsRange { kind: 'helix' | 'strand'; chain: string; from: number; to: number }

function readSs(t: MmcifTables): SsRange[] {
  const out: SsRange[] = []
  const grab = (cat: string, kind: SsRange['kind'], filter?: (row: string[], h: string[]) => boolean) => {
    const L = t.loops.get(cat)
    const rows = L ? L.rows : []
    const headers = L ? L.headers : [...t.pairs.keys()].filter((k) => k.startsWith(cat + '.'))
    const all = L ? rows : headers.length ? [headers.map((k) => t.pairs.get(k)!)] : []
    const H = (k: string) => headers.indexOf(`${cat}.${k}`)
    const c = H('beg_auth_asym_id'), b = H('beg_auth_seq_id'), e = H('end_auth_seq_id')
    if (c < 0 || b < 0 || e < 0) return
    for (const r of all) {
      if (filter && !filter(r, headers)) continue
      const from = parseInt(r[b]!, 10), to = parseInt(r[e]!, 10)
      if (Number.isFinite(from) && Number.isFinite(to)) out.push({ kind, chain: r[c]!, from, to })
    }
  }
  grab('_struct_conf', 'helix', (r, h) => {
    const i = h.indexOf('_struct_conf.conf_type_id')
    return i < 0 || /^HELX/i.test(r[i] ?? '')
  })
  grab('_struct_sheet_range', 'strand')
  return out
}


export function looksLikeMmcif(text: string): boolean {
  return /^_atom_site\.cartn_x/im.test(text) || /^_atom_site\.Cartn_x/m.test(text)
}

function altResKey(r: string[], ix: { chain: number; seq: number; ins: number }): string {
  return `${r[ix.chain] ?? 'A'}|${r[ix.seq] ?? ''}|${ix.ins >= 0 ? r[ix.ins] : ''}`
}

/** Highest summed occupancy wins; ties go to the alphabetically first label. */
export function chooseAltloc(occ: Map<string, number>): string {
  let best = '', bo = -Infinity
  for (const [alt, o] of [...occ].sort((a, b) => a[0].localeCompare(b[0]))) if (o > bo + 1e-6) { best = alt; bo = o }
  return best
}

export function parseMmcif(text: string): ParsedMmcif {
  const t = readMmcif(text)
  const warnings: string[] = []
  const pdbId = mmcifValue(t, '_entry.id')
  const title = mmcifValue(t, '_struct.title')
  const methods = mmcifValues(t, '_exptl.method').map((m) => m.toUpperCase())
  const method = methods.join(' + ') || null

  const a = num(mmcifValue(t, '_cell.length_a')), b = num(mmcifValue(t, '_cell.length_b')), c = num(mmcifValue(t, '_cell.length_c'))
  const al = num(mmcifValue(t, '_cell.angle_alpha')) ?? 90, be = num(mmcifValue(t, '_cell.angle_beta')) ?? 90, ga = num(mmcifValue(t, '_cell.angle_gamma')) ?? 90
  const unitCell = a == null || b == null || c == null || (a <= 1.001 && b <= 1.001 && c <= 1.001)
  const crystalMethod = methods.length === 0 || methods.some((m) => CRYSTAL_METHODS.includes(m))
  const crystal = !unitCell && crystalMethod
  const nonCrystalReason = crystal
    ? undefined
    : !crystalMethod
      ? `${method} entry — no crystal lattice`
      : 'No unit cell deposited — no crystal lattice'

  const hm = mmcifValue(t, '_symmetry.space_group_name_h-m') ?? mmcifValue(t, '_space_group.name_h-m_alt')
  const itNum = num(mmcifValue(t, '_symmetry.int_tables_number') ?? mmcifValue(t, '_space_group.it_number'))
  const sg = crystal ? pdbSpaceGroup(hm, itNum != null ? Math.round(itNum) : null) : { number: null }
  if ('note' in sg && sg.note) warnings.push(sg.note)
  let cifOperators: Operator[] = []
  if ('triplets' in sg && sg.triplets) cifOperators = buildOperatorsFromTriplets(sg.triplets)
  if (!crystal) cifOperators = buildOperatorsFromTriplets(['x,y,z'])
  if (crystal && sg.number == null) warnings.push(`Could not map space group "${hm}" to an ITA number`)

  // For non-crystal entries make a box around the coordinates later (see below).
  let cell: CellParams = crystal ? { a: a!, b: b!, c: c! } : { a: 1, b: 1, c: 1 }
  if (crystal) {
    if (Math.abs(al - 90) > 1e-6) cell.alphaDeg = al
    if (Math.abs(be - 90) > 1e-6) cell.betaDeg = be
    if (Math.abs(ga - 90) > 1e-6) cell.gammaDeg = ga
  }

  const loop = t.loops.get('_atom_site')
  if (!loop) throw new Error('mmCIF has no _atom_site table')
  const H = (k: string) => loop.headers.indexOf(`_atom_site.${k}`)
  const ix = {
    group: H('group_pdb'), type: H('type_symbol'), atom: H('auth_atom_id') >= 0 ? H('auth_atom_id') : H('label_atom_id'),
    alt: H('label_alt_id'), comp: H('auth_comp_id') >= 0 ? H('auth_comp_id') : H('label_comp_id'),
    asym: H('label_asym_id'), chain: H('auth_asym_id') >= 0 ? H('auth_asym_id') : H('label_asym_id'),
    seq: H('auth_seq_id') >= 0 ? H('auth_seq_id') : H('label_seq_id'), ins: H('pdbx_pdb_ins_code'),
    x: H('cartn_x'), y: H('cartn_y'), z: H('cartn_z'), occ: H('occupancy'), bIso: H('b_iso_or_equiv'), model: H('pdbx_pdb_model_num'),
  }
  if (ix.x < 0 || ix.y < 0 || ix.z < 0) throw new Error('mmCIF _atom_site has no Cartn_x/y/z columns')

  const firstModel = ix.model >= 0 ? loop.rows[0]?.[ix.model] : undefined
  // Altlocs: per residue keep the conformer with the highest summed occupancy
  // (ties → alphabetical, i.e. usually 'A'), as PyMOL/PLIP do. Blank-altloc atoms are always kept.
  const altOcc = new Map<string, Map<string, number>>()
  for (const r of loop.rows) {
    if (ix.model >= 0 && r[ix.model] !== firstModel) continue
    const alt = ix.alt >= 0 ? r[ix.alt]! : '.'
    if (alt === '.' || alt === '?') continue
    const resKey = altResKey(r, ix)
    let m = altOcc.get(resKey)
    if (!m) altOcc.set(resKey, (m = new Map()))
    m.set(alt, (m.get(alt) ?? 0) + (num(r[ix.occ]) ?? 1))
  }
  const altChosen = new Map<string, string>()
  for (const [k, m] of altOcc) altChosen.set(k, chooseAltloc(m))
  const cart: Vec3[] = []
  const extras: PdbAtomExtra[] = []
  const raw: { el: string; occ?: number; b?: number }[] = []
  let skippedModels = false, skippedAlt = 0
  for (const r of loop.rows) {
    if (ix.model >= 0 && r[ix.model] !== firstModel) { skippedModels = true; continue }
    const alt = ix.alt >= 0 ? r[ix.alt]! : '.'
    const chain = r[ix.chain] ?? 'A'
    const seq = (r[ix.seq] ?? '') + (ix.ins >= 0 && r[ix.ins] !== '?' && r[ix.ins] !== '.' ? r[ix.ins] : '')
    const atomName = r[ix.atom] ?? ''
    if (alt !== '.' && alt !== '?' && altChosen.get(altResKey(r, ix)) !== alt) { skippedAlt++; continue }
    const x = num(r[ix.x]), y = num(r[ix.y]), z = num(r[ix.z])
    if (x == null || y == null || z == null) continue
    const comp = r[ix.comp] ?? 'UNK'
    const typ = ix.type >= 0 ? r[ix.type]! : atomName.replace(/[^A-Za-z]/g, '').slice(0, 1)
    const el = typ.length > 1 ? typ[0]!.toUpperCase() + typ.slice(1).toLowerCase() : typ.toUpperCase()
    const hetero = ix.group >= 0 ? r[ix.group] === 'HETATM' : false
    cart.push([x, y, z])
    raw.push({ el, occ: num(r[ix.occ]) ?? undefined, b: num(r[ix.bIso]) ?? undefined })
    extras.push({
      chain, asym: ix.asym >= 0 ? r[ix.asym]! : chain, comp, seq, atomName, hetero,
      water: WATERS.has(comp), ca: !hetero && atomName === 'CA' && el === 'C', b: num(r[ix.bIso]) ?? undefined,
    })
  }
  if (skippedModels) warnings.push('Multiple models deposited — showing model 1 only')
  if (skippedAlt) warnings.push(`Alternate conformations: kept the highest-occupancy altloc per residue (${skippedAlt} atoms skipped)`)

  // Fractionalization
  let M: number[][], v: Vec3
  if (!crystal) {
    // Non-crystal: identity "cell" box spanning the coordinates (+ margin) so the scene frames it.
    const lo: Vec3 = [Infinity, Infinity, Infinity], hi: Vec3 = [-Infinity, -Infinity, -Infinity]
    for (const p of cart) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k]!, p[k]!); hi[k] = Math.max(hi[k]!, p[k]!) }
    const pad = 4
    const L = [0, 1, 2].map((k) => Math.max(hi[k]! - lo[k]! + 2 * pad, 5))
    cell = { a: L[0]!, b: L[1]!, c: L[2]! }
    M = [[1 / L[0]!, 0, 0], [0, 1 / L[1]!, 0], [0, 0, 1 / L[2]!]]
    v = [-(lo[0]! - pad) / L[0]!, -(lo[1]! - pad) / L[1]!, -(lo[2]! - pad) / L[2]!]
  } else {
    const m = (i: number, j: number) => num(mmcifValue(t, `_atom_sites.fract_transf_matrix[${i}][${j}]`))
    const rows = [1, 2, 3].map((i) => [1, 2, 3].map((j) => m(i, j)))
    if (rows.every((r) => r.every((x) => x != null)) && rows.some((r) => r.some((x) => x !== 0))) {
      M = rows as number[][]
      v = [1, 2, 3].map((i) => num(mmcifValue(t, `_atom_sites.fract_transf_vector[${i}]`)) ?? 0) as Vec3
    } else {
      ;({ M, v } = fracMatrixFromCell(cell))
    }
  }
  const atoms: CifAtomSite[] = cart.map((p, k) => {
    const e = extras[k]!
    const f: Vec3 = [0, 1, 2].map((i) => M[i]![0]! * p[0] + M[i]![1]! * p[1] + M[i]![2]! * p[2] + v[i]!) as Vec3
    return {
      label: `${e.comp} ${e.seq} · ${e.atomName} · chain ${e.chain}`,
      element: raw[k]!.el,
      fractional: f,
      residue: e.comp,
      occupancy: raw[k]!.occ,
      uIso: raw[k]!.b != null ? raw[k]!.b! / (8 * Math.PI * Math.PI) : undefined,
    }
  })
  const chains = [...new Set(extras.filter((e) => !e.water).map((e) => e.chain))]
  const resolutionA = num(mmcifValue(t, '_refine.ls_d_res_high') ?? mmcifValue(t, '_reflns.d_resolution_high')) ?? undefined
  const parsed: ParsedCif = {
    dataBlock: pdbId ?? 'mmcif',
    cell,
    spaceGroupNumber: crystal ? sg.number : null,
    spaceGroupName: crystal ? hm : null,
    cifOperators,
    atoms,
    metadata: { name: title ?? undefined, resolutionA, resolutionSource: resolutionA != null ? 'refine' : undefined },
    warnings,
  }
  return { parsed, extras, method, crystal, nonCrystalReason, pdbId, title, chains, resolutionA, ss: readSs(t), seqres: readSeqres(t) }
}
