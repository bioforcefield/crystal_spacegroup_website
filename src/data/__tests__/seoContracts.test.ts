/**
 * Source contracts: basic SEO files for Google discovery.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../../..')

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('SEO discovery contracts', () => {
  it('index.html has description, canonical, and Open Graph (no noindex)', () => {
    const html = read('index.html')
    expect(html).toMatch(/<meta\s+name="description"\s+content="/)
    expect(html).toMatch(/<link\s+rel="canonical"\s+href="https:\/\/crystalspacegroups\.com\/"/)
    expect(html).toMatch(/property="og:title"/)
    expect(html).toMatch(/property="og:description"/)
    expect(html).toMatch(/property="og:url"\s+content="https:\/\/crystalspacegroups\.com\/"/)
    expect(html).toMatch(/property="og:type"\s+content="website"/)
    expect(html).toMatch(/name="twitter:card"\s+content="summary"/)
    expect(html).not.toMatch(/noindex/i)
  })

  it('public/robots.txt allows crawl and points at sitemap', () => {
    const robots = read('public/robots.txt')
    expect(robots).toMatch(/User-agent:\s*\*/)
    expect(robots).toMatch(/Allow:\s*\//)
    expect(robots).toMatch(/Sitemap:\s*https:\/\/crystalspacegroups\.com\/sitemap\.xml/)
  })

  it('public/sitemap.xml lists home, tools, and /sg/1–230 (no redirects)', () => {
    expect(existsSync(resolve(root, 'public/sitemap.xml'))).toBe(true)
    const xml = read('public/sitemap.xml')
    expect(xml).toMatch(/https:\/\/crystalspacegroups\.com\//)
    expect(xml).toMatch(/https:\/\/crystalspacegroups\.com\/cif/)
    expect(xml).toMatch(/https:\/\/crystalspacegroups\.com\/pubs/)
    expect(xml).toMatch(/https:\/\/crystalspacegroups\.com\/morphology/)
    expect(xml).toMatch(/https:\/\/crystalspacegroups\.com\/kinetics/)
    expect(xml).toMatch(/https:\/\/crystalspacegroups\.com\/sg\/1</)
    expect(xml).toMatch(/https:\/\/crystalspacegroups\.com\/sg\/230</)
    expect(xml).not.toMatch(/\/morph</)
    expect(xml).not.toMatch(/\/pbca|\/c2c|\/p21c|\/pbar1|\/p-1/)
    const locs = xml.match(/<loc>/g) ?? []
    expect(locs.length).toBe(235) // / + 4 tools + 230 sg
  })
})
