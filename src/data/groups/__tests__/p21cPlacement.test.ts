/** SG 14 · P21/c — teaching seed clear of the c-glide plane at y = ¼ (b-projection read). */
import { describe, expect, it } from 'vitest'
import { OPERATORS, SEED, CELL } from '../../p21c'
import { getDemo } from '../../registry'
import { minMotifSeparation, seedIsGeneralPosition, MIN_MOTIF_SEPARATION } from '../../teachingSeed'

describe('SG 14 · P21/c teaching seed', () => {
  it('is a general position', () => {
    expect(seedIsGeneralPosition(OPERATORS, SEED, 4)).toBe(true)
  })
  it('sits well off the c-glide planes y = ¼ / ¾', () => {
    expect(Math.abs(SEED[1] - 0.25)).toBeGreaterThanOrEqual(0.15)
    expect(Math.abs(SEED[1] - 0.75)).toBeGreaterThanOrEqual(0.15)
  })
  it('keeps strong 3D motif separation', () => {
    expect(minMotifSeparation(OPERATORS, SEED, CELL)).toBeGreaterThan(MIN_MOTIF_SEPARATION)
  })
  it('registry demo uses the retuned seed', () => {
    expect(getDemo(14)?.seed).toEqual(SEED)
  })
})
