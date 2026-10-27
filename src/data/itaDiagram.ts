import itaDiagrams from './itaDiagrams.json'

export type ItaDiagramEntry = {
  file: string
  pdfPage: number
  bytes: number
}

const MANIFEST = itaDiagrams as Record<string, ItaDiagramEntry>

/** Public URL for the Vol. A diagram plate (uses Vite BASE_URL for Pages). */
export function itaDiagramUrl(n: number): string | null {
  const entry = MANIFEST[String(n)]
  if (!entry) return null
  const base = import.meta.env.BASE_URL ?? '/'
  const normalized = base.endsWith('/') ? base : `${base}/`
  return `${normalized}${entry.file}`
}

export function itaDiagramEntry(n: number): ItaDiagramEntry | null {
  return MANIFEST[String(n)] ?? null
}

export const ITA_DIAGRAM_CREDIT =
  'International Tables for Crystallography Vol. A (IUCr) — single-group diagram reproduced with acknowledgment'

export const ITA_DIAGRAM_CAPTION = 'ITA Vol. A diagram'
