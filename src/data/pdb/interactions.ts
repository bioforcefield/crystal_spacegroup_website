/**
 * Ligand pocket + key interactions (teaching heuristics, heavy atoms only):
 * H-bond (N/O···N/O 2.5–3.5 Å), salt bridge (opposite charged groups < 4 Å),
 * metal coordination (< 2.8 Å), π-stacking (ring centroids < 5.5 Å, parallel
 * < 30° or T-shaped > 60° within 5.0 Å), hydrophobic (C···C < 4 Å, shortest per residue).
 * Symmetry mates are included (nearest lattice image per operator).
 */
import { applyOperatorRaw, fracToCart } from '../math'
import type { Vec3 } from '../types'
import { covalentBondsGrid, METALS, type LigandInfo, type MacroModel } from './macro'

export type InteractionType = 'hbond' | 'salt' | 'metal' | 'pi' | 'hydrophobic'
export const INTERACTION_TYPES: { v: InteractionType; label: string; color: string }[] = [
  { v: 'hbond', label: 'H-bond', color: '#38bdf8' },
  { v: 'salt', label: 'Salt bridge', color: '#f472b6' },
  { v: 'metal', label: 'Metal', color: '#a78bfa' },
  { v: 'pi', label: 'π-stacking', color: '#facc15' },
  { v: 'hydrophobic', label: 'Hydrophobic', color: '#94a3b8' },
]
export const POCKET_CUTOFF = 4.5

export interface PocketAtom { site: number; name: string; element: string; cart: Vec3 }
export interface PocketResidue {
  key: string
  comp: string
  chain: string
  seq: string
  opIndex: number
  shift: Vec3
  /** '' for the deposited copy, else e.g. "op 2 +(1,0,0)". */
  symCode: string
  label: string
  atoms: PocketAtom[]
  bonds: [number, number][]
  minDist: number
}
export interface Interaction {
  type: InteractionType
  ligAtom: string
  resLabel: string
  resAtom: string
  dist: number
  a: Vec3
  b: Vec3
  /** Indices into LigandSite.atoms (one atom, or the ring for π). */
  ligIdx?: number[]
  /** PocketResidue.key of the partner residue. */
  resKey?: string
}
export interface LigandSite {
  ligand: LigandInfo
  atoms: PocketAtom[]
  bonds: [number, number][]
  centroid: Vec3
  radius: number
  pocket: PocketResidue[]
  interactions: Interaction[]
}

const dist = (p: Vec3, q: Vec3) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])
const sub = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: Vec3): Vec3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l] }
const centroidOf = (ps: Vec3[]): Vec3 => { const c: Vec3 = [0, 0, 0]; for (const p of ps) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2] } return [c[0] / ps.length, c[1] / ps.length, c[2] / ps.length] }

const RES_RINGS: Record<string, string[][]> = {
  PHE: [['CG', 'CD1', 'CD2', 'CE1', 'CE2', 'CZ']],
  TYR: [['CG', 'CD1', 'CD2', 'CE1', 'CE2', 'CZ']],
  TRP: [['CD2', 'CE2', 'CE3', 'CZ2', 'CZ3', 'CH2'], ['CG', 'CD1', 'NE1', 'CE2', 'CD2']],
  HIS: [['CG', 'ND1', 'CD2', 'CE1', 'NE2']],
}
const PURINE = [['N1', 'C2', 'N3', 'C4', 'C5', 'C6'], ['C4', 'C5', 'N7', 'C8', 'N9']]
const PYRIMIDINE = [['N1', 'C2', 'N3', 'C4', 'C5', 'C6']]
for (const r of ['A', 'G', 'DA', 'DG', 'I', 'DI']) RES_RINGS[r] = PURINE
for (const r of ['C', 'U', 'T', 'DC', 'DT', 'DU']) RES_RINGS[r] = PYRIMIDINE
const RES_NEG: Record<string, string[]> = { ASP: ['OD1', 'OD2'], GLU: ['OE1', 'OE2'] }
const RES_POS: Record<string, string[]> = { LYS: ['NZ'], ARG: ['NE', 'NH1', 'NH2'], HIS: ['ND1', 'NE2'] }
const PHOS_O = new Set(['OP1', 'OP2', 'O1P', 'O2P'])

function ringPlane(ps: Vec3[]): { c: Vec3; n: Vec3 } {
  const c = centroidOf(ps)
  let n: Vec3 = [0, 0, 0]
  for (let i = 0; i < ps.length; i++) {
    const x = cross(sub(ps[i]!, c), sub(ps[(i + 1) % ps.length]!, c))
    n = [n[0] + x[0], n[1] + x[1], n[2] + x[2]]
  }
  return { c, n: norm(n) }
}

