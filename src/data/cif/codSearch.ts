/**
 * COD metadata search (name/text + SMILES) via the Cloudflare COD proxy
 * or optional VITE_COD_SEARCH / local Vite /cod-search.
 *
 * Does not scrape CSD. Structure queries use COD's `smarts` upstream
 * (we expose smile/smiles in our search URL).
 */

export type CodSearchKind = 'text' | 'smile'

export interface CodSearchHit {
  id: string
  sg: string | null
  sgNumber: string | null
  formula: string | null
  vol: string | null
  name: string | null
}

export interface CodSearchResult {
  query: { kind: CodSearchKind; value: string }
  total: number
  capped: boolean
  limit: number
  hits: CodSearchHit[]
}

export interface CodSearchQuery {
  text?: string
  smile?: string
}

const DEFAULT_LIMIT = 20

/**
 * Derive the worker origin from VITE_COD_PROXY (…/{id}.cif) or VITE_COD_SEARCH.
 * Returns null when neither is set (Pages without proxy — search unavailable).
 */
export function resolveCodSearchBase(
  env: {
    VITE_COD_PROXY?: string
    VITE_COD_SEARCH?: string
  } = import.meta.env as {
    VITE_COD_PROXY?: string
    VITE_COD_SEARCH?: string
  },
): string | null {
  const explicit = env.VITE_COD_SEARCH?.trim()
  if (explicit) return stripTrailingSlash(explicit)

  const proxy = env.VITE_COD_PROXY?.trim()
  if (!proxy) return null

  // https://worker…/{id}.cif  →  https://worker…
  // https://worker…/           →  https://worker…
  let base = proxy.replace(/\{id\}/g, '0').replace(/\/+\d+\.cif\/?$/i, '')
  base = stripTrailingSlash(base)
  // If template left a dangling path segment like /cod, keep origin only when
  // it still looks like workers.dev root with optional path.
  try {
    const u = new URL(base.includes('://') ? base : `https://${base}`)
    // Prefer origin; if path is meaningful (not empty /), keep it
    if (!u.pathname || u.pathname === '/') return u.origin
    return stripTrailingSlash(`${u.origin}${u.pathname}`)
  } catch {
    return base || null
  }
}

function stripTrailingSlash(s: string): string {
  return s.replace(/\/+$/, '')
}

/** Build absolute or same-origin search URL for the given query. */
export function buildCodSearchUrl(
  query: CodSearchQuery,
  opts: {
    searchBase?: string | null
    /** Dev/preview fallback path (Vite proxy). */
    localPath?: string
  } = {},
): string {
  const text = query.text?.trim() ?? ''
  const smile = query.smile?.trim() ?? ''
  if (text && smile) {
    // Prefer text when both set (matches worker).
  }
  if (!text && !smile) {
    throw new Error('COD search needs text or smile')
  }

  const params = new URLSearchParams()
  if (text) params.set('text', text)
  else params.set('smile', smile)

  const base =
    opts.searchBase !== undefined
      ? opts.searchBase
      : resolveCodSearchBase()
  if (base) {
    return `${stripTrailingSlash(base)}/search?${params.toString()}`
  }
  const local = opts.localPath ?? '/cod-search'
  return `${local}?${params.toString()}`
}

export function parseCodSearchResponse(data: unknown): CodSearchResult {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid COD search response')
  }
  const o = data as Record<string, unknown>
  if (typeof o.error === 'string' && o.error) {
    throw new Error(o.error)
  }
  // Worker-shaped response
  if (Array.isArray(o.hits)) {
    const kind =
      o.query &&
      typeof o.query === 'object' &&
      (o.query as { kind?: string }).kind === 'smile'
        ? 'smile'
        : 'text'
    const value =
      o.query && typeof o.query === 'object'
        ? String((o.query as { value?: string }).value ?? '')
        : ''
    return {
      query: { kind, value },
      total: typeof o.total === 'number' ? o.total : o.hits.length,
      capped: Boolean(o.capped),
      limit: typeof o.limit === 'number' ? o.limit : DEFAULT_LIMIT,
      hits: o.hits.map(normalizeClientHit).filter(Boolean) as CodSearchHit[],
    }
  }
  // Raw COD array (dev proxy may pass JSON through)
  if (Array.isArray(data)) {
    const hits = (data as unknown[])
      .slice(0, DEFAULT_LIMIT)
      .map(normalizeClientHit)
      .filter(Boolean) as CodSearchHit[]
    return {
      query: { kind: 'text', value: '' },
      total: (data as unknown[]).length,
      capped: (data as unknown[]).length > DEFAULT_LIMIT,
      limit: DEFAULT_LIMIT,
      hits,
    }
  }
  throw new Error('Unexpected COD search response')
}

function normalizeClientHit(row: unknown): CodSearchHit | null {
  if (!row || typeof row !== 'object') return null
  const r = row as Record<string, unknown>
  const id = String(r.id ?? r.file ?? '').replace(/\D/g, '')
  if (!/^\d{5,10}$/.test(id)) return null
  const clean = (v: unknown) => {
    if (v == null) return null
    const s = String(v).replace(/^-\s*/, '').replace(/\s*-\s*$/, '').trim()
    return s || null
  }
  return {
    id,
    sg: clean(r.sg),
    sgNumber: r.sgNumber != null ? String(r.sgNumber) : null,
    formula: clean(r.formula ?? r.calcformula),
    vol: r.vol != null && r.vol !== '' ? String(r.vol) : null,
    name: clean(r.name) || clean(r.commonname) || clean(r.chemname) || clean(r.mineral),
  }
}

export async function searchCod(
  query: CodSearchQuery,
  fetchImpl: typeof fetch = fetch,
): Promise<CodSearchResult> {
  const text = query.text?.trim() ?? ''
  const smile = query.smile?.trim() ?? ''
  if (!text && !smile) throw new Error('Enter a name/keyword or SMILES to search COD')
  if ((text || smile).length > 200) throw new Error('Query too long (max 200 characters)')

  const url = buildCodSearchUrl({ text: text || undefined, smile: smile || undefined })
  let res: Response
  try {
    res = await fetchImpl(url, {
      redirect: 'follow',
      headers: { accept: 'application/json' },
    })
  } catch (e) {
    throw new Error(
      `COD search network error: ${e instanceof Error ? e.message : String(e)}`,
    )
  }
  if (!res.ok) {
    let detail = ''
    try {
      const j = (await res.json()) as { error?: string }
      if (j?.error) detail = `: ${j.error}`
    } catch {
      /* ignore */
    }
    throw new Error(`COD search failed (HTTP ${res.status})${detail}`)
  }
  const data: unknown = await res.json()
  return parseCodSearchResponse(data)
}

/** Whether a production search endpoint is configured (proxy or explicit). */
export function hasConfiguredCodSearch(
  env: {
    VITE_COD_PROXY?: string
    VITE_COD_SEARCH?: string
  } = import.meta.env as {
    VITE_COD_PROXY?: string
    VITE_COD_SEARCH?: string
  },
): boolean {
  return Boolean(resolveCodSearchBase(env))
}
