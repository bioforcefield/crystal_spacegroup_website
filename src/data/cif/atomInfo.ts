import { cartToFrac } from '../math'
import type { CellParams, Operator, Vec3 } from '../types'
import type { SymmetryCopyAtom } from './types'

/** [atomic number, name] for elements commonly found in CIFs. */
export const ELEMENTS: Record<string, [number, string]> = {
  H: [1, 'Hydrogen'], He: [2, 'Helium'], Li: [3, 'Lithium'], Be: [4, 'Beryllium'], B: [5, 'Boron'],
  C: [6, 'Carbon'], N: [7, 'Nitrogen'], O: [8, 'Oxygen'], F: [9, 'Fluorine'], Ne: [10, 'Neon'],
  Na: [11, 'Sodium'], Mg: [12, 'Magnesium'], Al: [13, 'Aluminium'], Si: [14, 'Silicon'], P: [15, 'Phosphorus'],
  S: [16, 'Sulfur'], Cl: [17, 'Chlorine'], Ar: [18, 'Argon'], K: [19, 'Potassium'], Ca: [20, 'Calcium'],
  Sc: [21, 'Scandium'], Ti: [22, 'Titanium'], V: [23, 'Vanadium'], Cr: [24, 'Chromium'], Mn: [25, 'Manganese'],
  Fe: [26, 'Iron'], Co: [27, 'Cobalt'], Ni: [28, 'Nickel'], Cu: [29, 'Copper'], Zn: [30, 'Zinc'],
  Ga: [31, 'Gallium'], Ge: [32, 'Germanium'], As: [33, 'Arsenic'], Se: [34, 'Selenium'], Br: [35, 'Bromine'],
  Kr: [36, 'Krypton'], Rb: [37, 'Rubidium'], Sr: [38, 'Strontium'], Y: [39, 'Yttrium'], Zr: [40, 'Zirconium'],
  Nb: [41, 'Niobium'], Mo: [42, 'Molybdenum'], Ru: [44, 'Ruthenium'], Rh: [45, 'Rhodium'], Pd: [46, 'Palladium'],
  Ag: [47, 'Silver'], Cd: [48, 'Cadmium'], In: [49, 'Indium'], Sn: [50, 'Tin'], Sb: [51, 'Antimony'],
  Te: [52, 'Tellurium'], I: [53, 'Iodine'], Xe: [54, 'Xenon'], Cs: [55, 'Caesium'], Ba: [56, 'Barium'],
  La: [57, 'Lanthanum'], Ce: [58, 'Cerium'], Nd: [60, 'Neodymium'], Gd: [64, 'Gadolinium'], Hf: [72, 'Hafnium'],
  Ta: [73, 'Tantalum'], W: [74, 'Tungsten'], Re: [75, 'Rhenium'], Os: [76, 'Osmium'], Ir: [77, 'Iridium'],
  Pt: [78, 'Platinum'], Au: [79, 'Gold'], Hg: [80, 'Mercury'], Tl: [81, 'Thallium'], Pb: [82, 'Lead'],
  Bi: [83, 'Bismuth'], Th: [90, 'Thorium'], U: [92, 'Uranium'], D: [1, 'Deuterium'],
}

export function elementInfo(el: string): { symbol: string; name: string; z: number | null } {
  const sym = el ? el[0]!.toUpperCase() + el.slice(1).toLowerCase() : '?'
  const e = ELEMENTS[sym]
  return { symbol: sym, name: e?.[1] ?? 'Unknown element', z: e?.[0] ?? null }
}

/** A picked atom: index into structure.atoms plus integer supercell translation. */
export interface AtomPick {
  ai: number
  t: Vec3
}

export function samePick(a: AtomPick | null, b: AtomPick | null): boolean {
  return !!a && !!b && a.ai === b.ai && a.t[0] === b.t[0] && a.t[1] === b.t[1] && a.t[2] === b.t[2]
}

const f4 = (v: number) => (Math.abs(v) < 5e-5 ? 0 : v).toFixed(4)
const f3 = (v: number) => (Math.abs(v) < 5e-4 ? 0 : v).toFixed(3)

export function formatTranslation(t: Vec3): string {
  return t[0] || t[1] || t[2] ? ` + (${t[0]},${t[1]},${t[2]})` : ''
}

export interface AtomInfo {
  title: string
  label: string
  element: string
  elementName: string
  atomicNumber: number | null
  frac: string
  cart: string
  op: string
  occupancy: string | null
  uIso: string | null
}

/**
 * Details for a drawn atom. `drawnCart` is the displayed (placed) Cartesian of the
 * unit-cell copy; the supercell translation is added on top.
 */
export function atomInfo(
  atom: SymmetryCopyAtom,
  drawnCart: Vec3,
  t: Vec3,
  cell: CellParams,
  op: Operator | undefined,
  toCart: (f: Vec3) => Vec3,
): AtomInfo {
  const d = toCart(t)
  const cart: Vec3 = [drawnCart[0] + d[0], drawnCart[1] + d[1], drawnCart[2] + d[2]]
  const fr = cartToFrac(cart, cell)
  const e = elementInfo(atom.element)
  return {
    title: `${e.symbol} · ${e.name}`,
    label: atom.label,
    element: e.symbol,
    elementName: e.name,
    atomicNumber: e.z,
    frac: `(${f4(fr[0])}, ${f4(fr[1])}, ${f4(fr[2])})`,
    cart: `(${f3(cart[0])}, ${f3(cart[1])}, ${f3(cart[2])}) Å`,
    op: `op ${atom.opIndex} ${op?.triplet ?? ''}${formatTranslation(t)}`.trim(),
    occupancy: atom.occupancy != null && atom.occupancy !== 1 ? atom.occupancy.toFixed(3) : atom.occupancy != null ? '1' : null,
    uIso: atom.uIso != null ? `${atom.uIso.toFixed(4)} Å²` : null,
  }
}
