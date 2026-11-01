/**
 * Ligand pocket + key interactions (heavy atoms only), with geometric criteria
 * aligned to PLIP (Salentin et al., Nucleic Acids Res. 2015; Adasme et al. 2021):
 *  - H-bond: donor/acceptor N/O, D···A 2.5–4.1 Å. Hydrogens are usually absent,
 *    so the D–H···A > 100° rule is approximated with heavy-atom angles: every
 *    heavy neighbour X of D or A must satisfy X–D···A ≥ 90° (and X–A···D ≥ 90°).
 *    D···A > 3.5 Å is flagged `weak`.
 *  - Salt bridge: charge-group centres (carboxylate, phosphate, guanidinium,
 *    ammonium, imidazole) ≤ 5.5 Å.
 *  - Metal: metal···N/O/S ≤ 3.0 Å (PLIP metal_dist_max).
 *  - π-stacking: planar (aromatic) 5/6-rings only; centroids ≤ 5.5 Å, lateral
 *    offset ≤ 2.0 Å; parallel < 30°, T-shaped > 60°.
 *  - Cation–π: cation centre to aromatic ring centroid ≤ 6.0 Å, offset ≤ 2.0 Å.
 *  - Hydrophobic: C···C ≤ 4.0 Å, shortest per residue.
 * Symmetry mates are included (nearest lattice image per operator).
 * Pocket residues are those with any atom within POCKET_CUTOFF of the ligand.
 */
import { applyOperatorRaw, fracToCart } from '../math'
import type { Vec3 } from '../types'
import { covalentBondsGrid, METALS, type LigandInfo, type MacroModel } from './macro'

export type InteractionType = 'hbond' | 'salt' | 'metal' | 'pi' | 'cationpi' | 'hydrophobic'
export const INTERACTION_TYPES: { v: InteractionType; label: string; color: string }[] = [
  { v: 'hbond', label: 'H-bond', color: '#38bdf8' },
  { v: 'salt', label: 'Salt bridge', color: '#f472b6' },
  { v: 'metal', label: 'Metal', color: '#a78bfa' },
  { v: 'pi', label: 'π-stacking', color: '#facc15' },
  { v: 'cationpi', label: 'Cation–π', color: '#fb923c' },
  { v: 'hydrophobic', label: 'Hydrophobic', color: '#94a3b8' },
]
export const POCKET_CUTOFF = 4.5
/** Geometric thresholds (Å, degrees). Sources: PLIP config.py defaults. */
export const CRITERIA = {
  hbondMin: 2.5, hbondStrong: 3.5, hbondMax: 4.1, hbondHeavyAngleMin: 90,
  saltMax: 5.5, metalMax: 3.0, hydrophobicMax: 4.0,
  piMax: 5.5, piOffsetMax: 2.0, piParallelMax: 30, piTMin: 60,
  cationPiMax: 6.0, ringPlanarRms: 0.15,
} as const

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
  /** H-bond with D···A between 3.5 and 4.1 Å. */
  weak?: boolean
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

interface ChargeGroup { sign: 1 | -1; idx: number[]; names: string[]; c: Vec3 }

function chargeGroupsLigand(atoms: PocketAtom[], nb: number[][], deg: number[], neg: Set<number>, pos: Set<number>): ChargeGroup[] {
  const out: ChargeGroup[] = []
  const byCentre = new Map<number, number[]>()
  for (const k of neg) { const c = nb[k]![0]!; const l = byCentre.get(c) ?? []; l.push(k); byCentre.set(c, l) }
  for (const idx of byCentre.values()) out.push({ sign: -1, idx, names: idx.map((k) => atoms[k]!.name), c: centroidOf(idx.map((k) => atoms[k]!.cart)) })
  const guan = new Map<number, number[]>()
  for (const k of pos) {
    const c = nb[k]![0]
    if (deg[k] !== 4 && c != null && atoms[c]!.element === 'C') { const l = guan.get(c) ?? []; l.push(k); guan.set(c, l) }
    else out.push({ sign: 1, idx: [k], names: [atoms[k]!.name], c: atoms[k]!.cart })
  }
  for (const [c, l] of guan) {
    const idx = nb[c]!.filter((j) => atoms[j]!.element === 'N')
    void l
    out.push({ sign: 1, idx, names: idx.map((k) => atoms[k]!.name), c: centroidOf(idx.map((k) => atoms[k]!.cart)) })
  }
  return out
}

