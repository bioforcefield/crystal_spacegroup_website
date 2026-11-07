/**
 * The 3D labels use one bundled font (SceneText). These tests read the font's own cmap
 * and check it covers every character the 3D scenes can draw for the space-group
 * overlays (all 230 groups, Near and Wrap), the static scene labels and the CIF
 * measurement text, so no glyph depends on a runtime CDN fallback.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { inflateSync } from 'node:zlib'
import { getDemo } from '../../data/registry'
import { elementOverlay } from '../../data/elementSelection'
import { opClass } from '../../data/elementClasses'

const ROOT = resolve(__dirname, '../../..')
const FONT = join(ROOT, 'src/assets/fonts/DejaVuSans-scene.woff')

function woffTables(buf: Buffer): Map<string, Buffer> {
  expect(buf.toString('ascii', 0, 4)).toBe('wOFF') // troika parses WOFF1, not WOFF2
  const n = buf.readUInt16BE(12)
  const out = new Map<string, Buffer>()
  for (let i = 0; i < n; i++) {
    const o = 44 + 20 * i
    const tag = buf.toString('ascii', o, o + 4)
    const off = buf.readUInt32BE(o + 4), comp = buf.readUInt32BE(o + 8), orig = buf.readUInt32BE(o + 12)
    const raw = buf.subarray(off, off + comp)
    out.set(tag, comp < orig ? inflateSync(raw) : Buffer.from(raw))
  }
  return out
}

function cmapCodepoints(cmap: Buffer): Set<number> {
  const set = new Set<number>()
  const n = cmap.readUInt16BE(2)
  for (let i = 0; i < n; i++) {
    const off = cmap.readUInt32BE(4 + 8 * i + 4)
    const fmt = cmap.readUInt16BE(off)
    if (fmt === 12) {
      const groups = cmap.readUInt32BE(off + 12)
      for (let g = 0; g < groups; g++) {
        const p = off + 16 + 12 * g
        const start = cmap.readUInt32BE(p), end = cmap.readUInt32BE(p + 4), gid = cmap.readUInt32BE(p + 8)
        for (let c = start; c <= end; c++) if (gid + (c - start) !== 0) set.add(c)
      }
    } else if (fmt === 4) {
      const segX2 = cmap.readUInt16BE(off + 6)
      const ends = off + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2
      for (let s = 0; s < segX2 / 2; s++) {
        const end = cmap.readUInt16BE(ends + 2 * s), start = cmap.readUInt16BE(starts + 2 * s)
        const delta = cmap.readInt16BE(deltas + 2 * s), ro = cmap.readUInt16BE(ranges + 2 * s)
        for (let c = start; c <= end && c !== 0xffff; c++) {
          let gid
          if (ro === 0) gid = (c + delta) & 0xffff
          else {
            const g = cmap.readUInt16BE(ranges + 2 * s + ro + 2 * (c - start))
            gid = g === 0 ? 0 : (g + delta) & 0xffff
          }
          if (gid !== 0) set.add(c)
        }
      }
    }
  }
  return set
}

const tables = woffTables(readFileSync(FONT))
const covered = cmapCodepoints(tables.get('cmap')!)
const missing = (s: string) => [...new Set([...s].map((ch) => ch.codePointAt(0)!))].filter((c) => !covered.has(c)).map((c) => 'U+' + c.toString(16).toUpperCase().padStart(4, '0'))

describe('bundled 3D label font', () => {
  it('is a WOFF1 with mark positioning (GPOS) for combining overbars', () => {
    expect(tables.has('GPOS')).toBe(true)
    expect(tables.has('glyf')).toBe(true)
    // the cmap reader is not vacuous: a character outside the subset is reported
    expect(covered.size).toBeGreaterThan(1000)
    expect(missing('中')).toEqual(['U+4E2D'])
  })

  it('covers the subscripts, superscripts, overbars, fractions, minus and arrows the labels use', () => {
    const needed =
      '₀₁₂₃₄₅₆⁺⁻' + // 2₁ 3₁ 4₂ 6₅ …, 3⁺ / 3⁻
      '\u0304\u0305' + // combining macron / overline (1̄ 3̄ 4̄ 6̄)
      '¼½¾⅓⅔⅙⅚⅛⅜⅝⅞' + // locus / glide fractions
      '−‖·×→←↔' + // minus, parallel, separators, arrows
      'Å°±' + // CIF distances / angles
      'αβγ' +
      ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~'
    expect(missing(needed)).toEqual([])
  })

  it('covers every 3D overlay label in all 230 groups (selected element, Near and Wrap, plus context)', () => {
    const chars = new Set<string>()
    const add = (s: string) => { for (const ch of s) chars.add(ch) }
    for (let sg = 1; sg <= 230; sg++) {
      const d = getDemo(sg)!
      for (const op of d.operators) {
        const c = opClass(d, op)
        add(`${c.symbol} ${c.locus} ${c.short}`)
      }
      const ctx = elementOverlay(d, 1, 'nearest').context
      for (const el of ctx) add(`${el.symbol} ${el.cls.locus}`)
      for (const op of d.operators) {
        if (op.index === 1) continue
        for (const mode of ['nearest', 'wrap'] as const) {
          const s = elementOverlay(d, op.index, mode).selected
          if (s) add(`${s.symbol} ${s.cls.locus}`)
        }
      }
    }
    const s = [...chars].join('')
    expect(s).toContain('₁')
    expect(missing(s)).toEqual([])
  }, 120_000)

  it('static scene labels are covered', () => {
    expect(missing('o a b c BASE · IMAGE 0123456789 a 10.234 Å  C1–O2  109.47°  +12.30°')).toEqual([])
  })
})

describe('every 3D text label uses the bundled font', () => {
  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((f) => {
      const p = join(dir, f)
      return statSync(p).isDirectory() ? (f === '__tests__' ? [] : walk(p)) : /\.tsx?$/.test(f) ? [p] : []
    })
  }
  it('no component renders drei <Text> directly; SceneText sets the font', () => {
    const offenders: string[] = []
    for (const p of walk(join(ROOT, 'src'))) {
      if (p.endsWith('SceneText.tsx')) continue
      const src = readFileSync(p, 'utf8')
      const drei = src.match(/import\s*\{([^}]*)\}\s*from\s*'@react-three\/drei'/g) ?? []
      if (drei.some((m) => /\bText\b/.test(m)) || /<Text[\s>]/.test(src)) offenders.push(p.slice(ROOT.length + 1))
    }
    expect(offenders).toEqual([])
    const st = readFileSync(join(ROOT, 'src/components/SceneText.tsx'), 'utf8')
    expect(st).toMatch(/<Text font=\{SCENE_FONT_URL\} \{\.\.\.props\} \/>/)
    expect(st).toMatch(/DejaVuSans-scene\.woff\?url/)
  })
})
