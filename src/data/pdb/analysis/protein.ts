/**
 * Protein backbone / side-chain torsions, Ramachandran categories and rotamer labels.
 * Ramachandran regions are approximate ellipse fits to the MolProbity Top8000
 * contours (Lovell et al. 2003 Proteins 50:437; Williams et al. 2018 Protein Sci 27:293).
 */
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

interface Ell { c: [number, number]; r: [number, number] }
const E = (px: number, py: number, rx: number, ry: number): Ell => ({ c: [px, py], r: [rx, ry] })
/** Approximate favored (≈98%) and allowed (≈99.95%) regions as ellipses (deg). */
export const RAMA_REGIONS: Record<RamaCategory, { favored: Ell[]; allowed: Ell[] }> = {
  general: {
    favored: [E(-120, 140, 50, 40), E(-70, 145, 25, 35), E(-65, -40, 30, 28), E(-90, -10, 25, 22), E(60, 40, 14, 18)],
    allowed: [E(-110, 145, 75, 65), E(-75, -35, 62, 60), E(-110, 70, 72, 48), E(-120, 15, 40, 40), E(60, 35, 30, 40), E(-95, -175, 70, 20), E(75, -170, 20, 25)],
  },
  gly: {
    favored: [E(-65, -40, 30, 30), E(65, 40, 30, 30), E(-80, 175, 40, 25), E(80, -175, 40, 25), E(80, 0, 20, 25), E(-80, 0, 20, 25)],
    allowed: [E(-80, -25, 60, 60), E(80, 25, 60, 60), E(-100, 170, 80, 45), E(100, -170, 80, 45), E(180, 180, 50, 50), E(-180, 0, 30, 60), E(180, 0, 30, 60), E(80, -140, 45, 50), E(-80, 140, 45, 50), E(-100, 40, 40, 40), E(100, -40, 40, 40)],
  },
  pro: {
    favored: [E(-65, 145, 20, 30), E(-65, -30, 25, 30)],
    allowed: [E(-70, 140, 35, 55), E(-60, -35, 40, 50), E(-80, 60, 25, 35)],
  },
  prepro: {
    favored: [E(-120, 140, 45, 35), E(-65, 145, 25, 30), E(-65, -40, 25, 25)],
    allowed: [E(-110, 145, 70, 60), E(-80, -30, 50, 50), E(-110, 55, 50, 50), E(-75, -175, 35, 25), E(55, 40, 15, 25)],
  },
}
export const RAMA_SOURCE =
  'Regions are approximate ellipse fits to the MolProbity Top8000 Ramachandran contours (Lovell et al. 2003, Proteins 50:437–450; Williams et al. 2018, Protein Sci 27:293–315). For validation use MolProbity or the wwPDB report.'

function inEll(e: Ell, phi: number, psi: number) {
  const dx = wrap180(phi - e.c[0]) / e.r[0]
  const dy = wrap180(psi - e.c[1]) / e.r[1]
  return dx * dx + dy * dy <= 1
}
export function ramaClass(cat: RamaCategory, phi: number, psi: number): RamaClass {
  const R = RAMA_REGIONS[cat]
  if (R.favored.some((e) => inEll(e, phi, psi))) return 'favored'
  if (R.allowed.some((e) => inEll(e, phi, psi))) return 'allowed'
  return 'outlier'
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
      res: r, phi, psi, omega, cis: omega != null && Math.abs(omega) < 30, category,
      rama: phi != null && psi != null ? ramaClass(category, phi, psi) : null, chi, rotamer,
    })
  }
  return rows
}
