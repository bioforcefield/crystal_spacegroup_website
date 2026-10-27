import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { copyFileSync, existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'


/** Dev/preview: same-origin COD metadata search (mirrors worker /search). */
function codSearchDevProxy(): Plugin {
  const COD = 'https://www.crystallography.net/cod/result.php'
  const LIMIT = 20

  async function handle(req: import('http').IncomingMessage, res: import('http').ServerResponse) {
    const host = req.headers.host || 'localhost'
    const u = new URL(req.url || '/', `http://${host}`)
    if (u.pathname !== '/cod-search') return false
    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      res.setHeader('access-control-allow-origin', '*')
      res.end()
      return true
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405
      res.end('Method not allowed')
      return true
    }
    const text = (u.searchParams.get('text') || '').trim()
    const smile = (
      u.searchParams.get('smile') ||
      u.searchParams.get('smiles') ||
      ''
    ).trim()
    const kind = text ? 'text' : smile ? 'smile' : null
    const value = text || smile
    if (!kind) {
      res.statusCode = 400
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ error: 'Provide ?text=… or ?smile=…' }))
      return true
    }
    const listUrl = new URL(COD)
    if (kind === 'text') listUrl.searchParams.set('text', value)
    else listUrl.searchParams.set('smarts', value)
    listUrl.searchParams.set('format', 'lst')
    try {
      const listRes = await fetch(listUrl.toString(), {
        headers: { accept: 'text/plain, application/json' },
      })
      if (!listRes.ok) {
        res.statusCode = 502
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ error: `COD search HTTP ${listRes.status}` }))
        return true
      }
      const listText = await listRes.text()
      const seen = new Set<string>()
      const unique: string[] = []
      for (const tok of listText.split(/[\s,]+/)) {
        const id = tok.replace(/\D/g, '')
        if (!/^\d{5,10}$/.test(id) || seen.has(id)) continue
        seen.add(id)
        unique.push(id)
      }
      const total = unique.length
      const pageIds = unique.slice(0, LIMIT)
      let hits: Array<Record<string, string | null>> = pageIds.map((id) => ({
        id,
        sg: null,
        sgNumber: null,
        formula: null,
        vol: null,
        name: null,
      }))
      if (pageIds.length > 0) {
        const metaUrl = new URL(COD)
        metaUrl.searchParams.set('id', pageIds.join(','))
        metaUrl.searchParams.set('format', 'json')
        const metaRes = await fetch(metaUrl.toString(), {
          headers: { accept: 'application/json' },
        })
        if (metaRes.ok) {
          const parsed = (await metaRes.json()) as unknown[]
          if (Array.isArray(parsed)) {
            const clean = (v: unknown) => {
              if (v == null) return null
              const s = String(v).replace(/^-\s*/, '').replace(/\s*-\s*$/, '').trim()
              return s || null
            }
            const byId = new Map<string, Record<string, string | null>>()
            for (const row of parsed) {
              const o = row as Record<string, unknown>
              const id = String(o.file ?? '').replace(/\D/g, '')
              if (!/^\d{5,10}$/.test(id)) continue
              byId.set(id, {
                id,
                sg: clean(o.sg),
                sgNumber: o.sgNumber != null ? String(o.sgNumber) : null,
                formula: clean(o.formula ?? o.calcformula),
                vol: o.vol != null && o.vol !== '' ? String(o.vol) : null,
                name:
                  clean(o.commonname) ||
                  clean(o.chemname) ||
                  clean(o.mineral) ||
                  null,
              })
            }
            hits = pageIds.map(
              (id) =>
                byId.get(id) || {
                  id,
                  sg: null,
                  sgNumber: null,
                  formula: null,
                  vol: null,
                  name: null,
                },
            )
          }
        }
      }
      const body = JSON.stringify({
        query: { kind, value },
        total,
        capped: total > LIMIT,
        limit: LIMIT,
        hits,
      })
      res.statusCode = 200
      res.setHeader('content-type', 'application/json; charset=utf-8')
      if (req.method === 'HEAD') {
        res.end()
      } else {
        res.end(body)
      }
    } catch (e) {
      res.statusCode = 502
      res.setHeader('content-type', 'application/json')
      res.end(
        JSON.stringify({
          error: `COD search failed: ${e instanceof Error ? e.message : String(e)}`,
        }),
      )
    }
    return true
  }

  return {
    name: 'cod-search-dev-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void handle(req, res).then((done) => {
          if (!done) next()
        })
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        void handle(req, res).then((done) => {
          if (!done) next()
        })
      })
    },
  }
}

/** After build, duplicate index.html as 404.html for GitHub Pages SPA refreshes. */
function spaFallback404() {
  return {
    name: 'spa-fallback-404',
    closeBundle() {
      const dist = resolve(import.meta.dirname, 'dist')
      const index = resolve(dist, 'index.html')
      if (existsSync(index)) {
        copyFileSync(index, resolve(dist, '404.html'))
        writeFileSync(resolve(dist, '.nojekyll'), '')
      }
    },
  }
}

// GitHub Pages project site: /crystal_spacegroup_website/
// Local `vite` / default build keep base "/" unless PAGES=1.
const pages = process.env.PAGES === '1'

export default defineConfig({
  base: pages ? '/crystal_spacegroup_website/' : '/',
  plugins: [react(), spaFallback404(), codSearchDevProxy()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three') || id.includes('node_modules/three-stdlib')) {
            return 'three'
          }
          if (
            id.includes('node_modules/@react-three') ||
            id.includes('node_modules/maath')
          ) {
            return 'r3f'
          }
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      // Same-origin COD CIF proxy for local / preview (avoids browser CORS)
      '/cod-proxy': {
        target: 'https://www.crystallography.net',
        changeOrigin: true,
        secure: true,
        rewrite: (p: string) => p.replace(/^\/cod-proxy\//, '/cod/'),
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/cod-proxy': {
        target: 'https://www.crystallography.net',
        changeOrigin: true,
        secure: true,
        rewrite: (p: string) => p.replace(/^\/cod-proxy\//, '/cod/'),
      },
    },
  },
})
