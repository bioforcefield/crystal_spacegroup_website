/**
 * Drawn symmetry elements are derived from the classified operations, not the
 * stored screwAxes / glidePlanes: every element is checked back against its
 * own (W, w), every listed operation has an element, the selected element is
 * the shown Near / Wrap copy's, and the reviewer's geometry cases are pinned.
 */
import { describe, expect, it } from 'vitest'
import { getDemo } from '../registry'
import { classifySeitz } from '../opClassify'
import { groupCentring, groupHex } from '../elementClasses'
import { compositeSymbol, contextElements, contextElementsInRange, elementInBox, elementSymbol, rank, UNIT_BOX, type DisplayElement } from '../elementGeometry'
import { CONTEXT_CAP, elementOverlay } from '../elementSelection'
import { selectionLabels } from '../opLabels'
import { placedPositions } from '../nearestImages'
import type { Mat3, Vec3 } from '../types'

const demos = Array.from({ length: 230 }, (_, i) => getDemo(i + 1)!)
const ap = (W: Mat3, t: Vec3, p: Vec3): Vec3 => [0, 1, 2].map((i) => W[i][0] * p[0] + W[i][1] * p[1] + W[i][2] * p[2] + t[i]) as Vec3
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const near = (a: Vec3, b: Vec3, tol = 1e-6) => a.every((x, i) => Math.abs(x - b[i]) < tol)
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const isInt = (x: number) => Math.abs(x - Math.round(x)) < 1e-6

describe('context elements, all 230 groups', () => {
  it.each(demos.map((d, i) => [i + 1, d] as const))('SG %i: derived from group operations, every op covered', (_n, d) => {
    const els = contextElements(d)
    const centring = groupCentring(d)
    const covered = new Set<number>()
    for (const e of els) {
      // Seitz pair is a coset member of a listed operation
      const op = d.operators.find(
        (o) => e.opIndices.includes(o.index) && JSON.stringify(o.R) === JSON.stringify(e.seitz.R) && sub(e.seitz.t, o.t).every(isInt),
      )
      expect(op, `element ${e.key} is not a coset member of its operations`).toBeTruthy()
      // independent re-classification with the group centring gives the same element type
      const c = classifySeitz(e.seitz.R, e.seitz.t, centring, groupHex(d))
      expect(c.kind).toBe(e.cls.kind)
      expect(compositeSymbol(c, e.members)).toBe(e.symbol)
      const { R, t } = e.seitz
      const g = e.geom
      if (g.type === 'axis') {
        for (const p of [g.p0, g.p1]) {
          expect(p.every((x) => x > -1e-6 && x < 1 + 1e-6)).toBe(true)
          const img = ap(R, t, p)
          if (c.kind === 'rotoinversion') expect(near(cross(sub(img, g.point), g.dir), [0, 0, 0])).toBe(true)
          else expect(near(sub(img, p), c.intrinsicRaw)).toBe(true)
        }
        if (c.kind === 'rotoinversion') expect(near(ap(R, t, e.centre!), e.centre!)).toBe(true)
      } else if (g.type === 'plane') {
        expect(g.poly.length).toBeGreaterThanOrEqual(3)
        for (const v of g.poly) {
          expect(Math.abs(v[0] * g.normal[0] + v[1] * g.normal[1] + v[2] * g.normal[2] - g.offset)).toBeLessThan(1e-6)
          expect(near(sub(ap(R, t, v), v), c.intrinsicRaw)).toBe(true)
        }
      } else {
        expect(near(ap(R, t, g.pos), g.pos)).toBe(true)
      }
      for (const i of e.opIndices) covered.add(i)
    }
    for (const op of d.operators) {
      const k = classifySeitz(op.R, op.t, centring, groupHex(d)).kind
      if (k === 'identity' || k === 'translation') continue
      expect(covered.has(op.index), `op ${op.index} has no drawn element`).toBe(true)
    }
  })
})

