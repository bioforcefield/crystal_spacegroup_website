import React from 'react'
;(globalThis as { React?: typeof React }).React = React
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SpaceGroupDiagram2D from '../SpaceGroupDiagram2D'
import { c2Demo } from '../../data/c2'

const html = (m?: [number, number, number]) =>
  renderToStaticMarkup(
    <SpaceGroupDiagram2D demo={c2Demo} selectedIndex={1} onSelect={() => {}} multiples={m} />,
  )
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length

describe('2D diagram supercell', () => {
  it('1×1×1 identical to no multiples', () => {
    expect(html([1, 1, 1])).toBe(html(undefined))
  })
  it('tiles in-plane cells and replicates sites', () => {
    // C2 default projection ↓b → in-plane a,c
    const h = html([2, 1, 2])
    expect(count(h, /d2-site replica/g)).toBe(c2Demo.operators.length * 3)
    expect(h).toContain('d2-supercell')
  })
  it('out-of-plane multiple only adds a note', () => {
    const h = html([1, 3, 1])
    expect(count(h, /d2-site replica/g)).toBe(0)
    expect(h).toContain('×3 along b')
  })
})

import { getDemo } from '../../data/registry'
describe('2D supercell, all 230 groups', () => {
  it.each(Array.from({ length: 230 }, (_, i) => i + 1))('SG %i', (n) => {
    const demo = getDemo(n)!
    const r = (m?: [number, number, number]) =>
      renderToStaticMarkup(
        <SpaceGroupDiagram2D demo={demo} selectedIndex={1} onSelect={() => {}} multiples={m} />,
      )
    expect(r([1, 1, 1])).toBe(r(undefined))
    const h = r([2, 2, 2])
    expect(count(h, /d2-site replica/g)).toBe(demo.operators.length * 3)
    expect(h).toContain('×2 along')
  })
})