const RES_GROUPS: Record<string, { sign: 1 | -1; names: string[] }[]> = {
  ASP: [{ sign: -1, names: ['OD1', 'OD2'] }],
  GLU: [{ sign: -1, names: ['OE1', 'OE2'] }],
  LYS: [{ sign: 1, names: ['NZ'] }],
  ARG: [{ sign: 1, names: ['NE', 'NH1', 'NH2'] }],
  HIS: [{ sign: 1, names: ['ND1', 'NE2'] }],
}

function chargeGroupsResidue(res: PocketResidue): ChargeGroup[] {
  const out: ChargeGroup[] = []
  const defs = [...(RES_GROUPS[res.comp] ?? [])]
  const phos = res.atoms.filter((a) => PHOS_O.has(a.name)).map((a) => a.name)
  if (phos.length) defs.push({ sign: -1, names: phos })
  for (const g of defs) {
    const idx = g.names.map((n) => res.atoms.findIndex((a) => a.name === n)).filter((i) => i >= 0)
    if (!idx.length) continue
    out.push({ sign: g.sign, idx, names: idx.map((i) => res.atoms[i]!.name), c: centroidOf(idx.map((i) => res.atoms[i]!.cart)) })
  }
  return out
}

const angleDeg = (x: Vec3, v: Vec3, y: Vec3) => {
  const a = sub(x, v), b = sub(y, v)
  const c = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / ((Math.hypot(...a) * Math.hypot(...b)) || 1)
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI
}

/** Heavy-atom proxy for D–H···A > 100°: no heavy neighbour may point at the partner. */
export function hbondAnglesOk(p: Vec3, pNb: Vec3[], q: Vec3, qNb: Vec3[], minDeg: number): boolean {
  for (const x of pNb) if (angleDeg(x, p, q) < minDeg) return false
  for (const x of qNb) if (angleDeg(x, q, p) < minDeg) return false
  return true
}

/** Distance of `p` from the normal line through ring centre `c` (PLIP "offset"). */
export function lateralOffset(c: Vec3, n: Vec3, p: Vec3): number {
  const v = sub(p, c)
  const t = v[0] * n[0] + v[1] * n[1] + v[2] * n[2]
  return Math.hypot(v[0] - t * n[0], v[1] - t * n[1], v[2] - t * n[2])
}

