import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Automatic JSX runtime so component tests (// @vitest-environment jsdom) need no React import.
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: { provider: 'v8', include: ['src/**/*.{ts,tsx}'], exclude: ['src/**/__tests__/**', 'src/**/*.test.*'] },
  },
})
