import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { copyFileSync, existsSync, writeFileSync } from 'node:fs'
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
  plugins: [react(), spaFallback404()],
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
