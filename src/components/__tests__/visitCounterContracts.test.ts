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
    expect(src).toMatch(/Powered by Grok Bot\.\s*\{showVisits \? <VisitCounter parens \/> : <VisitCounter silent \/>\}\s*<\/p>/)
    expect(src).not.toMatch(/bioforcefield/)
    expect(src).not.toMatch(/contact@crystalspacegroups/)
    expect(src).toMatch(/all rights reserved\. Powered by Grok Bot\./)
    expect((src.match(/<p\b/g) ?? []).length).toBe(1)
  })

  it('VisitCounter never renders a dash placeholder; deploy bakes in the worker URL', () => {
    const vc = readSrc('src/components/VisitCounter.tsx')
    expect(vc).toMatch(/if \(silent \|\| !known\) return null/)
    const sh = readSrc('scripts/deploy-gh-pages.sh')
    expect(sh).toMatch(/VITE_COD_PROXY=.*crystal-cod-proxy/)
  })

  it('visit counter CSS is inline (no meta block)', () => {
    const css = readSrc('src/index.css')
    expect(css).not.toMatch(/site-copyright-meta/)
    expect(css).toMatch(/\.visit-counter \{[^}]*display: inline;/)
  })

  it('index-shell App chrome still mounts SiteCopyright', () => {
    const app = readSrc('src/App.tsx')
    expect(app).toMatch(/import SiteCopyright from '\.\/components\/SiteCopyright'/)
    expect(app).toMatch(/<SiteCopyright showVisits=\{onIndex\} \/>/)
    expect(app).toMatch(/const onIndex = location\.pathname === '\/'/)
  })

  it('SG + CIF viewport footers count visits silently (count shown only on front page)', () => {
    const sg = readSrc('src/pages/SpaceGroupPage.tsx')
    const cif = readSrc('src/components/cif/CifViewport.tsx')
    for (const f of [sg, cif]) {
      expect(f).toMatch(/<VisitCounter silent \/>/)
      expect(f).not.toMatch(/<VisitCounter[^>]*parens/)
      expect(f).not.toMatch(/visit-counter--footer/)
      expect(f).not.toMatch(/Visits \$/)
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
    expect(counter).toMatch(/if \(silent \|\| !known\) return null/)
    for (const src of [api, counter]) {
      expect(src).not.toMatch(/google-analytics|gtag\(|GA_MEASUREMENT|googletagmanager/i)
    }
  })
})

describe('footer disclaimer', () => {
  it('replaces the standalone suggest link and holds the only email', () => {
    const idx = readSrc('src/pages/IndexPage.tsx')
    const d = idx.indexOf('data-footer="disclaimer"')
    expect(d).toBeGreaterThan(0)
    expect(idx).not.toMatch(/ideas &amp; discussion on GitHub/)
    expect(idx).not.toMatch(/>\s*Suggest an improvement\s*</)
    expect(idx).toMatch(/For educational use only\./)
    expect((idx.match(/mailto:contact@crystalspacegroups\.com/g) ?? []).length).toBe(1)
    expect(idx.slice(d)).toMatch(/github\.com\/bioforcefield\/crystal_spacegroup_website\/discussions/)
  })
})