/** Small rings (5/6) in a bond graph; returns lists of local atom indices. */
export function findRings(n: number, bonds: [number, number][]): number[][] {
  const adj: number[][] = Array.from({ length: n }, () => [])
  for (const [a, b] of bonds) { adj[a]!.push(b); adj[b]!.push(a) }
  const seen = new Set<string>()
  const rings: number[][] = []
  const dfs = (start: number, cur: number, path: number[]) => {
    if (path.length > 6) return
    for (const nx of adj[cur]!) {
      if (nx === start && path.length >= 5) {
        const k = [...path].sort((x, y) => x - y).join(',')
        if (!seen.has(k)) { seen.add(k); rings.push([...path]) }
      } else if (nx > start && !path.includes(nx)) dfs(start, nx, [...path, nx])
    }
  }
  for (let s = 0; s < n; s++) dfs(s, s, [s])
  return rings
}

export function analyzeLigand(m: MacroModel, ligand: LigandInfo, cutoff = POCKET_CUTOFF): LigandSite {
  const els = m.sites.map((s) => s.element)
  const ligAtoms: PocketAtom[] = ligand.atoms.map((i) => ({ site: i, name: m.extras[i]!.atomName, element: els[i]!, cart: m.cart[i]! }))
  const ligBonds = covalentBondsGrid(m.cart, els, ligand.atoms)
  const lc = centroidOf(ligAtoms.map((a) => a.cart))
  const lr = Math.max(0, ...ligAtoms.map((a) => dist(a.cart, lc)))
  const lfrac = centroidOf(ligand.atoms.map((i) => m.sites[i]!.fractional))
  const ligSet = new Set(ligand.atoms)

  // residues of the ASU
  const resMap = new Map<string, number[]>()
  m.extras.forEach((e, i) => {
    if (e.water || ligSet.has(i)) return
    const k = `${e.chain}|${e.seq}|${e.comp}`
    let l = resMap.get(k)
    if (!l) resMap.set(k, (l = []))
    l.push(i)
  })
  const residues = [...resMap.values()].map((idx) => {
    const fc = centroidOf(idx.map((i) => m.sites[i]!.fractional))
    const cc = fracToCart(fc, m.cell)
    return { idx, fc, r: Math.max(0, ...idx.map((i) => dist(m.cart[i]!, cc))) }
  })

  const pocket: PocketResidue[] = []
  const ops = m.crystal ? m.operators : m.operators.slice(0, 1)
  for (const op of ops) {
    for (const res of residues) {
      const y = m.crystal ? applyOperatorRaw(op, res.fc) : res.fc
      const n: Vec3 = m.crystal ? [Math.round(lfrac[0] - y[0]), Math.round(lfrac[1] - y[1]), Math.round(lfrac[2] - y[2])] : [0, 0, 0]
      const yc = fracToCart([y[0] + n[0], y[1] + n[1], y[2] + n[2]], m.cell)
      if (dist(yc, lc) > lr + res.r + cutoff) continue
      const atoms: PocketAtom[] = res.idx.map((i) => {
        const f = m.crystal ? applyOperatorRaw(op, m.sites[i]!.fractional) : m.sites[i]!.fractional
        return { site: i, name: m.extras[i]!.atomName, element: els[i]!, cart: fracToCart([f[0] + n[0], f[1] + n[1], f[2] + n[2]], m.cell) }
      })
      let minD = Infinity
      for (const a of atoms) for (const b of ligAtoms) minD = Math.min(minD, dist(a.cart, b.cart))
      if (minD > cutoff) continue
      const identity = op.index === 1 && !n[0] && !n[1] && !n[2]
      const e = m.extras[res.idx[0]!]!
      const symCode = identity ? '' : `op ${op.index}${n[0] || n[1] || n[2] ? ` +(${n.join(',')})` : ''}`
      const cartArr = atoms.map((a) => a.cart)
      const bl = covalentBondsGrid(cartArr, atoms.map((a) => a.element), atoms.map((_, k) => k))
      pocket.push({
        key: `${e.chain}|${e.seq}|${e.comp}|${op.index}|${n.join(',')}`, comp: e.comp, chain: e.chain, seq: e.seq,
        opIndex: op.index, shift: n, symCode, label: `${e.comp} ${e.seq} ${e.chain}${symCode ? ` [${symCode}]` : ''}`,
        atoms, bonds: bl, minDist: minD,
      })
    }
  }
  pocket.sort((a, b) => a.minDist - b.minDist)

  // ligand charge heuristics
  const deg = ligAtoms.map(() => 0)
  const nb: number[][] = ligAtoms.map(() => [])
  for (const [a, b] of ligBonds) { deg[a]!++; deg[b]!++; nb[a]!.push(b); nb[b]!.push(a) }
  const ligNeg = new Set<number>(), ligPos = new Set<number>()
  ligAtoms.forEach((a, k) => {
    if (a.element === 'O' && deg[k] === 1) {
      const c = nb[k]![0]!
      const termO = nb[c]!.filter((j) => ligAtoms[j]!.element === 'O' && deg[j] === 1).length
      if (termO >= 2 && ['C', 'P', 'S'].includes(ligAtoms[c]!.element)) ligNeg.add(k)
    }
    if (a.element === 'N') {
      if (deg[k] === 4) ligPos.add(k)
      const c = nb[k]![0]
      if (c != null && ligAtoms[c]!.element === 'C' && nb[c]!.filter((j) => ligAtoms[j]!.element === 'N').length === 3) ligPos.add(k)
    }
  })

  // N/O already coordinating a metal inside the ligand (e.g. heme N → Fe) are not H-bond partners.
  const metalBound = new Set<number>()
  ligAtoms.forEach((a, k) => { if (METALS.has(a.element)) for (const j of nb[k]!) metalBound.add(j) })
  // Ligand metal–N links are often longer than covalent cutoffs; catch them by distance too.
  ligAtoms.forEach((a, k) => {
    if (!METALS.has(a.element)) return
    ligAtoms.forEach((b, j) => { if (j !== k && dist(a.cart, b.cart) < 2.4) metalBound.add(j) })
  })
  const out: Interaction[] = []
  for (const res of pocket) {
    let bestHyd: Interaction | null = null
    for (let k = 0; k < ligAtoms.length; k++) {
      const la = ligAtoms[k]!
      for (const ra of res.atoms) {
        const d = dist(la.cart, ra.cart)
        if (d > 4.0) continue
        const mk = (type: InteractionType): Interaction => ({ type, ligAtom: la.name, resLabel: res.label, resAtom: ra.name, dist: d, a: la.cart, b: ra.cart, ligIdx: [k], resKey: res.key })
        const lMetal = METALS.has(la.element), rMetal = METALS.has(ra.element)
        const polar = (e: string) => e === 'N' || e === 'O' || e === 'S'
        if ((lMetal && polar(ra.element)) || (rMetal && polar(la.element))) { if (d <= 2.8) out.push(mk('metal')); continue }
        const rNeg = RES_NEG[res.comp]?.includes(ra.name) || PHOS_O.has(ra.name)
        const rPos = RES_POS[res.comp]?.includes(ra.name)
        if ((ligNeg.has(k) && rPos) || (ligPos.has(k) && rNeg)) { out.push(mk('salt')); continue }
        if (!metalBound.has(k) && (la.element === 'N' || la.element === 'O') && (ra.element === 'N' || ra.element === 'O') && d >= 2.5 && d <= 3.5) { out.push(mk('hbond')); continue }
        if (la.element === 'C' && ra.element === 'C' && (!bestHyd || d < bestHyd.dist)) bestHyd = mk('hydrophobic')
      }
    }
    if (bestHyd) out.push(bestHyd)
  }
  // π-stacking
  const ligRings = findRings(ligAtoms.length, ligBonds).filter((r) => r.every((k) => ['C', 'N', 'O', 'S'].includes(ligAtoms[k]!.element)))
  for (const lr2 of ligRings) {
    const L = ringPlane(lr2.map((k) => ligAtoms[k]!.cart))
    for (const res of pocket) {
      for (const names of RES_RINGS[res.comp] ?? []) {
        const pts = names.map((nm) => res.atoms.find((a) => a.name === nm)?.cart).filter(Boolean) as Vec3[]
        if (pts.length !== names.length) continue
        const R = ringPlane(pts)
        const d = dist(L.c, R.c)
        const ang = (Math.acos(Math.min(1, Math.abs(L.n[0] * R.n[0] + L.n[1] * R.n[1] + L.n[2] * R.n[2]))) * 180) / Math.PI
        if ((d < 5.5 && ang < 30) || (d < 5.0 && ang > 60)) {
          out.push({ type: 'pi', ligAtom: `ring(${lr2.map((k) => ligAtoms[k]!.name).slice(0, 2).join(',')}…)`, resLabel: res.label, resAtom: `ring ${names[0]}`, dist: d, a: L.c, b: R.c, ligIdx: [...lr2], resKey: res.key })
        }
      }
    }
  }
  const order: InteractionType[] = ['metal', 'salt', 'hbond', 'pi', 'hydrophobic']
  out.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type) || a.dist - b.dist)
  return { ligand, atoms: ligAtoms, bonds: ligBonds, centroid: lc, radius: lr, pocket, interactions: out }
}
