/**
 * Minimal CIF 1.1 parser for teaching: cell, space group, symmetry ops, atom sites.
 * Client-side only — no gemmi. Handles common CSD/COD export style (single data block,
 * loops + key-value pairs). Not a full STAR/CIF 2 validator.
 */

import { buildOperatorsFromTriplets } from '../groups/buildOperators'
import { findGroup } from '../spaceGroupCatalog'
import type { CellParams, Operator, Vec3 } from '../types'
import type { CifAtomSite, ParsedCif } from './types'

const CELL_KEYS = {
  a: ['_cell_length_a'],
  b: ['_cell_length_b'],
  c: ['_cell_length_c'],
  alpha: ['_cell_angle_alpha'],
  beta: ['_cell_angle_beta'],
  gamma: ['_cell_angle_gamma'],
} as const

const SG_NUMBER_KEYS = [
  '_space_group_it_number',
  '_symmetry_int_tables_number',
  '_space_group.it_number',
]

const SG_NAME_KEYS = [
  '_space_group_name_h-m_alt',
  '_space_group_name_h-m_full',
  '_symmetry_space_group_name_h-m',
  '_space_group_name_hall',
  '_symmetry_space_group_name_hall',
]

const SYM_XYZ_KEYS = [
  '_symmetry_equiv_pos_as_xyz',
  '_space_group_symop_operation_xyz',
  '_symmetry_equiv_pos_site_id', // not xyz — filtered later
]

function stripComments(text: string): string {
  // Remove # comments but keep quoted content simple: line-based is enough for teaching CIFs.
  return text
    .split(/\r?\n/)
    .map((line) => {
      let out = ''
      let inQuote: '"' | "'" | null = null
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]!
        if (inQuote) {
          out += ch
          if (ch === inQuote) inQuote = null
          continue
        }
        if (ch === '"' || ch === "'") {
          inQuote = ch
          out += ch
          continue
        }
        if (ch === '#') break
        out += ch
      }
      return out
    })
    .join('\n')
}

/** Tokenize CIF text into strings (handles 'quoted' "quoted" and ;text; blocks). */
export function tokenizeCif(text: string): string[] {
  const cleaned = stripComments(text)
  const tokens: string[] = []
  let i = 0
  const n = cleaned.length

  const isWs = (c: string) => c === ' ' || c === '\t' || c === '\n' || c === '\r'

  while (i < n) {
    while (i < n && isWs(cleaned[i]!)) i++
    if (i >= n) break

    const ch = cleaned[i]!

    // Semicolon text field starting at beginning of line
    if (
      ch === ';' &&
      (i === 0 || cleaned[i - 1] === '\n' || cleaned[i - 1] === '\r')
    ) {
      i++
      let buf = ''
      while (i < n) {
        if (
          cleaned[i] === ';' &&
          (cleaned[i - 1] === '\n' || cleaned[i - 1] === '\r')
        ) {
          i++
          break
        }
        buf += cleaned[i]!
        i++
      }
      tokens.push(buf.replace(/^\n/, '').replace(/\n$/, ''))
      continue
    }

    if (ch === "'" || ch === '"') {
      const q = ch
      i++
      let buf = ''
      while (i < n && cleaned[i] !== q) {
        buf += cleaned[i]!
        i++
      }
      if (i < n) i++ // closing quote
      tokens.push(buf)
      continue
    }

    let buf = ''
    while (i < n && !isWs(cleaned[i]!)) {
      buf += cleaned[i]!
      i++
    }
    if (buf) tokens.push(buf)
  }
  return tokens
}

function unquoteNumber(raw: string): number | null {
  // Strip CIF uncertainty e.g. 10.523(4) → 10.523
  const m = raw.trim().match(/^([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)/)
  if (!m) return null
  const v = Number(m[1])
  return Number.isFinite(v) ? v : null
}

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase()
}

interface LoopTable {
  headers: string[]
  rows: string[][]
}

