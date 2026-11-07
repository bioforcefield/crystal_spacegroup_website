/**
 * If a future placement change ever draws an IMAGE that is not a lattice copy
 * of the operation, the page must not crash: labels fall back to the listed
 * operation, the residual is reported (dev console) and nothing is highlighted.
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('../nearestImages', async (orig) => {
  const real = await orig<typeof import('../nearestImages')>()
  return {
    ...real,
    placedPositions: (demo: never, idx: number, mode: never) => {
      const r = real.placedPositions(demo, idx, mode)
      return {
        ...r,
        points: r.points.map((p) =>
          p.index === idx && idx !== 1 ? { ...p, fractional: [p.fractional[0] + 0.1, p.fractional[1], p.fractional[2]] } : p,
        ),
      }
    },
  }
})

import { getDemo } from '../registry'
import { selectionLabels } from '../opLabels'
import { elementOverlay } from '../elementSelection'

describe('off-lattice IMAGE fallback', () => {
  it('does not throw; reports the residual; highlights nothing', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const d = getDemo(14)!
    const s = selectionLabels(d, 2, 'nearest')
    expect(s.copyResidual).toEqual([0.1, 0, 0])
    expect(s.shifted).toBe(false)
    expect(s.shown).toBe(s.canonical)
    expect(s.motion.plain).toMatch(/not an exact copy under this operation \(off by \(1\/10,0,0\)\)/)
    expect(err).toHaveBeenCalled()
    expect(String(err.mock.calls[0][0])).toMatch(/op 2 .*off the lattice copy.*0\.1/)
    expect(elementOverlay(d, 2, 'nearest').selected).toBeNull()
    err.mockRestore()
  })
})
