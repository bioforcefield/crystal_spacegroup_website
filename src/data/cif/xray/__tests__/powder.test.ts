import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { expandStructure } from '../../expandStructure'
import { parseCif } from '../../parseCif'
import { extractMetadata } from '../../metadata'
import { formFactor } from '../formFactors'
import { computePowderFromStructure, computePowderPattern } from '../powder'
import { lorentzEnvelope } from '../envelope'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../../../public/samples')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

describe('formFactor', () => {
  it('C near forward scatter ≈ Z', () => {
    expect(formFactor('C', 0)).toBeGreaterThan(5)
    expect(formFactor('C', 0)).toBeLessThan(7)
  })
  it('falls off with s', () => {
    expect(formFactor('O', 0.5)).toBeLessThan(formFactor('O', 0.1))
  })
})

describe('extractMetadata xray', () => {
  it('reads wavelength, type, temp, R from COD-like tags', () => {
    const pairs = new Map<string, string>([
      ['_diffrn_radiation_wavelength', '0.71073'],
      ['_diffrn_radiation_type', 'MoK\\a'],
      ['_diffrn_ambient_temperature', '299(2)'],
      ['_refine_ls_R_factor_all', '0.054'],
      ['_refine_ls_wR_factor_ref', '0.12'],
      ['_refine_ls_goodness_of_fit_ref', '1.05'],
    ])
    const meta = extractMetadata(pairs, [])
    expect(meta.xray?.wavelengthA).toBeCloseTo(0.71073)
    expect(meta.xray?.radiationType).toMatch(/MoKα/)
    expect(meta.xray?.probe).toBe('x-ray')
    expect(meta.xray?.temperatureK).toBeCloseTo(299)
    expect(meta.xray?.rFactorAll).toBeCloseTo(0.054)
    expect(meta.xray?.wRFactorRef).toBeCloseTo(0.12)
    expect(meta.xray?.gof).toBeCloseTo(1.05)
  })

  it('omits xray when tags absent', () => {
    const meta = extractMetadata(new Map([['_chemical_formula_sum', 'C2 H4 O2']]), [])
    expect(meta.xray).toBeUndefined()
  })
})

describe('computePowderPattern', () => {
  it('acetic teaching sample yields peaks under Cu Kα', () => {
    const expanded = expandStructure(parseCif(read('acetic_p21c.cif')))
    const pat = computePowderFromStructure(expanded, {
      wavelengthA: 1.5406,
      twoThetaMin: 5,
      twoThetaMax: 50,
    })
    expect(pat.siteCount).toBeGreaterThan(0)
    expect(pat.peaks.length).toBeGreaterThan(3)
    expect(pat.peaks[0]!.twoTheta).toBeGreaterThanOrEqual(5)
    const maxI = Math.max(...pat.peaks.map((p) => p.intensity))
    expect(maxI).toBeCloseTo(100, 0)
  })

  it('FCC Pb-like: odd mixed indices extinct via F centering', () => {
    // Simple rocksalt-like: Pb at 0,0,0 and S at 1/2,1/2,1/2 in Fm-3m cell
    // Using only AU sites would not capture F; use 4 F lattice images manually
    const cell = { a: 5.9, b: 5.9, c: 5.9 }
    const sites = [
      { element: 'Pb', fractional: [0, 0, 0] as [number, number, number], occupancy: 1 },
      { element: 'S', fractional: [0.5, 0.5, 0.5] as [number, number, number], occupancy: 1 },
    ]
    const pat = computePowderPattern(cell, sites, 'F m -3 m', {
      wavelengthA: 1.5406,
      twoThetaMin: 10,
      twoThetaMax: 80,
      maxH: 4,
    })
    // (100) forbidden by F; (111) and (200) allowed
    const labels = pat.peaks.map((p) => p.hkl.replace(/−/g, '-'))
    expect(labels.some((l) => /^1 0 0$/.test(l) || /^0 1 0$/.test(l))).toBe(false)
    expect(pat.peaks.length).toBeGreaterThan(0)
  })

  it('envelope normalizes to 100', () => {
    const env = lorentzEnvelope(
      [
        { twoTheta: 20, intensity: 50 },
        { twoTheta: 30, intensity: 100 },
      ],
      10,
      40,
      0.3,
      100,
    )
    expect(Math.max(...env.y)).toBeCloseTo(100, 0)
  })
})