function parseStructure(tokens: string[]): {
  dataBlock: string
  pairs: Map<string, string>
  loops: LoopTable[]
} {
  const pairs = new Map<string, string>()
  const loops: LoopTable[] = []
  let dataBlock = 'unknown'
  let i = 0

  while (i < tokens.length) {
    const t = tokens[i]!
    const lower = t.toLowerCase()

    if (lower.startsWith('data_')) {
      dataBlock = t.slice(5) || t
      i++
      continue
    }

    if (lower === 'loop_') {
      i++
      const headers: string[] = []
      while (i < tokens.length && tokens[i]!.startsWith('_')) {
        headers.push(normalizeTag(tokens[i]!))
        i++
      }
      const rows: string[][] = []
      while (i < tokens.length) {
        const peek = tokens[i]!
        const pl = peek.toLowerCase()
        if (
          peek.startsWith('_') ||
          pl === 'loop_' ||
          pl.startsWith('data_') ||
          pl === 'global_' ||
          pl === 'save_' ||
          pl.startsWith('save_')
        ) {
          break
        }
        const row: string[] = []
        for (let c = 0; c < headers.length; c++) {
          if (i >= tokens.length) break
          const next = tokens[i]!
          const nl = next.toLowerCase()
          if (
            next.startsWith('_') ||
            nl === 'loop_' ||
            nl.startsWith('data_')
          ) {
            break
          }
          row.push(next)
          i++
        }
        if (row.length === headers.length) rows.push(row)
        else break
      }
      if (headers.length) loops.push({ headers, rows })
      continue
    }

    if (t.startsWith('_')) {
      const key = normalizeTag(t)
      i++
      if (i < tokens.length) {
        pairs.set(key, tokens[i]!)
        i++
      }
      continue
    }

    // skip unknown bare tokens
    i++
  }

  return { dataBlock, pairs, loops }
}

function readPair(
  pairs: Map<string, string>,
  keys: readonly string[],
): string | null {
  for (const k of keys) {
    const v = pairs.get(normalizeTag(k))
    if (v != null && v !== '?' && v !== '.') return v
  }
  return null
}

function cellFromPairs(pairs: Map<string, string>, warnings: string[]): CellParams {
  const num = (keys: readonly string[], fallback: number) => {
    const raw = readPair(pairs, keys)
    if (!raw) return fallback
    const v = unquoteNumber(raw)
    if (v == null) {
      warnings.push(`Could not parse cell value for ${keys[0]}: ${raw}`)
      return fallback
    }
    return v
  }
  const a = num(CELL_KEYS.a, 10)
  const b = num(CELL_KEYS.b, 10)
  const c = num(CELL_KEYS.c, 10)
  const alpha = num(CELL_KEYS.alpha, 90)
  const beta = num(CELL_KEYS.beta, 90)
  const gamma = num(CELL_KEYS.gamma, 90)
  const cell: CellParams = { a, b, c }
  if (Math.abs(alpha - 90) > 1e-6) cell.alphaDeg = alpha
  if (Math.abs(beta - 90) > 1e-6) cell.betaDeg = beta
  if (Math.abs(gamma - 90) > 1e-6) cell.gammaDeg = gamma
  return cell
}

function resolveSpaceGroup(
  pairs: Map<string, string>,
  warnings: string[],
): { number: number | null; name: string | null } {
  let number: number | null = null
  const numRaw = readPair(pairs, SG_NUMBER_KEYS)
  if (numRaw) {
    const n = unquoteNumber(numRaw)
    if (n != null && n >= 1 && n <= 230) number = Math.round(n)
    else warnings.push(`Unrecognized space-group number: ${numRaw}`)
  }

  const name = readPair(pairs, SG_NAME_KEYS)

  if (number == null && name) {
    // Normalize spaced HM: "P 21/c" → "P21/c"
    const compact = name.replace(/\s+/g, '')
    const entry = findGroup(compact) ?? findGroup(name)
    if (entry) number = entry.number
    else warnings.push(`Could not map space-group name "${name}" to an ITA number`)
  }

  return { number, name }
}

function operatorsFromLoops(loops: LoopTable[], warnings: string[]): Operator[] {
  for (const loop of loops) {
    const xyzIdx = loop.headers.findIndex(
      (h) =>
        h === '_symmetry_equiv_pos_as_xyz' ||
        h === '_space_group_symop_operation_xyz',
    )
    if (xyzIdx < 0) continue
    const triplets = loop.rows
      .map((r) => r[xyzIdx]!)
      .filter((t) => t && t !== '?' && t !== '.')
      .map((t) => t.replace(/\s+/g, ''))
    if (!triplets.length) continue
    try {
      return buildOperatorsFromTriplets(triplets)
    } catch (e) {
      warnings.push(
        `Failed to parse CIF symmetry operators: ${e instanceof Error ? e.message : String(e)}`,
      )
      return []
    }
  }
  // Also: some CIFs put a single identity as a pair, rare — ignore.
  void SYM_XYZ_KEYS
  return []
}

