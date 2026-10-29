/**
 * Source contracts: visit counter appears in shared copyright + demo footers.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../../..')

function readSrc(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('Visit counter footer contracts', () => {
  it('SiteCopyright puts (VisitCounter) at end of the copyright line', () => {
    const src = readSrc('src/components/SiteCopyright.tsx')
    expect(src).toMatch(/import VisitCounter from '\.\/VisitCounter'/)
    expect(src).not.toMatch(/site-copyright-meta/)
    expect(src).toMatch(/Powered by Grok Bot\. \(\s*<VisitCounter\s*\/>\)\s*<\/p>/)
    expect(src).not.toMatch(/bioforcefield/)
    expect(src).toMatch(/href="mailto:contact@crystalspacegroups\.com"/)
    expect(src).toMatch(/Contact:\{' '\}\s*<a [^>]*>contact@crystalspacegroups\.com<\/a>\. Powered by Grok Bot/)
    expect((src.match(/<p\b/g) ?? []).length).toBe(1)
  })

  it('visit counter CSS is inline (no meta block)', () => {
    const css = readSrc('src/index.css')
    expect(css).not.toMatch(/site-copyright-meta/)
    expect(css).toMatch(/\.visit-counter \{[^}]*display: inline;/)
  })

  it('index-shell App chrome still mounts SiteCopyright', () => {
    const app = readSrc('src/App.tsx')
    expect(app).toMatch(/import SiteCopyright from '\.\/components\/SiteCopyright'/)
    expect(app).toMatch(/<SiteCopyright\s*\/>/)
  })

  it('demo viewport footers include VisitCounter (no SiteCopyright there)', () => {
    const sg = readSrc('src/pages/SpaceGroupPage.tsx')
    const cif = readSrc('src/components/cif/CifViewport.tsx')
    expect(sg).toMatch(/VisitCounter/)
    expect(sg).toMatch(/visit-counter--footer/)
    expect(cif).toMatch(/VisitCounter/)
    expect(cif).toMatch(/visit-counter--footer/)
    for (const src of [sg, cif]) {
      expect(src).toMatch(/\{' \('\}\s*<VisitCounter className="visit-counter--footer" \/>\s*\{'\)'\}\s*<\/span>/)
    }
  })

  it('worker exposes /visits with Durable Object binding', () => {
    const worker = readSrc('scripts/cod-cors-worker.js')
    const toml = readSrc('scripts/wrangler.cod-proxy.toml')
    expect(worker).toMatch(/export class VisitsCounter/)
    expect(worker).toMatch(/path === '\/visits'/)
    expect(worker).toMatch(/handleVisits/)
    expect(worker).toMatch(/peek/)
    expect(toml).toMatch(/VISITS_COUNTER/)
    expect(toml).toMatch(/VisitsCounter/)
    expect(toml).toMatch(/v1-visits-counter/)
  })

  it('no Google Analytics / heavy trackers wired for visits', () => {
    const api = readSrc('src/data/visits/visitsApi.ts')
    const counter = readSrc('src/components/VisitCounter.tsx')
    for (const src of [api, counter]) {
      expect(src).not.toMatch(/google-analytics|gtag\(|GA_MEASUREMENT|googletagmanager/i)
    }
  })
})
