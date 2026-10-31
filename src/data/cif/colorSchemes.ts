import type { SymmetryCopyAtom } from './types'

/** Jmol/CPK element colors (subset covering common organic + inorganic CIFs). */
export const JMOL_COLORS: Record<string, string> = {
  H: '#FFFFFF', He: '#D9FFFF', Li: '#CC80FF', Be: '#C2FF00', B: '#FFB5B5',
  C: '#909090', N: '#3050F8', O: '#FF0D0D', F: '#90E050', Ne: '#B3E3F5',
  Na: '#AB5CF2', Mg: '#8AFF00', Al: '#BFA6A6', Si: '#F0C8A0', P: '#FF8000',
  S: '#FFFF30', Cl: '#1FF01F', Ar: '#80D1E3', K: '#8F40D4', Ca: '#3DFF00',
  Ti: '#BFC2C7', V: '#A6A6AB', Cr: '#8A99C7', Mn: '#9C7AC7', Fe: '#E06633',
  Co: '#F090A0', Ni: '#50D050', Cu: '#C88033', Zn: '#7D80B0', Ga: '#C28F8F',
  Ge: '#668F8F', As: '#BD80E3', Se: '#FFA100', Br: '#A62929', Kr: '#5CB8D1',
  Rb: '#702EB0', Sr: '#00FF00', Zr: '#94E0E0', Mo: '#54B5B5', Ru: '#248F8F',
  Rh: '#0A7D8C', Pd: '#006985', Ag: '#C0C0C0', Cd: '#FFD98F', In: '#A67573',
  Sn: '#668080', Sb: '#9E63B5', Te: '#D47A00', I: '#940094', Xe: '#429EB0',
  Cs: '#57178F', Ba: '#00C900', La: '#70D4FF', Ce: '#FFFFC7', W: '#2194D6',
  Pt: '#D0D0E0', Au: '#FFD123', Hg: '#B8B8D0', Tl: '#A6544D', Pb: '#575961',
  Bi: '#9E4FB5', U: '#008FFF',
}

export function jmolColor(el: string): string {
  const k = el ? el[0]!.toUpperCase() + el.slice(1).toLowerCase() : ''
  return JMOL_COLORS[k] ?? '#FF1493'
}

const EQ_PALETTE = [
  '#38bdf8', '#f97316', '#a3e635', '#e879f9', '#facc15', '#2dd4bf',
  '#f87171', '#818cf8', '#fb7185', '#4ade80', '#c084fc', '#fbbf24',
]
export function equivalenceColor(k: number): string {
  return EQ_PALETTE[((k % EQ_PALETTE.length) + EQ_PALETTE.length) % EQ_PALETTE.length]!
}

/**
 * Crystallographically independent molecule (AU component) for every atom.
 * AU molecules = connected components among identity-op atoms; any symmetry copy
 * inherits the class of its asymmetric-unit atom (auIndex).
 */
export function equivalenceClasses(atoms: SymmetryCopyAtom[]): {
  classOf: number[]
  count: number
} {
  const molRank = new Map<number, number>()
  const auClass = new Map<number, number>()
  const idMols = [...new Set(atoms.filter((a) => a.opIndex === 1).map((a) => a.moleculeId))].sort(
    (x, y) => x - y,
  )
  idMols.forEach((m, i) => molRank.set(m, i))
  for (const a of atoms) {
    if (a.opIndex === 1 && !auClass.has(a.auIndex)) auClass.set(a.auIndex, molRank.get(a.moleculeId) ?? 0)
  }
  return {
    classOf: atoms.map((a) => auClass.get(a.auIndex) ?? 0),
    count: Math.max(1, idMols.length),
  }
}

/** Distinct elements present, in Hill-ish order (C, H, then alphabetical). */
export function elementsPresent(atoms: SymmetryCopyAtom[]): string[] {
  const s = [...new Set(atoms.map((a) => a.element))]
  const rank = (e: string) => (e === 'C' ? 0 : e === 'H' ? 1 : 2)
  return s.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
}