function elementFromLabel(label: string, typeSymbol?: string): string {
  if (typeSymbol && /^[A-Za-z]{1,2}$/.test(typeSymbol)) {
    return typeSymbol[0]!.toUpperCase() + typeSymbol.slice(1).toLowerCase()
  }
  const m = label.match(/^([A-Za-z]{1,2})/)
  if (!m) return 'X'
  const el = m[1]!
  // Avoid matching two-letter when it's C1, N2, etc. — type_symbol preferred.
  if (el.length === 2 && /[0-9]/.test(label[1] ?? '')) {
    return el[0]!.toUpperCase()
  }
  return el[0]!.toUpperCase() + el.slice(1).toLowerCase()
}

function atomsFromLoops(loops: LoopTable[], warnings: string[]): CifAtomSite[] {
  for (const loop of loops) {
    const h = loop.headers
    const iLabel = h.findIndex(
      (x) => x === '_atom_site_label' || x === '_atom_site_id',
    )
    const iType = h.findIndex((x) => x === '_atom_site_type_symbol')
    const iX = h.findIndex(
      (x) =>
        x === '_atom_site_fract_x' || x === '_atom_site_cartn_x', // cartn rejected below
    )
    const iY = h.findIndex((x) => x === '_atom_site_fract_y')
    const iZ = h.findIndex((x) => x === '_atom_site_fract_z')
    const iComp = h.findIndex(
      (x) =>
        x === '_atom_site_auth_comp_id' ||
        x === '_atom_site_label_comp_id' ||
        x === '_atom_site_entity_id',
    )
    const iOcc = h.findIndex((x) => x === '_atom_site_occupancy')
    const iAlt = h.findIndex(
      (x) =>
        x === '_atom_site_disorder_group' ||
        x === '_atom_site_label_alt_id' ||
        x === '_atom_site_disorder_assembly',
    )
    const iUiso = h.findIndex((x) => x === '_atom_site_u_iso_or_equiv')
    // Biso → Uiso = B/(8π²) when only B present
    const iBiso = h.findIndex((x) => x === '_atom_site_b_iso_or_equiv')

    if (iX < 0 || iY < 0 || iZ < 0) continue
    if (h[iX] === '_atom_site_cartn_x') {
      warnings.push('Cartesian atom sites are not supported yet; need fractional coords')
      continue
    }

    // First pass: collect rows; pick a preferred altloc if disorder is present.
    type RowAtom = CifAtomSite & { _alt?: string }
    const raw: RowAtom[] = []
    let skippedOcc = 0
    for (const row of loop.rows) {
      const fx = unquoteNumber(row[iX] ?? '')
      const fy = unquoteNumber(row[iY] ?? '')
      const fz = unquoteNumber(row[iZ] ?? '')
      if (fx == null || fy == null || fz == null) continue

      let occupancy: number | undefined
      if (iOcc >= 0) {
        const occ = unquoteNumber(row[iOcc] ?? '')
        if (occ != null) {
          occupancy = occ
          if (occ < 0.05) {
            skippedOcc++
            continue
          }
        }
      }

      const altRaw = iAlt >= 0 ? (row[iAlt] ?? '').trim() : ''
      const altloc =
        altRaw && altRaw !== '.' && altRaw !== '?' && altRaw !== '0'
          ? altRaw
          : undefined

      const label =
        (iLabel >= 0 ? row[iLabel] : null) ||
        (iType >= 0 ? row[iType] : null) ||
        `A${raw.length + 1}`
      const typeSym = iType >= 0 ? row[iType] : undefined
      const residue = iComp >= 0 ? row[iComp] : undefined
      let uIso: number | undefined
      if (iUiso >= 0) {
        const u = unquoteNumber(row[iUiso] ?? '')
        if (u != null && u >= 0) uIso = u
      } else if (iBiso >= 0) {
        const b = unquoteNumber(row[iBiso] ?? '')
        if (b != null && b >= 0) uIso = b / (8 * Math.PI * Math.PI)
      }
      raw.push({
        label,
        element: elementFromLabel(label, typeSym),
        fractional: [fx, fy, fz] as Vec3,
        residue,
        occupancy,
        altloc,
        uIso,
        _alt: altloc,
      })
    }

    if (skippedOcc > 0) {
      warnings.push(`Skipped ${skippedOcc} atom site(s) with occupancy ≈ 0`)
    }

    // Prefer the disorder group with the highest total occupancy (else lexicographic).
    const alts = [
      ...new Set(raw.map((a) => a._alt).filter((x): x is string => !!x)),
    ]
    let atoms: CifAtomSite[] = raw
    if (alts.length > 1) {
      let best = alts[0]!
      let bestScore = -1
      for (const alt of alts) {
        const group = raw.filter((a) => a._alt === alt)
        const score = group.reduce((s, a) => s + (a.occupancy ?? 1), 0)
        if (score > bestScore + 1e-9 || (Math.abs(score - bestScore) < 1e-9 && alt < best)) {
          best = alt
          bestScore = score
        }
      }
      // Keep unmarked atoms + preferred altloc
      atoms = raw.filter((a) => !a._alt || a._alt === best)
      warnings.push(
        `Disorder altlocs ${alts.join(', ')}; keeping highest-occupancy group "${best}" (Σocc≈${bestScore.toFixed(2)})`,
      )
    }

    const cleaned: CifAtomSite[] = atoms.map((a) => ({
      label: a.label,
      element: a.element,
      fractional: a.fractional,
      residue: a.residue,
      occupancy: a.occupancy,
      altloc: a.altloc,
      uIso: a.uIso,
    }))
    if (cleaned.length) return cleaned
  }
  return []
}

