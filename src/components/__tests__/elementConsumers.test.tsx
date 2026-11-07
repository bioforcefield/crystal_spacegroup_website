// @vitest-environment jsdom
/**
 * Render consumers agree with the derived classification: the 2D diagram's
 * highlighted element is the shown copy's (Near / Wrap), every drawn element
 * and every operator chip uses the one authoritative class palette.
 */
import React from 'react'
;(globalThis as { React?: typeof React }).React = React
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import SpaceGroupDiagram2D from '../SpaceGroupDiagram2D'
import OperatorPanel from '../OperatorPanel'
import { getDemo } from '../../data/registry'
import { selectionLabels } from '../../data/opLabels'
import { elementSymbol } from '../../data/elementGeometry'
import { DISPLAY_CLASSES, opDisplayClass } from '../../data/elementClasses'

const parse = (html: string) => new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')

describe('2D diagram highlights the shown copy', () => {
  it.each([36, 52, 57, 76, 99, 100, 122, 166, 194, 227])('SG %i, every op, Near and Wrap', (sg) => {
    const demo = getDemo(sg)!
    const palette = new Set(Object.values(DISPLAY_CLASSES).map((c) => c.id))
    for (const mode of ['nearest', 'wrapped'] as const) {
      const stride = demo.operators.length > 48 ? 7 : 1 // dense groups: a spread sample
      for (const op of demo.operators.filter((_, i) => i % stride === 0 || i === 1)) {
        if (op.index === 1) continue
        const doc = parse(
          renderToStaticMarkup(
            <SpaceGroupDiagram2D demo={demo} selectedIndex={op.index} onSelect={() => {}} placementMode={mode} />,
          ),
        )
        const s = selectionLabels(demo, op.index, mode)
        const sel = [...doc.querySelectorAll('.d2-selected')]
        expect(sel.length).toBeLessThanOrEqual(1)
        if (s.shown.kind !== 'translation' && sel.length) {
          expect(sel[0].getAttribute('data-symbol')).toBe(elementSymbol(s.shown))
          expect(sel[0].getAttribute('data-class')).toBe(s.shownClass.id)
        }
        for (const el of doc.querySelectorAll('.d2-element')) expect(palette.has(el.getAttribute('data-class') as never)).toBe(true)
      }
    }
  }, 60000)

  it('P4mm op 8: Near and Wrap highlight the element of the copy each mode shows', () => {
    const demo = getDemo(99)!
    const sym = (mode: 'nearest' | 'wrapped') =>
      parse(renderToStaticMarkup(<SpaceGroupDiagram2D demo={demo} selectedIndex={8} onSelect={() => {}} placementMode={mode} />))
        .querySelector('.d2-selected')
        ?.getAttribute('data-symbol')
    expect(sym('nearest')).toBe(elementSymbol(selectionLabels(demo, 8, 'nearest').shown))
    expect(sym('wrapped')).toBe(elementSymbol(selectionLabels(demo, 8, 'wrapped').shown))
  })
})

describe('operator chips use the derived class colour', () => {
  it.each([36, 52, 57, 65, 100, 194, 209, 199])('SG %i', (sg) => {
    const demo = getDemo(sg)!
    const doc = parse(
      renderToStaticMarkup(
        <MemoryRouter>
          <OperatorPanel demo={demo} selectedIndex={2} onSelect={() => {}} placementMode="nearest" />
        </MemoryRouter>,
      ),
    )
    const rows = [...doc.querySelectorAll('.op-row')]
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      const idx = Number(row.querySelector('.op-index')!.textContent)
      const op = demo.operators.find((o) => o.index === idx)!
      expect((row as HTMLElement).style.getPropertyValue('--op-color')).toBe(opDisplayClass(demo, op).color)
    }
    const legend = [...doc.querySelectorAll('.class-legend-list li')].map((li) => li.textContent)
    const palette = Object.values(DISPLAY_CLASSES).map((c) => c.label)
    for (const l of legend) expect(palette).toContain(l)
  })
})
