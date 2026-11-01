/**
 * Protein backbone / side-chain torsions, Ramachandran categories and rotamer labels.
 * Ramachandran classes use the MolProbity Top8000 contour grids (rama8000;
 * Williams et al. 2018 Protein Sci 27:293, CC BY 4.0 data from the Richardson Lab)
 * with the six MolProbity residue classes and thresholds (favored ≥ 2%,
 * outlier < 0.05% general / < 0.1% other), looked up at 2° resolution.
 */
import { RAMA8000_RLE, type Rama8000Table } from './rama8000'
import type { Vec3 } from '../../types'
import { dihedral, dist, wrap180 } from './geom'
import type { Residue } from './residues'

export type RamaCategory = 'general' | 'gly' | 'pro' | 'prepro'
export type RamaClass = 'favored' | 'allowed' | 'outlier'

export interface ProteinRow {
  res: Residue
  phi: number | null
  psi: number | null
  omega: number | null
  cis: boolean
  category: RamaCategory
  /** MolProbity table used (general, gly, transpro, cispro, prepro, ileval). */
  ramaTable: Rama8000Table
  rama: RamaClass | null
  chi: (number | null)[]
  rotamer: string | null
}

/** Side-chain χ atom definitions (IUPAC-IUB 1970). */
export const CHI_DEFS: Record<string, string[][]> = {
  ARG: [['N', 'CA', 'CB', 'CG'], ['CA', 'CB', 'CG', 'CD'], ['CB', 'CG', 'CD', 'NE'], ['CG', 'CD', 'NE', 'CZ']],
  ASN: [['N', 'CA', 'CB', 'CG'], ['CA', 'CB', 'CG', 'OD1']],
  ASP: [['N', 'CA', 'CB', 'CG'], ['CA', 'CB', 'CG', 'OD1']],
  CYS: [['N', 'CA', 'CB', 'SG']],
  GLN: [['N', 'CA', 'CB', 'CG'], ['CA', 'CB', 'CG', 'CD'], ['CB', 'CG', 'CD', 'OE1']],
  GLU: [['N', 'CA', 'CB', 'CG'], ['CA', 'CB', 'CG', 'CD'], ['CB', 'CG', 'CD', 'OE1']],
  HIS: [['N', 'CA', 'CB', 'CG'], ['CA', 'CB', 'CG', 'ND1']],
  ILE: [['N', 'CA', 'CB', 'CG1'], ['CA', 'CB', 'CG1', 'CD1']],
  LEU: [['N', 'CA', 'CB', 'CG'], ['CA', 'CB', 'CG', 'CD1']],
  LYS: [['N', 'CA', 'CB', 'CG'], ['CA', 'CB', 'CG', 'CD'], ['CB', 'CG', 'CD', 'CE'], ['CG', 'CD', 'CE', 'NZ']],
  MET: [['N', 'CA', 'CB', 'CG'], ['CA', 'CB', 'CG', 'SD'], ['CB', 'CG', 'SD', 'CE']],
  MSE: [['N', 'CA', 'CB', 'CG'], ['CA', 'CB', 'CG', 'SE'], ['CB', 'CG', 'SE', 'CE']],
  PHE: [['N', 'CA', 'CB', 'CG'], ['CA', 'CB', 'CG', 'CD1']],
  PRO: [['N', 'CA', 'CB', 'CG'], ['CA', 'CB', 'CG', 'CD']],
  SER: [['N', 'CA', 'CB', 'OG']],
  THR: [['N', 'CA', 'CB', 'OG1']],
  TRP: [['N', 'CA', 'CB', 'CG'], ['CA', 'CB', 'CG', 'CD1']],
  TYR: [['N', 'CA', 'CB', 'CG'], ['CA', 'CB', 'CG', 'CD1']],
  VAL: [['N', 'CA', 'CB', 'CG1']],
}
/** χ angles with a 2-fold symmetric terminal group → folded into [-90, 90]. */
export const SYMMETRIC_CHI: Record<string, number> = { ASP: 2, GLU: 3, PHE: 2, TYR: 2 }
/** Planar / non-tetrahedral χ that get a numeric (not m/t/p) rotamer label. */
const NUMERIC_CHI: Record<string, number> = { ASP: 2, GLU: 3, PHE: 2, TYR: 2, ASN: 2, GLN: 3, HIS: 2, TRP: 2 }

export function foldSymmetric(x: number): number {
  let v = wrap180(x)
  if (v > 90) v -= 180
  else if (v < -90) v += 180
  return v
}

/** Lovell m/t/p label for a tetrahedral χ when within ±30° of a staggered value. */
export function mtp(x: number): string | null {
  const v = wrap180(x)
  if (Math.abs(v - 60) <= 30) return 'p'
  if (Math.abs(v + 60) <= 30) return 'm'
  if (Math.abs(Math.abs(v) - 180) <= 30) return 't'
  return null
}
/** g+/t/g− naming with g+ = +60° (IUPAC sign convention; some texts use the opposite). */
export function gauche(x: number): string | null {
  const l = mtp(x)
  return l === 'p' ? 'g+' : l === 'm' ? 'g−' : l === 't' ? 't' : null
}