/** Attach anisotropic Uij from _atom_site_aniso_* loop onto matching labels. */
function attachAnisoU(
  atoms: CifAtomSite[],
  loops: LoopTable[],
  warnings: string[],
): void {
  for (const loop of loops) {
    const h = loop.headers.map((x) => x.toLowerCase())
    const iLabel = h.findIndex(
      (x) => x === '_atom_site_aniso_label' || x === '_atom_site_aniso_id',
    )
    const i11 = h.findIndex((x) => x === '_atom_site_aniso_u_11')
    const i22 = h.findIndex((x) => x === '_atom_site_aniso_u_22')
    const i33 = h.findIndex((x) => x === '_atom_site_aniso_u_33')
    const i12 = h.findIndex((x) => x === '_atom_site_aniso_u_12')
    const i13 = h.findIndex((x) => x === '_atom_site_aniso_u_13')
    const i23 = h.findIndex((x) => x === '_atom_site_aniso_u_23')
    if (iLabel < 0 || i11 < 0 || i22 < 0 || i33 < 0) continue
    const byLabel = new Map(atoms.map((a) => [a.label, a]))
    let n = 0
    for (const row of loop.rows) {
      const lab = (row[iLabel] ?? '').trim()
      const atom = byLabel.get(lab)
      if (!atom) continue
      const u11 = unquoteNumber(row[i11] ?? '')
      const u22 = unquoteNumber(row[i22] ?? '')
      const u33 = unquoteNumber(row[i33] ?? '')
      if (u11 == null || u22 == null || u33 == null) continue
      const u12 = unquoteNumber(row[i12] ?? '') ?? 0
      const u13 = unquoteNumber(row[i13] ?? '') ?? 0
      const u23 = unquoteNumber(row[i23] ?? '') ?? 0
      atom.aniso = { u11, u22, u33, u12, u13, u23 }
      if (atom.uIso == null) atom.uIso = (u11 + u22 + u33) / 3
      n++
    }
    if (n) warnings.push(`Attached anisotropic Uij for ${n} atom site(s)`)
    return
  }
}

/** Parse a CIF string into cell / SG / operators / asymmetric atoms. */
import { extractMetadata } from './metadata'

export function parseCif(text: string): ParsedCif {
  const warnings: string[] = []
  if (!text || !text.trim()) {
    return {
      dataBlock: '',
      cell: { a: 10, b: 10, c: 10 },
      spaceGroupNumber: null,
      spaceGroupName: null,
      cifOperators: [],
      atoms: [],
      metadata: {},
      warnings: ['Empty CIF'],
    }
  }

  const tokens = tokenizeCif(text)
  const { dataBlock, pairs, loops } = parseStructure(tokens)
  const cell = cellFromPairs(pairs, warnings)
  const { number, name } = resolveSpaceGroup(pairs, warnings)
  const cifOperators = operatorsFromLoops(loops, warnings)
  const atoms = atomsFromLoops(loops, warnings)
  attachAnisoU(atoms, loops, warnings)

  if (!atoms.length) {
    warnings.push('No fractional atom sites found (_atom_site_fract_*)')
  }
  if (
    !readPair(pairs, CELL_KEYS.a) ||
    !readPair(pairs, CELL_KEYS.b) ||
    !readPair(pairs, CELL_KEYS.c)
  ) {
    warnings.push('Missing cell lengths; using defaults where needed')
  }

  return {
    dataBlock,
    cell,
    spaceGroupNumber: number,
    spaceGroupName: name,
    cifOperators,
    atoms,
    metadata: extractMetadata(pairs, loops),
    warnings,
  }
}
