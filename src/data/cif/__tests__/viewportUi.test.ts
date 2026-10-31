import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  asuFragmentCount,
  axisOptionState,
  cifDownloadName,
  escTarget,
  isDenseSupercell,
  molPerOpLabel,
  nonBondedSteps,
  pairPickLabels,
  rovingNext,
  zPrimeLabel,
} from '../viewportUi'
import { atomHitRadius } from '../../../components/CifStructureScene'

const root = resolve(__dirname, '../../../..')
const src = (p: string) => readFileSync(resolve(root, p), 'utf8')

describe('CIF viewport UX helpers', () => {
  it('supercell options over the 40k cap are disabled with a reason, others stay enabled', () => {
    expect(axisOptionState([1, 1, 1], 0, 5, 300, 40000)).toEqual({ disabled: false, reason: null })
    const st = axisOptionState([5, 5, 1], 2, 5, 400, 40000)
    expect(st.disabled).toBe(true)
    expect(st.reason).toMatch(/5×5×5 = 50,000 atoms > 40,000 cap/)
    expect(axisOptionState([5, 5, 1], 2, 1, 400, 40000).disabled).toBe(false)
  })
  it('dense threshold is above 2×2×2', () => {
    expect(isDenseSupercell([1, 1, 1])).toBe(false)
    expect(isDenseSupercell([2, 2, 2])).toBe(false)
    expect(isDenseSupercell([3, 3, 1])).toBe(true)
  })
  it('download names carry the space-group number', () => {
    expect(cifDownloadName('acetic', 14, 'asu', 'sdf')).toBe('acetic_sg14_asu.sdf')
    expect(cifDownloadName('acetic', 14, '', 'cif')).toBe('acetic_sg14.cif')
    expect(cifDownloadName('x', null, 'P1_2x1x1', 'cif')).toBe('x_P1_2x1x1.cif')
  })
  it('Z′ wording explains multi-fragment asymmetric units', () => {
    expect(zPrimeLabel(1, 1)).toBe('Z′ = 1')
    expect(zPrimeLabel(1, 6)).toBe('Z′ = 1 (asymmetric unit contains 6 fragments)')
    expect(molPerOpLabel(6, 6)).toBe('6 fragments (1 ASU)')
    expect(molPerOpLabel(1, 1)).toBe('1 mol')
    const atoms = [
      { opIndex: 1, moleculeId: 0 },
      { opIndex: 1, moleculeId: 1 },
      { opIndex: 2, moleculeId: 2 },
    ]
    expect(asuFragmentCount({ atoms } as never)).toBe(2)
  })
  it('flags consecutive picks that are not bonded', () => {
    const s = { bonds: [{ a: 0, b: 1 }] } as never
    const A = (ai: number, mk = 'm0') => ({ pick: { ai, t: [0, 0, 0] as [number, number, number] }, moleculeKey: mk })
    expect(nonBondedSteps(s, [A(0), A(1)])).toEqual([false])
    expect(nonBondedSteps(s, [A(0), A(1), A(5)])).toEqual([false, true])
    expect(nonBondedSteps(s, [A(0), A(1, 'm1')])).toEqual([true])
  })
  it('pair labels say which pick is A and which is B', () => {
    const at = [
      { moleculeKey: 'a', label: 'C1', triplet: 'x,y,z' },
      { moleculeKey: 'a', label: 'O1', triplet: 'x,y,z' },
      { moleculeKey: 'b', label: 'C1', triplet: '-x,-y,-z' },
    ]
    expect(pairPickLabels(at, (i) => (i === 2 ? 3 : 1))).toEqual({
      a: 'A = pick 1 (C1, op 1)',
      b: 'B = pick 3 (C1, op 3)',
    })
    expect(pairPickLabels(at.slice(0, 2), () => 1)).toBeNull()
  })
  it('roving tabindex wraps with arrows/Home/End', () => {
    expect(rovingNext(0, 'ArrowRight', 3)).toBe(1)
    expect(rovingNext(0, 'ArrowLeft', 3)).toBe(2)
    expect(rovingNext(1, 'End', 3)).toBe(2)
    expect(rovingNext(1, 'Tab', 3)).toBeNull()
  })
  it('Esc closes innermost first: menu → Measure → panel', () => {
    expect(escTarget({ menuOpen: true, measureOn: true, hasPicks: true, panelOpen: true })).toBe('menu')
    expect(escTarget({ menuOpen: false, measureOn: true, hasPicks: true, panelOpen: true })).toBe('measure')
    expect(escTarget({ menuOpen: false, measureOn: false, hasPicks: false, panelOpen: true })).toBe('panel')
    expect(escTarget({ menuOpen: false, measureOn: false, hasPicks: false, panelOpen: false })).toBeNull()
  })
  it('atom hit target is larger than the drawn ball (min 0.55 Å)', () => {
    expect(atomHitRadius(0.2)).toBe(0.55)
    expect(atomHitRadius(0.6)).toBeCloseTo(0.9)
  })
})

