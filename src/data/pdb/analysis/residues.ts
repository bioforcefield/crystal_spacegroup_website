/** Group a MacroModel's ASU atoms into residues (model 1, first altloc). */
import type { Vec3 } from '../../types'
import type { MacroModel } from '../macro'
import { isAmino, isNucleic } from '../macro'

export interface Residue {
  /** Stable key chain|seq|comp (matches the ligand-pocket resKey prefix). */
  key: string
  chain: string
  seq: string
  num: number
  comp: string
  kind: 'protein' | 'nucleic' | 'other'
  atoms: Map<string, Vec3>
  /** First ASU site index (for highlighting). */
  site: number
  centroid: Vec3
}

export function residuesOf(model: MacroModel): Residue[] {
  const out: Residue[] = []
  let cur: Residue | null = null
  const n = model.extras.length
  for (let i = 0; i < n; i++) {
    const e = model.extras[i]!
    if (e.water) continue
    const key = `${e.chain}|${e.seq}|${e.comp}`
    if (!cur || cur.key !== key) {
      const kind = isAmino(e.comp) && !e.hetero ? 'protein' : isAmino(e.comp) ? 'protein' : isNucleic(e.comp) ? 'nucleic' : 'other'
      cur = { key, chain: e.chain, seq: e.seq, num: parseInt(e.seq, 10), comp: e.comp, kind, atoms: new Map(), site: i, centroid: [0, 0, 0] }
      out.push(cur)
    }
    const nm = e.atomName.replace(/\*/g, "'")
    if (!cur.atoms.has(nm)) cur.atoms.set(nm, model.cart[i]!)
  }
  for (const r of out) {
    let x = 0, y = 0, z = 0
    for (const p of r.atoms.values()) { x += p[0]; y += p[1]; z += p[2] }
    const k = r.atoms.size || 1
    r.centroid = [x / k, y / k, z / k]
  }
  return out
}

export function resLabel(r: { chain: string; comp: string; seq: string }) {
  return `${r.comp} ${r.chain}${r.seq}`
}