describe('translate range is sufficient', () => {
  it.each([52, 57, 88, 100, 142, 166, 194, 199, 220, 227, 230])('SG %i: n ∈ [−1,2]³ finds every element n ∈ [−2,3]³ does', (n) => {
    const d = getDemo(n)!
    const a = new Set(contextElements(d).map((e) => e.key))
    const b = new Set(contextElementsInRange(d, -2, 3).map((e) => e.key))
    expect([...b].filter((k) => !a.has(k))).toEqual([])
  })
})

describe('selected element is the shown copy, Near and Wrap, all 230 groups', () => {
  it.each(demos.map((d, i) => [i + 1, d] as const))('SG %i', (_n, d) => {
    for (const mode of ['nearest', 'wrapped'] as const) {
      for (const op of d.operators) {
        if (op.index === 1) continue
        const s = selectionLabels(d, op.index, mode)
        const ov = elementOverlay(d, op.index, mode)
        if (s.shown.kind === 'translation') {
          expect(ov.selected).toBeNull()
          continue
        }
        const sel = ov.selected!
        expect(sel, `op ${op.index} ${mode}`).toBeTruthy()
        expect(sel.symbol).toBe(elementSymbol(s.shown))
        expect(sel.classId).toBe(s.shownClass.id)
        expect(sel.color).toBe(s.shownClass.color)
        // the element's Seitz pair maps the drawn BASE onto the drawn IMAGE
        const pl = placedPositions(d, op.index, mode).points
        const base = pl.find((p) => p.index === 1)!.fractional
        const img = pl.find((p) => p.index === op.index)!.fractional
        expect(near(ap(sel.seitz.R, sel.seitz.t, base), img, 1e-5)).toBe(true)
        expect(ov.context.some((e) => e.key === sel.key)).toBe(false)
        expect(ov.context.length + 1).toBeLessThanOrEqual(CONTEXT_CAP)
        if (ov.limited) expect(ov.note).toContain(`Showing ${ov.context.length + 1} of ${ov.total}`)
      }
    }
  })
})

describe('reviewer geometry cases', () => {
  const find = (sg: number, pred: (e: DisplayElement) => boolean) => contextElements(getDemo(sg)!).filter(pred)
  const onAxis = (e: DisplayElement, p: Vec3, u: Vec3) =>
    e.geom.type === 'axis' && near(cross(sub(e.geom.point, p), u), [0, 0, 0]) && near(cross(e.geom.dir, u), [0, 0, 0])
  const onPlane = (e: DisplayElement, h: Vec3, d: number) =>
    e.geom.type === 'plane' && near(cross(e.geom.normal, h), [0, 0, 0]) &&
    e.geom.poly.every((v) => Math.abs(v[0] * h[0] + v[1] * h[1] + v[2] * h[2] - d) < 1e-6)
  it('Pnna: 2 ‖ c at ¼,0,z; 2 ‖ a at x,¼,¼; 2₁ ‖ b (no 2₁ ‖ a)', () => {
    expect(find(52, (e) => e.symbol === '2' && onAxis(e, [0.25, 0, 0], [0, 0, 1])).length).toBe(1)
    expect(find(52, (e) => e.symbol === '2' && onAxis(e, [0, 0.25, 0.25], [1, 0, 0])).length).toBe(1)
    expect(find(52, (e) => e.symbol === '2₁' && e.geom.type === 'axis' && near(cross(e.geom.dir, [0, 1, 0]), [0, 0, 0])).length).toBeGreaterThan(0)
    expect(find(52, (e) => e.symbol === '2₁' && e.geom.type === 'axis' && near(cross(e.geom.dir, [1, 0, 0]), [0, 0, 0])).length).toBe(0)
  })
  it('Pbcm: mirror z=¼, b-glide x=0', () => {
    expect(find(57, (e) => e.symbol === 'm' && onPlane(e, [0, 0, 1], 0.25)).length).toBe(1)
    expect(find(57, (e) => e.symbol === 'b' && onPlane(e, [1, 0, 0], 0)).length).toBe(1)
    expect(find(57, (e) => onPlane(e, [1, 0, 0], 0) && e.symbol === 'm').length).toBe(0)
  })
  it('P4₃: op 4 element is 4₃ at 0,0,z (not 4₁)', () => {
    const d = getDemo(78)!
    const e = contextElements(d).find((x) => x.opIndices.includes(4) && onAxis(x, [0, 0, 0], [0, 0, 1]))!
    expect(e.symbol).toBe('4₃')
  })
  it('P4bm: diagonal x,−x+½,z is a mirror; x,x,z a g-glide', () => {
    expect(find(100, (e) => e.symbol === 'm' && onPlane(e, [1, 1, 0], 0.5)).length).toBe(1)
    expect(find(100, (e) => e.symbol === 'g' && onPlane(e, [1, -1, 0], 0)).length).toBe(1)
  })
  it('I4₁/a: b-glide at z=⅛ (not an a-glide at ⅞ only)', () => {
    const els = find(88, (e) => onPlane(e, [0, 0, 1], 0.125))
    expect(els.map((e) => e.symbol)).toContain('b')
  })
  it('I4₁md / I-42d: glide vectors lie in their planes', () => {
    for (const sg of [109, 110, 122]) {
      for (const e of find(sg, (x) => x.cls.kind === 'glide')) {
        const h = (e.geom as { normal: Vec3 }).normal
        const g = e.glide!
        expect(Math.abs(h[0] * g[0] + h[1] * g[1] + h[2] * g[2])).toBeLessThan(1e-9)
      }
    }
  })
  it('F432 op 41 draws a rotation axis, not 2₁', () => {
    const d = getDemo(209)!
    const e = contextElements(d).find((x) => x.opIndices.includes(41))!
    expect(e.symbol).toBe('2')
  })
})