/** RMS distance of ring atoms from their best plane ≤ tol (aromaticity proxy). */
export function isPlanar(ps: Vec3[], tol: number): boolean {
  const { c, n } = ringPlane(ps)
  let s = 0
  for (const p of ps) { const v = sub(p, c); const t = v[0] * n[0] + v[1] * n[1] + v[2] * n[2]; s += t * t }
  return Math.sqrt(s / ps.length) <= tol
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
  const C = CRITERIA
  const ligNb = (k: number) => nb[k]!.map((j) => ligAtoms[j]!.cart)
  const resNbs = (res: PocketResidue) => {
    const r: number[][] = res.atoms.map(() => [])
    for (const [a, b] of res.bonds) { r[a]!.push(b); r[b]!.push(a) }
    return r
  }
  // charge groups
  const ligGroups = chargeGroupsLigand(ligAtoms, nb, deg, ligNeg, ligPos)
  const ligAroRings = findRings(ligAtoms.length, ligBonds)
    .filter((r) => r.every((k) => ['C', 'N', 'O', 'S'].includes(ligAtoms[k]!.element)))
    .filter((r) => isPlanar(r.map((k) => ligAtoms[k]!.cart), C.ringPlanarRms))
  for (const res of pocket) {
    const rnb = resNbs(res)
    const resGroups = chargeGroupsResidue(res)
    const saltPairs = new Set<string>()
    for (const lg of ligGroups) for (const rg of resGroups) {
      if (lg.sign === rg.sign) continue
      const d = dist(lg.c, rg.c)
      if (d > C.saltMax) continue
      out.push({ type: 'salt', ligAtom: lg.names.join('/'), resLabel: res.label, resAtom: rg.names.join('/'), dist: d, a: lg.c, b: rg.c, ligIdx: [...lg.idx], resKey: res.key })
      for (const i of lg.idx) for (const j of rg.idx) saltPairs.add(`${i}|${j}`)
    }
    let bestHyd: Interaction | null = null
    for (let k = 0; k < ligAtoms.length; k++) {
      const la = ligAtoms[k]!
      for (let ri = 0; ri < res.atoms.length; ri++) {
        const ra = res.atoms[ri]!
        const d = dist(la.cart, ra.cart)
        if (d > C.hbondMax) continue
        const mk = (type: InteractionType): Interaction => ({ type, ligAtom: la.name, resLabel: res.label, resAtom: ra.name, dist: d, a: la.cart, b: ra.cart, ligIdx: [k], resKey: res.key })
        const lMetal = METALS.has(la.element), rMetal = METALS.has(ra.element)
        const polar = (e: string) => e === 'N' || e === 'O' || e === 'S'
        if ((lMetal && polar(ra.element)) || (rMetal && polar(la.element))) { if (d <= C.metalMax) out.push(mk('metal')); continue }
        if (saltPairs.has(`${k}|${ri}`)) continue
        if (!metalBound.has(k) && (la.element === 'N' || la.element === 'O') && (ra.element === 'N' || ra.element === 'O') && d >= C.hbondMin &&
          hbondAnglesOk(la.cart, ligNb(k), ra.cart, rnb[ri]!.map((j) => res.atoms[j]!.cart), C.hbondHeavyAngleMin)) {
          const h = mk('hbond')
          if (d > C.hbondStrong) h.weak = true
          out.push(h)
          continue
        }
        if (d <= C.hydrophobicMax && la.element === 'C' && ra.element === 'C' && (!bestHyd || d < bestHyd.dist)) bestHyd = mk('hydrophobic')
      }
    }
    if (bestHyd) out.push(bestHyd)
  }
  // π-stacking and cation–π
  for (const lr2 of ligAroRings) {
    const L = ringPlane(lr2.map((k) => ligAtoms[k]!.cart))
    const ligRingLabel = `ring(${lr2.map((k) => ligAtoms[k]!.name).slice(0, 2).join(',')}…)`
    for (const res of pocket) {
      for (const names of RES_RINGS[res.comp] ?? []) {
        const pts = names.map((nm) => res.atoms.find((a) => a.name === nm)?.cart).filter(Boolean) as Vec3[]
        if (pts.length !== names.length) continue
        const R = ringPlane(pts)
        const d = dist(L.c, R.c)
        if (d > C.piMax) continue
        const ang = (Math.acos(Math.min(1, Math.abs(L.n[0] * R.n[0] + L.n[1] * R.n[1] + L.n[2] * R.n[2]))) * 180) / Math.PI
        const off = Math.min(lateralOffset(L.c, L.n, R.c), lateralOffset(R.c, R.n, L.c))
        if (off > C.piOffsetMax) continue
        if (ang < C.piParallelMax || ang > C.piTMin) {
          out.push({ type: 'pi', ligAtom: ligRingLabel, resLabel: res.label, resAtom: `ring ${names[0]}`, dist: d, a: L.c, b: R.c, ligIdx: [...lr2], resKey: res.key })
        }
      }
      // residue cation → ligand ring
      for (const g of chargeGroupsResidue(res)) {
        if (g.sign !== 1) continue
        const d = dist(g.c, L.c)
        if (d <= C.cationPiMax && lateralOffset(L.c, L.n, g.c) <= C.piOffsetMax)
          out.push({ type: 'cationpi', ligAtom: ligRingLabel, resLabel: res.label, resAtom: g.names.join('/'), dist: d, a: L.c, b: g.c, ligIdx: [...lr2], resKey: res.key })
      }
    }
  }
  // ligand cation → residue ring
  for (const g of ligGroups) {
    if (g.sign !== 1) continue
    for (const res of pocket) for (const names of RES_RINGS[res.comp] ?? []) {
      const pts = names.map((nm) => res.atoms.find((a) => a.name === nm)?.cart).filter(Boolean) as Vec3[]
      if (pts.length !== names.length || res.comp === 'HIS') continue
      const R = ringPlane(pts)
      const d = dist(g.c, R.c)
      if (d <= C.cationPiMax && lateralOffset(R.c, R.n, g.c) <= C.piOffsetMax)
        out.push({ type: 'cationpi', ligAtom: g.names.join('/'), resLabel: res.label, resAtom: `ring ${names[0]}`, dist: d, a: g.c, b: R.c, ligIdx: [...g.idx], resKey: res.key })
    }
  }
  const order: InteractionType[] = ['metal', 'salt', 'hbond', 'pi', 'cationpi', 'hydrophobic']
  out.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type) || a.dist - b.dist)
  return { ligand, atoms: ligAtoms, bonds: ligBonds, centroid: lc, radius: lr, pocket, interactions: out }
}