const gridCache = new Map<Rama8000Table, Uint8Array>()
/** Decoded 180×180 level grid (0 outlier, 1 allowed, 2 favored), index (φ bin)·180 + ψ bin. */
export function ramaGrid(t: Rama8000Table): Uint8Array {
  let g = gridCache.get(t)
  if (g) return g
  g = new Uint8Array(180 * 180)
  let i = 0
  for (const tok of RAMA8000_RLE[t].split(',')) {
    const lv = +tok[0]!, n = +tok.slice(1)
    g.fill(lv, i, i + n)
    i += n
  }
  gridCache.set(t, g)
  return g
}
const bin = (x: number) => Math.min(179, Math.max(0, Math.floor((wrap180(x) + 180) / 2)))
export function ramaLevel(t: Rama8000Table, phi: number, psi: number): number {
  return ramaGrid(t)[bin(phi) * 180 + bin(psi)]!
}
/** Display category → default MolProbity table (Pro shown with the trans-Pro contours). */
export const RAMA_DISPLAY_TABLE: Record<RamaCategory, Rama8000Table> = { general: 'general', gly: 'gly', pro: 'transpro', prepro: 'prepro' }
export const RAMA_SOURCE =
  'MolProbity Top8000 Ramachandran contours (rama8000, 2° grid): favored ≥ 2%, allowed ≥ 0.05% (general) or 0.1% (Gly, Pro, pre-Pro, Ile/Val). Data: Richardson Lab, Duke (CC BY 4.0); Williams et al. 2018, Protein Sci 27:293–315. Grid lookup without interpolation, so points on a contour edge may differ from MolProbity.'

export function ramaClass(cat: RamaCategory | Rama8000Table, phi: number, psi: number): RamaClass {
  const t = (cat in RAMA_DISPLAY_TABLE ? RAMA_DISPLAY_TABLE[cat as RamaCategory] : cat) as Rama8000Table
  const lv = ramaLevel(t, phi, psi)
  return lv === 2 ? 'favored' : lv === 1 ? 'allowed' : 'outlier'
}

const PEPTIDE_MAX = 2.0

export function proteinAnalysis(residues: Residue[]): ProteinRow[] {
  const prot = residues.filter((r) => r.kind === 'protein')
  const rows: ProteinRow[] = []
  for (let k = 0; k < prot.length; k++) {
    const r = prot[k]!
    const prev = k > 0 && prot[k - 1]!.chain === r.chain ? prot[k - 1]! : null
    const next = k + 1 < prot.length && prot[k + 1]!.chain === r.chain ? prot[k + 1]! : null
    const N = r.atoms.get('N'), CA = r.atoms.get('CA'), C = r.atoms.get('C')
    const pC = prev?.atoms.get('C'), nN = next?.atoms.get('N'), nCA = next?.atoms.get('CA')
    const linkedPrev = !!(pC && N && dist(pC, N) < PEPTIDE_MAX)
    const linkedNext = !!(C && nN && dist(C, nN) < PEPTIDE_MAX)
    const phi = linkedPrev && N && CA && C ? dihedral(pC!, N, CA, C) : null
    const psi = linkedNext && N && CA && C ? dihedral(N, CA, C, nN!) : null
    const omega = linkedNext && CA && C && nCA ? dihedral(CA, C, nN!, nCA) : null
    const category: RamaCategory = r.comp === 'GLY' ? 'gly' : r.comp === 'PRO' ? 'pro' : linkedNext && next!.comp === 'PRO' ? 'prepro' : 'general'
    const pCA = prev?.atoms.get('CA')
    const omegaPrev = linkedPrev && pCA && N && CA ? dihedral(pCA, pC!, N, CA) : null
    const ramaTable: Rama8000Table = category === 'pro'
      ? (omegaPrev != null && Math.abs(omegaPrev) < 30 ? 'cispro' : 'transpro')
      : category === 'general' && (r.comp === 'ILE' || r.comp === 'VAL') ? 'ileval' : category
    const defs = CHI_DEFS[r.comp] ?? []
    const chi: (number | null)[] = [null, null, null, null]
    defs.forEach((d, j) => {
      const p = d.map((nm) => r.atoms.get(nm)) as (Vec3 | undefined)[]
      if (p.every(Boolean)) {
        let v = dihedral(p[0]!, p[1]!, p[2]!, p[3]!)
        if (SYMMETRIC_CHI[r.comp] === j + 1) v = foldSymmetric(v)
        chi[j] = v
      }
    })
    let rotamer: string | null = null
    if (defs.length && chi[0] != null) {
      const parts: string[] = []
      for (let j = 0; j < defs.length; j++) {
        const v = chi[j]
        if (v == null) { parts.length = 0; break }
        if (NUMERIC_CHI[r.comp] === j + 1) parts.push(String(Math.round(v / 10) * 10))
        else { const l = mtp(v); if (!l) { parts.length = 0; break } parts.push(l) }
      }
      if (parts.length) rotamer = parts.join('').replace(/([a-z])(-?\d)/, '$1$2')
      if (r.comp === 'PRO' && chi[0] != null) rotamer = chi[0] > 0 ? 'Cγ-endo' : 'Cγ-exo'
    }
    rows.push({
      res: r, phi, psi, omega, cis: omega != null && Math.abs(omega) < 30, category, ramaTable,
      rama: phi != null && psi != null ? ramaClass(ramaTable, phi, psi) : null, chi, rotamer,
    })
  }
  return rows
}
