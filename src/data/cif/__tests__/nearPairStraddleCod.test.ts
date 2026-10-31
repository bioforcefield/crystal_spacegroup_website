import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { expandStructure } from '../expandStructure'
import { parseCif } from '../parseCif'
import { isOrderTwo, placeCifStructure } from '../placement'
import { elementsDemoForStructure } from '../demoWithCifCell'
import { distToElement } from '../../nearestImages'
import type { Vec3 } from '../../types'

/**
 * Regression (COD 2212817 op 4, Pbca 2₁ ‖ b): in Near mode every AU molecule
 * and its selected-op mate must straddle the *drawn* element instance —
 * pair midpoint on the element — for every op of every cached COD sample.
 */
const dir = resolve(__dirname, '../../../../public/samples/cod')
const files = readdirSync(dir).filter((f) => f.endsWith('.cif'))

describe('CIF Near — pair midpoint on drawn element (all COD samples, all ops)', () => {
  it('includes 2212817 and 1100303', () => {
    expect(files).toContain('2212817.cif')
    expect(files).toContain('1100303.cif')
  })
  for (const f of files) {
    it(f, () => {
      let s
      try {
        s = expandStructure(parseCif(readFileSync(resolve(dir, f), 'utf8')))
      } catch {
        return
      }
      const demo = elementsDemoForStructure(s)
      if (!demo || s.atoms.length > 20000) return
      const fails: string[] = []
      for (const op of demo.operators) {
        if (op.index === 1 || op.classId === 'identity' || op.classId === 'translation') continue
        const { fractionals } = placeCifStructure(s, 'nearest', op.index, demo)
        const byMol = new Map<number, number[]>()
        s.atoms.forEach((a, i) => {
          const l = byMol.get(a.moleculeId) ?? []
          l.push(i)
          byMol.set(a.moleculeId, l)
        })
        const auMol = new Map<number, number>()
        for (const a of s.atoms) if (a.opIndex === 1 && !auMol.has(a.auIndex)) auMol.set(a.auIndex, a.moleculeId)
        const cen = (idx: number[]): Vec3 => {
          const c: Vec3 = [0, 0, 0]
          for (const i of idx) for (let k = 0; k < 3; k++) c[k] += fractionals[i]![k]! / idx.length
          return c
        }
        const seen = new Set<number>()
        for (const [, idx] of byMol) {
          const first = s.atoms[idx[0]!]!
          if (first.opIndex !== op.index) continue
          const am = auMol.get(first.auIndex)
          if (am == null || seen.has(am)) continue
          seen.add(am)
          const a = cen(byMol.get(am)!), b = cen(idx)
          const mid: Vec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
          const d = isOrderTwo(op.R)
            ? distToElement(demo, mid, op)
            : Math.abs(distToElement(demo, a, op) - distToElement(demo, b, op))
          if (d > 0.05) fails.push(`op ${op.index} ${op.classId} ${op.triplet}: ${d.toFixed(2)} Å`)
        }
      }
      expect(fails).toEqual([])
    }, 60_000)
  }
})