const axisKeyOf = (c: ReturnType<typeof classifySeitz>) => {
  const g = elementInBox(c, UNIT_BOX)
  return g
}

describe('coincident operation types on one element (all 230 groups)', () => {
  it.each(demos.map((d, i) => [i + 1, d] as const))('SG %i: every type found on a locus is kept; ranking honest', (_n, d) => {
    const els = contextElements(d)
    const centring = groupCentring(d)
    const byOps = new Map<number, DisplayElement[]>()
    for (const e of els) for (const i of e.opIndices) byOps.set(i, [...(byOps.get(i) ?? []), e])
    for (const op of d.operators) {
      for (let i = -1; i <= 2; i++)
        for (let j = -1; j <= 2; j++)
          for (let k = -1; k <= 2; k++) {
            const c = classifySeitz(op.R, [op.t[0] + i, op.t[1] + j, op.t[2] + k], centring, groupHex(d))
            if (c.kind === 'identity' || c.kind === 'translation') continue
            const g = axisKeyOf(c)
            if (!g) continue
            // find the element drawn at this locus
            const host = (byOps.get(op.index) ?? []).find((e) => {
              if (e.geom.type !== g.type) return false
              if (g.type === 'point') return near((e.geom as { pos: Vec3 }).pos, g.pos)
              if (g.type === 'axis') {
                const eg = e.geom as { p0: Vec3; p1: Vec3 }
                return (near(eg.p0, g.p0) && near(eg.p1, g.p1)) || (near(eg.p0, g.p1) && near(eg.p1, g.p0))
              }
              const eg = e.geom as { normal: Vec3; offset: number }
              return near(eg.normal, g.normal) && Math.abs(eg.offset - g.offset) < 1e-5
            })
            expect(host, `SG op ${op.index} + (${i},${j},${k}) has no drawn element`).toBeTruthy()
            expect(host!.members.map((m) => m.symbol)).toContain(elementSymbol(c))
            expect(rank(host!.cls)).toBeGreaterThanOrEqual(rank(c))
          }
    }
    for (const e of els) {
      if (e.geom.type !== 'axis') continue
      const kinds = e.members
      const top = e.cls
      // a same-order proper / screw is never hidden behind n̄ (n = 4, 6)
      if (top.kind === 'rotoinversion' && (top.order === 4 || top.order === 6))
        expect(kinds.some((m) => (m.kind === 'rotation' || m.kind === 'screw') && m.symbol.startsWith(String(top.order)))).toBe(false)
      // 3̄ names an axis that also carries 3
      if (kinds.some((m) => m.symbol === '3\u0304') && !kinds.some((m) => /^6/.test(m.symbol))) expect(e.symbol).toBe('3\u0304')
    }
  })
})

