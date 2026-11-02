import { describe, it, expect } from 'vitest'
import { pxrdExportSvg } from '../pxrdExport'
import type { PowderPattern } from '../powder'

const pk = (hkl: string, twoTheta: number, intensity: number) => ({ hkl, twoTheta, intensity, d: 1, multiplicity: 2 })
const pat = { peaks: [pk('1 0 0', 10, 100), pk('1 1 0', 14, 60), pk('2 0 0', 20, 30), pk('2 1 0', 22, 10), pk('2 1 1', 25, 5)] } as unknown as PowderPattern
const base = { patternA: pat, labelA: 'Test', lo: 5, hi: 30, fwhm: 0.1, wavelengthA: 1.5406, background: 'white' as const }

describe('PXRD export SVG', () => {
  it('white background, dark text, title, axis labels, λ', () => {
    const s = pxrdExportSvg({ ...base, threshold: 20 })
    expect(s).toContain('fill="#ffffff"')
    expect(s).toContain('2θ (°)')
    expect(s).toContain('Intensity (a.u.)')
    expect(s).toContain('λ = 1.5406 Å')
    expect(s).toContain('Simulated PXRD — Test')
    expect(s).toContain('stroke-dasharray="8 6"')
  })
  it('labels only peaks at or above the threshold', () => {
    const n = (t: number) => (pxrdExportSvg({ ...base, threshold: t }).match(/>\(\d \d \d\)</g) ?? []).length
    expect(n(20)).toBe(3)
    expect(n(50)).toBe(2)
    expect(n(1)).toBe(5)
  })
})

import { readFileSync } from 'node:fs'
import { PXRD_LABEL_THRESHOLD_DEFAULT } from '../pxrdExport'
describe('PXRD defaults', () => {
  it('label threshold 50% everywhere; sticks off', () => {
    expect(PXRD_LABEL_THRESHOLD_DEFAULT).toBe(50)
    expect(readFileSync('src/components/cif/PxrdPlot.tsx', 'utf8')).toContain('useState(PXRD_LABEL_THRESHOLD_DEFAULT)')
    expect(readFileSync('src/components/cif/CifXrayPanel.tsx', 'utf8')).toMatch(/\[showSticks, setShowSticks\] = useState\(false\)/)
    const s = pxrdExportSvg({ patternA: pat, labelA: 'T', lo: 5, hi: 30, fwhm: 0.1, wavelengthA: 1.5406, background: 'white' })
    expect(s).toContain('I ≥ 50% of max')
    expect((s.match(/>\(\d \d \d\)</g) ?? []).length).toBe(2)
  })
})
