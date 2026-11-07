// @vitest-environment node
/**
 * Runs troika's own typesetter (main-thread path, as in the browser worker) on the
 * bundled font and checks every 3D-label character maps to a real glyph in that one
 * font: no .notdef (the boxed-X seen for 2₁) and no CDN fallback request.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const FONT_PATH = resolve(__dirname, '../../assets/fonts/DejaVuSans-scene.woff')
const FONT_URL = 'test://scene-font.woff'

describe('troika typesets 3D labels with the bundled font only', () => {
  it('no missing glyphs and no other font requested', async () => {
    const g = globalThis as Record<string, unknown>
    g.self ??= globalThis
    g.window ??= globalThis
    const requested: string[] = []
    g.XMLHttpRequest = class {
      status = 0
      response: ArrayBuffer | null = null
      onload: () => void = () => {}
      onerror: (e: unknown) => void = () => {}
      private url = ''
      responseType = ''
      open(_m: string, url: string) { this.url = url }
      send() {
        requested.push(this.url)
        queueMicrotask(() => {
          if (this.url !== FONT_URL) { this.status = 404; this.onload(); return }
          const b = readFileSync(FONT_PATH)
          this.response = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
          this.status = 200
          this.onload()
        })
      }
    }
    const realFetch = globalThis.fetch
    globalThis.fetch = ((u: string) => { requested.push(String(u)); return Promise.reject(new Error('no network')) }) as typeof fetch
    try {
      const { typesetterWorkerModule } = await import('troika-three-text')
      const { defineWorkerModule } = await import('troika-worker-utils')
      const typeset = defineWorkerModule({
        name: 'scene-font-check',
        dependencies: [typesetterWorkerModule],
        init(t: { typeset: (a: unknown, cb: (r: unknown) => void) => void }) {
          return (args: unknown) => new Promise((r) => t.typeset(args, r))
        },
      }).onMainThread as (a: unknown) => Promise<{ glyphIds: ArrayLike<number>; glyphFontIndices: ArrayLike<number>; fontData: { src: string }[] }>
      const text = '2₁ 0, y, ¼  3₂ 4₂ 6₅ 1̄ 3̄ 4̄ 6̄ 3⁺(⅓,⅓,−⅓) g(⅙,−⅙,⅚) n(½,½,0) d(¼,¼,¾) ‖ [111̄] a 10.2 Å 109.47° BASE · IMAGE'
      const res = await typeset({ text, font: FONT_URL, fontSize: 0.065, sdfGlyphSize: 64 })
      const ids = Array.from(res.glyphIds)
      expect(ids.length).toBeGreaterThan(50)
      expect(ids.filter((id) => id === 0)).toEqual([])
      expect([...new Set(Array.from(res.glyphFontIndices))]).toEqual([0])
      expect(res.fontData.map((f) => f.src)).toEqual([FONT_URL])
      expect(requested).toEqual([FONT_URL])
    } finally {
      globalThis.fetch = realFetch
    }
  }, 30_000)
})