describe('CIF viewport UX source contracts', () => {
  const vp = src('src/components/cif/CifViewport.tsx')
  const css = src('src/index.css')
  it('one compact toolbar row in the agreed order', () => {
    const order = ['cif-tb-view', "'show'", "'color'", 'cif-tb-sym', 'cif-tb-display', 'cif-tb-measure', 'cif-tb-download', 'cif-tb-reset']
    const pos = order.map((k) => vp.indexOf(k, vp.indexOf('cif-toolbar-row"')))
    pos.forEach((p) => expect(p).toBeGreaterThan(0))
    expect([...pos].sort((a, b) => a - b)).toEqual(pos)
    expect(css).toMatch(/\.cif-toolbar-row\s*\{[^}]*flex-wrap:\s*nowrap/)
  })
  it('viewport has a min height and side panel overlays (no scene shift)', () => {
    expect(css).toMatch(/min-height:\s*max\(420px,\s*55vh\)/)
    expect(css).toMatch(/\.cif-atom-panel\.cif-atom-overlay\s*\{[^}]*position:\s*absolute/)
    expect(vp).not.toMatch(/has-atom-panel/)
  })
  it('symmetry toggle is a switch; Teaching view lives in Display', () => {
    expect(vp).toMatch(/role="switch"/)
    const disp = vp.slice(vp.indexOf('const displayMenu'), vp.indexOf('const selectedOpObj'))
    expect(disp).toMatch(/Teaching view/)
  })
  it('supercell lives in the lattice strip, strict cap, compact (no Reset at 1×1×1)', () => {
    expect(vp).toMatch(/cif-lattice-row[\s\S]*CellParamsBadge[\s\S]*SupercellPicker[\s\S]*strictCap[\s\S]*compact/)
    const pk = src('src/components/SupercellPicker.tsx')
    expect(pk).toMatch(/!\(compact && isDefault\)/)
  })
  it('new CIF resets Measure; Backspace undoes; Copied ✓', () => {
    expect(vp).toMatch(/measureFor !== structure[\s\S]*setMeasureOn\(false\)/)
    expect(vp).toMatch(/e\.key === 'Backspace' && measureOnRef\.current/)
    expect(vp).toMatch(/Copied ✓/)
  })
  it('Download menu has CIF/SDF subheaders and current-view hint', () => {
    expect(vp).toMatch(/cif-menu-head[^>]*>CIF</)
    expect(vp).toMatch(/cif-menu-head[^>]*>SDF/)
    expect(vp).toMatch(/Current view” = exactly what is drawn/)
  })
  it('loading spinner, skip link, keyboard atom list, PXRD roving tabindex', () => {
    expect(vp).toMatch(/cif-spinner/)
    expect(vp).toMatch(/cif-kbd-atoms/)
    expect(src('src/App.tsx')).toMatch(/href="#demo-main"[\s\S]*Skip to 3D view/)
    expect(vp).toMatch(/id="demo-main"/)
    const x = src('src/components/cif/CifXrayPanel.tsx')
    expect(x).toMatch(/tabIndex=\{pi === 0 \? 0 : -1\}/)
    expect(x).not.toMatch(/tabIndex=\{0\}\s*role="button"/)
  })
  it('About sources disclosure wraps COD/CSD help', () => {
    expect(src('src/components/cif/CifLoadPanel.tsx')).toMatch(/<details className="cif-about-sources">[\s\S]*We do not scrape CSD[\s\S]*<\/details>/)
  })
})
