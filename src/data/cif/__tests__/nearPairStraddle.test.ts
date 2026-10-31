import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { expandStructure } from '../expandStructure'
import { parseCif } from '../parseCif'
import { placeCifStructure } from '../placement'
import { distToElement } from '../../nearestImages'
import { getDemo } from '../../registry'
import type { Vec3 } from '../../types'

/** Regression: CIF Near must put the selected element BETWEEN the AU molecule and its mate. */
describe('CIF Near — selected element straddled by AU + mate', () => {
  const text = readFileSync(resolve(__dirname, '../../../../public/samples/acetic_p21c.cif'), 'utf8')
  const s = expandStructure(parseCif(text))
  const demo = getDemo(14)!
  const centroid = (fr: Vec3[], idx: number[]): Vec3 => {
    const c: Vec3 = [0, 0, 0]
    for (const i of idx) for (let k = 0; k < 3; k++) c[k] += fr[i]![k]! / idx.length
    return c
  }
  for (const op of s.operators.filter((o) => o.index !== 1)) {
    it(`op ${op.index} (${op.triplet}): midpoint lies on its element`, () => {
      const { fractionals } = placeCifStructure(s, 'nearest', op.index, demo)
      const au = s.atoms.map((a, i) => (a.opIndex === 1 ? i : -1)).filter((i) => i >= 0)
      const auIdx = new Set(au.map((i) => s.atoms[i]!.auIndex))
      const mate = s.atoms.map((a, i) => (a.opIndex === op.index && auIdx.has(a.auIndex) ? i : -1)).filter((i) => i >= 0)
      const a = centroid(fractionals, au), b = centroid(fractionals, mate)
      const mid: Vec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
      const dOp = demo.operators.find((o) => o.index === op.index)!
      expect(distToElement(demo, mid, dOp)).toBeLessThan(0.05)
    })
  }
})
