/**
 * Intact-molecule assembly for CIF symmetry copies.
 *
 * After operators place atoms (wrapped into [0,1)³), bonding uses the
 * minimum-image convention within each operator copy, then each connected
 * component is unwrapped into contiguous Cartesian coordinates so molecules
 * that straddle a cell face still look whole.
 */

import { addFrac, fracToCart } from '../math'
import { LATTICE_NEIGHBORS as LATTICE } from '../latticeNeighbors'
import type { CellParams, Vec3 } from '../types'
import type { SymmetryBond, SymmetryCopyAtom } from './types'

/** Rough covalent radii (Å). */
export const COVALENT: Record<string, number> = {
  H: 0.31,
  C: 0.76,
  N: 0.71,
  O: 0.66,
  F: 0.57,
  P: 1.07,
  S: 1.05,
  Cl: 1.02,
  Br: 1.2,
  I: 1.39,
  B: 0.84,
  Si: 1.11,
  Se: 1.2,
}

export function covalentRadius(el: string): number {
  return COVALENT[el] ?? 0.8
}


function cartDist(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

/** Nearest lattice image of `b` relative to `a` (both fractional). */
export function nearestImageFrac(
  a: Vec3,
  b: Vec3,
  cell: CellParams,
): { frac: Vec3; cart: Vec3; shift: Vec3; dist: number } {
  const aCart = fracToCart(a, cell)
  let best: { frac: Vec3; cart: Vec3; shift: Vec3; dist: number } | null = null
  for (const n of LATTICE) {
    const frac = addFrac(b, n)
    const cart = fracToCart(frac, cell)
    const dist = cartDist(aCart, cart)
    if (!best || dist < best.dist - 1e-12) {
      best = { frac, cart, shift: n, dist }
    }
  }
  return best!
}

export interface MoleculeBondLink {
  /** Index into the atom array. */
  a: number
  b: number
  /** Lattice shift applied to atom b so it sits next to a. */
  shiftB: Vec3
  dist: number
}

/**
 * Bonds within one operator copy using minimum-image distances.
 * Returns undirected links with the shift that places b next to a.
 */
export function bondsMinImage(
  atoms: SymmetryCopyAtom[],
  indices: number[],
  cell: CellParams,
  scale = 1.25,
): MoleculeBondLink[] {
  const links: MoleculeBondLink[] = []
  for (let ii = 0; ii < indices.length; ii++) {
    for (let jj = ii + 1; jj < indices.length; jj++) {
      const i = indices[ii]!
      const j = indices[jj]!
      const A = atoms[i]!
      const B = atoms[j]!
      const max = (covalentRadius(A.element) + covalentRadius(B.element)) * scale
      const near = nearestImageFrac(A.fractional, B.fractional, cell)
      if (near.dist <= max) {
        links.push({ a: i, b: j, shiftB: near.shift, dist: near.dist })
      }
    }
  }
  return links
}

class UnionFind {
  parent: number[]
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i)
  }
  find(i: number): number {
    let p = this.parent[i]!
    if (p !== i) {
      p = this.find(p)
      this.parent[i] = p
    }
    return p
  }
  union(a: number, b: number) {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent[rb] = ra
  }
}

export interface AssembledMolecules {
  /** Display fractional (unwrapped) per atom index — same length as input atoms. */
  displayFractional: Vec3[]
  displayCartesian: Vec3[]
  /** Molecule id per atom (0…M-1); -1 if isolated and we still assign one. */
  moleculeId: number[]
  /** Bonds with endpoints in the atom array (using display positions). */
  bonds: SymmetryBond[]
  /** Number of molecules (connected components with ≥1 atom). */
  moleculeCount: number
  /** moleculeId → opIndex (molecules stay within one operator). */
  moleculeOpIndex: number[]
}

/**
 * Cluster + unwrap molecules for all operator copies.
 * Each operator's atoms are clustered independently (teaching: one color = one op).
 */
