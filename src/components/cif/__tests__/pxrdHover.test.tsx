// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { useState } from 'react'
import PxrdPlot, { type PxrdHover } from '../PxrdPlot'
import type { PowderPattern } from '../../../data/cif/xray/powder'

const pk = (hkl: string, twoTheta: number, intensity: number) => ({ hkl, twoTheta, intensity, d: 2.5, multiplicity: 2 })
const pat = { peaks: [pk('1 0 0', 10, 100), pk('1 1 0', 14, 40)] } as unknown as PowderPattern
function Host({ sticks }: { sticks: boolean }) {
  const [hover, setHover] = useState<PxrdHover>(null)
  return <PxrdPlot patternA={pat} patternB={null} lo={5} hi={30} fwhm={0.2} wavelengthA={1.5406} showSticks={sticks}
    labelA="A" labelB="B" hover={hover} setHover={setHover} />
}
afterEach(cleanup)
describe('PXRD hover with sticks off', () => {
  it('invisible hit targets still show the tooltip; no stick lines drawn', () => {
    const { container, getByTestId } = render(<Host sticks={false} />)
    const svg = getByTestId('pxrd-inline-svg')
    expect(svg.querySelectorAll('line.cif-xray-stick')).toHaveLength(0)
    const dots = svg.querySelectorAll<SVGCircleElement>('circle[data-peak="a"]')
    expect(dots).toHaveLength(2)
    expect(dots[0]!.style.opacity).toBe('0')
    fireEvent.mouseEnter(dots[1]!)
    expect(container.querySelector('[data-testid="pxrd-tip"]')?.textContent).toContain('(1 1 0)')
  })
  it('sticks on: unchanged (lines + visible dots)', () => {
    const { getByTestId } = render(<Host sticks />)
    const svg = getByTestId('pxrd-inline-svg')
    expect(svg.querySelectorAll('line.cif-xray-stick')).toHaveLength(2)
    expect(svg.querySelector<SVGCircleElement>('circle[data-peak="a"]')!.style.opacity).toBe('')
  })
})