describe('ITA axis symbols where proper and improper axes coincide', () => {
  const at = (sg: number, p: Vec3, u: Vec3) =>
    contextElements(getDemo(sg)!).find(
      (e) => e.geom.type === 'axis' && near(cross(sub(e.geom.point, p), u), [0, 0, 0]) && near(cross(e.geom.dir, u), [0, 0, 0]),
    )!
  const z: Vec3 = [0, 0, 1]
  it.each([
    [83, [0, 0, 0], '4/m', ['4', '4\u0304']], // P4/m
    [83, [0.5, 0.5, 0], '4/m', ['4', '4\u0304']],
    [84, [0, 0, 0], '4₂/m', ['4₂', '4\u0304']], // P4₂/m
    [175, [0, 0, 0], '6/m', ['6', '6\u0304', '3\u0304']], // P6/m
    [176, [0, 0, 0], '6₃/m', ['6₃', '6\u0304']], // P6₃/m
    [221, [0, 0, 0], '4/m', ['4', '4\u0304']], // Pm-3m
    [81, [0, 0, 0], '4\u0304', ['4\u0304', '2']], // P-4: 4̄ over the 2 it contains
    [174, [0, 0, 0], '6\u0304', ['6\u0304', '3']], // P-6: 6̄ over 3
    [147, [0, 0, 0], '3\u0304', ['3\u0304', '3']], // P-3: 3̄ over 3
  ] as [number, Vec3, string, string[]][])('SG %i axis through %j ‖ c is %s', (sg, p, sym, members) => {
    const e = at(sg, p, z)
    expect(e.symbol).toBe(sym)
    for (const m of members) expect(e.members.map((x) => x.symbol)).toContain(m)
  })

  it.each([83, 84, 87, 123, 131, 175, 176, 191, 194, 221, 225, 229])('SG %i: every selected op shows its exact element, coincident with a drawn context element', (sg) => {
    const d = getDemo(sg)!
    const all = contextElements(d)
    for (const mode of ['nearest', 'wrapped'] as const)
      for (const op of d.operators) {
        if (op.index === 1) continue
        const s = selectionLabels(d, op.index, mode)
        if (s.shown.kind === 'translation') continue
        const sel = elementOverlay(d, op.index, mode).selected!
        expect(sel.symbol).toBe(elementSymbol(s.shown))
        const host = all.find((e) => e.key === sel.key)
        if (host) expect(host.members.map((m) => m.symbol)).toContain(sel.symbol)
      }
  })
})

describe('bounded context in dense groups', () => {
  it.each(demos.map((d, i) => [i + 1, d] as const))('SG %i: identity selected → meaningful context within the budget', (_n, d) => {
    const ov = elementOverlay(d, 1)
    expect(ov.selected).toBeNull()
    expect(ov.context.length).toBeLessThanOrEqual(CONTEXT_CAP)
    expect(new Set(ov.context.map((e) => e.key)).size).toBe(ov.context.length)
    if (ov.total > 0) expect(ov.context.length).toBe(Math.min(ov.total, CONTEXT_CAP))
    if (ov.limited) {
      expect(ov.note).toBe(`Showing ${ov.context.length} of ${ov.total} symmetry elements in the cell: the elements of each kind nearest the cell centre.`)
      // every family (type + symbol + orientation) is represented when there are fewer families than the budget
      const fam = (e: DisplayElement) => `${e.geom.type}:${e.symbol}:${e.geom.type === 'axis' ? e.geom.dir : e.geom.type === 'plane' ? e.geom.normal : ''}`
      const all = new Set(contextElements(d).map(fam))
      if (all.size <= CONTEXT_CAP) expect(new Set(ov.context.map(fam)).size).toBe(all.size)
    } else expect(ov.note).toBe('')
  })
  it('Fd-3m (227) with an op selected stays within the budget', () => {
    const d = getDemo(227)!
    for (const i of [2, 13, 25, 49, 100, 150, 192]) {
      const ov = elementOverlay(d, i)
      expect(ov.context.length + (ov.selected ? 1 : 0)).toBeLessThanOrEqual(CONTEXT_CAP)
      expect(ov.limited).toBe(true)
    }
  })
})