export function assembleMolecules(
  atoms: SymmetryCopyAtom[],
  cell: CellParams,
): AssembledMolecules {
  const n = atoms.length
  const displayFractional: Vec3[] = atoms.map((a) => [...a.fractional] as Vec3)
  const displayCartesian: Vec3[] = atoms.map((a) => [...a.cartesian] as Vec3)
  const moleculeId = new Array<number>(n).fill(-1)
  const bonds: SymmetryBond[] = []
  const moleculeOpIndex: number[] = []

  // Group atom indices by operator
  const byOp = new Map<number, number[]>()
  for (let i = 0; i < n; i++) {
    const op = atoms[i]!.opIndex
    let list = byOp.get(op)
    if (!list) {
      list = []
      byOp.set(op, list)
    }
    list.push(i)
  }

  let nextMol = 0

  for (const [opIndex, indices] of byOp) {
    const links = bondsMinImage(atoms, indices, cell)
    const uf = new UnionFind(indices.length)
    const localIndex = new Map<number, number>()
    indices.forEach((gi, li) => localIndex.set(gi, li))

    for (const link of links) {
      uf.union(localIndex.get(link.a)!, localIndex.get(link.b)!)
    }

    // Components: root local → global indices
    const comps = new Map<number, number[]>()
    for (let li = 0; li < indices.length; li++) {
      const root = uf.find(li)
      let c = comps.get(root)
      if (!c) {
        c = []
        comps.set(root, c)
      }
      c.push(indices[li]!)
    }

    // Adjacency for BFS unwrap (undirected with shift from a→b)
    type Edge = { to: number; shiftTo: Vec3 }
    const adj = new Map<number, Edge[]>()
    const addEdge = (from: number, to: number, shiftTo: Vec3) => {
      let list = adj.get(from)
      if (!list) {
        list = []
        adj.set(from, list)
      }
      list.push({ to, shiftTo })
    }
    for (const link of links) {
      addEdge(link.a, link.b, link.shiftB)
      // Inverse: a relative to shifted-b → shift of a is -shiftB when b is at b+shiftB
      const inv: Vec3 = [-link.shiftB[0], -link.shiftB[1], -link.shiftB[2]]
      addEdge(link.b, link.a, inv)
    }

    for (const members of comps.values()) {
      const mol = nextMol++
      moleculeOpIndex[mol] = opIndex
      // Root: lowest auIndex, then lowest index
      members.sort((i, j) => {
        const d = atoms[i]!.auIndex - atoms[j]!.auIndex
        return d !== 0 ? d : i - j
      })
      const root = members[0]!
      const visited = new Set<number>()
      const queue: number[] = [root]
      visited.add(root)
      moleculeId[root] = mol
      // Root stays at wrapped position
      displayFractional[root] = [...atoms[root]!.fractional] as Vec3
      displayCartesian[root] = fracToCart(displayFractional[root]!, cell)

      while (queue.length) {
        const cur = queue.shift()!
        const curFrac = displayFractional[cur]!
        for (const { to, shiftTo } of adj.get(cur) ?? []) {
          if (visited.has(to)) continue
          if (!members.includes(to)) continue
          // Place `to` at wrapped(to) + shift that matches edge from cur's frame.
          // Edge stores shiftTo relative to wrapped positions: near image of to from cur's wrapped.
          // But cur may already be unwrapped — apply same lattice shift relative to
          // the *wrapped* bond definition: display(to) = wrap(to) + (display(cur) - wrap(cur)) + shiftTo
          // Simpler: display(to) = addFrac(atoms[to].fractional, shiftTo) adjusted by cur unwrap delta.
          const curWrap = atoms[cur]!.fractional
          const delta: Vec3 = [
            curFrac[0] - curWrap[0],
            curFrac[1] - curWrap[1],
            curFrac[2] - curWrap[2],
          ]
          const placed: Vec3 = [
            atoms[to]!.fractional[0] + shiftTo[0] + delta[0],
            atoms[to]!.fractional[1] + shiftTo[1] + delta[1],
            atoms[to]!.fractional[2] + shiftTo[2] + delta[2],
          ]
          displayFractional[to] = placed
          displayCartesian[to] = fracToCart(placed, cell)
          moleculeId[to] = mol
          visited.add(to)
          queue.push(to)
        }
      }

      // Any unvisited (isolated) members keep wrapped coords
      for (const gi of members) {
        if (!visited.has(gi)) {
          moleculeId[gi] = mol
          displayFractional[gi] = [...atoms[gi]!.fractional] as Vec3
          displayCartesian[gi] = fracToCart(displayFractional[gi]!, cell)
        }
      }
    }

    // Emit bonds for this op using display positions (endpoints already set)
    for (const link of links) {
      bonds.push({ a: link.a, b: link.b, opIndex, moleculeId: moleculeId[link.a]! })
    }
  }

  return {
    displayFractional,
    displayCartesian,
    moleculeId,
    bonds,
    moleculeCount: nextMol,
    moleculeOpIndex,
  }
}
