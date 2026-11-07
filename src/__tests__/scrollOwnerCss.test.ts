/**
 * CSS contract for who scrolls the page (src/index.css):
 *  - site-shell / index pages: the document is the single vertical scroller
 *    (#root auto-height, overflow visible) at every width;
 *  - desktop app pages keep the fixed-panel lock (#root overflow hidden);
 *  - at <=900px app pages also scroll with the document, and no rule makes
 *    html, body or #root an inner scroll container.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type Rule = { media: string; selectors: string[]; decls: Record<string, string> }

function parseCss(src: string): Rule[] {
  const css = src.replace(/\/\*[\s\S]*?\*\//g, '')
  const rules: Rule[] = []
  const walk = (text: string, media: string) => {
    let i = 0
    while (i < text.length) {
      const open = text.indexOf('{', i)
      if (open < 0) break
      const prelude = text.slice(i, open).trim()
      let depth = 1, j = open + 1
      while (j < text.length && depth) { if (text[j] === '{') depth++; else if (text[j] === '}') depth--; j++ }
      const body = text.slice(open + 1, j - 1)
      if (prelude.startsWith('@media')) walk(body, prelude.slice(6).trim())
      else if (!prelude.startsWith('@')) {
        const decls: Record<string, string> = {}
        for (const d of body.split(';')) {
          const k = d.indexOf(':')
          if (k > 0) decls[d.slice(0, k).trim()] = d.slice(k + 1).trim()
        }
        rules.push({ media, selectors: prelude.split(',').map((x) => x.trim().replace(/\s+/g, ' ')), decls })
      }
      i = j
    }
  }
  walk(css, '')
  return rules
}

const rules = parseCss(readFileSync(resolve(__dirname, '../index.css'), 'utf8'))
const mobile = (m: string) => /max-width:\s*(\d+)px/.test(m) && Number(/max-width:\s*(\d+)px/.exec(m)![1]) <= 900
const ROOTS = ['html', 'body', '#root']
const touchesRoot = (sel: string) => ROOTS.includes(sel) || sel.startsWith('#root:has(')
const last = (sel: string, media: (m: string) => boolean, prop: string) => {
  let v: string | undefined
  for (const r of rules) if (media(r.media) && r.selectors.includes(sel) && r.decls[prop] !== undefined) v = r.decls[prop]
  return v
}

describe('page scroll owner (CSS contract)', () => {
  it('no rule makes html, body or #root an auto/scroll container', () => {
    const bad = rules.filter((r) => r.selectors.some(touchesRoot) && /auto|scroll/.test(r.decls.overflow ?? r.decls['overflow-y'] ?? r.decls['overflow-x'] ?? ''))
    expect(bad.map((r) => `${r.media || 'all'} :: ${r.selectors.join(', ')}`)).toEqual([])
  })

  it('site-shell pages: #root grows with content and the document scrolls', () => {
    for (const sel of ['#root:has(.site-shell)', '#root:has(.index-page)']) {
      expect(last(sel, (m) => m === '', 'overflow')).toBe('visible')
      expect(last(sel, (m) => m === '', 'height')).toBe('auto')
    }
    expect(last('.site-shell', (m) => m === '', 'min-height')).toBe('100vh')
  })

  it('desktop app pages keep the fixed-panel lock; <=900px they scroll with the document', () => {
    for (const sel of ['#root:has(.layout-demo)', '#root:has(.demo-shell)']) {
      expect(last(sel, (m) => m === '', 'overflow')).toBe('hidden')
      expect(last(sel, mobile, 'overflow')).toBe('visible')
      expect(last(sel, mobile, 'height')).toBe('auto')
    }
  })

  it('html, body, #root stay full-height blocks with no margin', () => {
    const base = rules.find((r) => r.media === '' && ROOTS.every((s) => r.selectors.includes(s)))!
    expect(base.decls).toMatchObject({ margin: '0', height: '100%', width: '100%' })
  })
})
