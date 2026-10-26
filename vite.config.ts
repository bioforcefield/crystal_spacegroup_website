import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

/** After build, duplicate index.html as 404.html for GitHub Pages SPA refreshes. */
function spaFallback404() {
  return {
    name: 'spa-fallback-404',
    closeBundle() {
      const dist = resolve(import.meta.dirname, 'dist')
      const index = resolve(dist, 'index.html')
      if (existsSync(index)) {
        copyFileSync(index, resolve(dist, '404.html'))
      }
    },
  }
}

// GitHub Pages project site: /crystal_spacegroup_website/
// Local `vite` / default build keep base "/" unless PAGES=1.
const pages = process.env.PAGES === '1'

export default defineConfig({
  base: pages ? '/crystal_spacegroup_website/' : '/',
  plugins: [react(), spaFallback404()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
})
