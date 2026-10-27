/**
 * Crossref REST API client for /pubs “Recent titles”.
 * Metadata only (title, journal, year, DOI, publisher, authors) — no PDFs.
 * Prefer the Cloudflare worker `/crossref` so the polite User-Agent is set;
 * fall back to Vite `/crossref` or direct api.crossref.org when needed.
 */

import { resolveCodSearchBase } from '../cif/codSearch'
import type { PubTag } from './types'

export const CROSSREF_USER_AGENT =
  'CrystalSpaceGroups/1.0 (mailto:chuanjiewu@gmail.com)'

export const CROSSREF_ROWS = 20

/** Known crystallography / crystal-engineering ISSNs (print + electronic). */
export const CROSSREF_ISSNS = {
  crystalGrowthDesign: ['1528-7483', '1528-7505'],
  inorganicChemistry: ['0020-1669', '1520-5105'],
  crystEngComm: ['1466-8033', '1466-8041'],
  actaA: ['2053-2733'],
  actaB: ['2052-5206'],
  actaC: ['2053-2296'],
  actaE: ['2056-9890'],
  iucrJ: ['2052-2525'],
  jac: ['1600-5767'],
  crystalResearchTech: ['0232-1300', '1521-4079'],
} as const

export type CrossrefPublisherPreset =
  | 'acs'
  | 'iucr'
  | 'rsc'
  | 'wiley'
  | 'all'

export interface CrossrefPresetInfo {
  id: CrossrefPublisherPreset
  label: string
  blurb: string
  issns: readonly string[]
  /** Optional free-text query when ISSN list alone is too broad / empty. */
  query?: string
}

export const CROSSREF_PRESETS: readonly CrossrefPresetInfo[] = [
  {
    id: 'acs',
    label: 'ACS',
    blurb: 'Crystal Growth & Design + Inorganic Chemistry',
    issns: [
      ...CROSSREF_ISSNS.crystalGrowthDesign,
      ...CROSSREF_ISSNS.inorganicChemistry,
    ],
  },
  {
    id: 'iucr',
    label: 'IUCr',
    blurb: 'Acta Crystallographica A/B/C/E, IUCrJ, J. Appl. Cryst.',
    issns: [
      ...CROSSREF_ISSNS.actaA,
      ...CROSSREF_ISSNS.actaB,
      ...CROSSREF_ISSNS.actaC,
      ...CROSSREF_ISSNS.actaE,
      ...CROSSREF_ISSNS.iucrJ,
      ...CROSSREF_ISSNS.jac,
    ],
  },
  {
    id: 'rsc',
    label: 'RSC',
    blurb: 'CrystEngComm',
    issns: [...CROSSREF_ISSNS.crystEngComm],
  },
  {
    id: 'wiley',
    label: 'Wiley',
    blurb: 'Crystal Research and Technology',
    issns: [...CROSSREF_ISSNS.crystalResearchTech],
  },
  {
    id: 'all',
    label: 'All crystallography-ish',
    blurb: 'Union of ACS / IUCr / RSC / Wiley ISSNs above',
    issns: uniqueIssns([
      ...CROSSREF_ISSNS.crystalGrowthDesign,
      ...CROSSREF_ISSNS.inorganicChemistry,
      ...CROSSREF_ISSNS.crystEngComm,
      ...CROSSREF_ISSNS.actaA,
      ...CROSSREF_ISSNS.actaB,
      ...CROSSREF_ISSNS.actaC,
      ...CROSSREF_ISSNS.actaE,
      ...CROSSREF_ISSNS.iucrJ,
      ...CROSSREF_ISSNS.jac,
      ...CROSSREF_ISSNS.crystalResearchTech,
    ]),
  },
]

function uniqueIssns(list: readonly string[]): string[] {
  return [...new Set(list)]
}

export function presetById(
  id: CrossrefPublisherPreset,
): CrossrefPresetInfo {
  const p = CROSSREF_PRESETS.find((x) => x.id === id)
  if (!p) throw new Error(`Unknown Crossref preset: ${id}`)
  return p
}

export interface CrossrefWork {
  doi: string
  title: string
  journal: string | null
  publisher: string | null
  year: number | null
  authorsShort: string
  /** Keyword hints from the title — not COD-curated truth. */
  hintTags: PubTag[]
}

export interface CrossrefPage {
  works: CrossrefWork[]
  total: number
  /** Offset for the next page, or null when exhausted.
   * Offset pagination (not cursor) so we can sort by published date. */
  nextOffset: number | null
}

export interface CrossrefQuery {
  preset: CrossrefPublisherPreset
  /** Exact calendar year, or null = from recentYears window. */
  year: number | null
  /** How many years back when year is null (default 3). */
  recentYears?: number
  /** Free-text query AND’d with filters (optional). */
  query?: string
  /** Result offset for pagination (default 0). Incompatible with Crossref cursors when sorting. */
  offset?: number
  rows?: number
  /** “Now” for tests (defaults to Date). */
  now?: Date
}

/** Build Crossref filter string: issn:…,from-pub-date:…[,until-pub-date:…]. */
export function buildCrossrefFilter(
  opts: {
    issns: readonly string[]
    year: number | null
    recentYears?: number
    now?: Date
  },
): string {
  const parts: string[] = []
  for (const issn of opts.issns) {
    const clean = issn.trim()
    if (/^\d{4}-\d{3}[\dXx]$/.test(clean)) {
      parts.push(`issn:${clean}`)
    }
  }
  const now = opts.now ?? new Date()
  if (opts.year != null) {
    parts.push(`from-pub-date:${opts.year}-01-01`)
    parts.push(`until-pub-date:${opts.year}-12-31`)
  } else {
    const years = opts.recentYears ?? 3
    const start = now.getFullYear() - (years - 1)
    parts.push(`from-pub-date:${start}-01-01`)
  }
  // Prefer real articles over issue mastheads / front matter.
  parts.push('type:journal-article')
  return parts.join(',')
}

/** Absolute URL for Crossref works (worker / vite / direct). */
export function buildCrossrefUrl(
  query: CrossrefQuery,
  opts: {
    searchBase?: string | null
    localPath?: string
    directBase?: string
  } = {},
): string {
  const preset = presetById(query.preset)
  const filter = buildCrossrefFilter({
    issns: preset.issns,
    year: query.year,
    recentYears: query.recentYears,
    now: query.now,
  })
  const params = new URLSearchParams()
  params.set('filter', filter)
  params.set('rows', String(query.rows ?? CROSSREF_ROWS))
  params.set(
    'select',
    'DOI,title,author,published,published-print,published-online,container-title,publisher,type',
  )
  const offset = Math.max(0, query.offset ?? 0)
  params.set('offset', String(offset))

  const qParts: string[] = []
  if (preset.query?.trim()) qParts.push(preset.query.trim())
  if (query.query?.trim()) qParts.push(query.query.trim())
  if (qParts.length) {
    params.set('query', qParts.join(' '))
    // Free-text + sort=published ignores the query (CSP looked empty). Use
    // relevance ranking whenever a topic/search query is present.
  } else {
    // Newest-first browse when there is no text query.
    // (Offset pagination; Crossref rejects this sort with deep cursors.)
    params.set('sort', 'published')
    params.set('order', 'desc')
  }

  const base =
    opts.searchBase !== undefined
      ? opts.searchBase
      : resolveCodSearchBase()
  if (base) {
    return `${stripSlash(base)}/crossref?${params.toString()}`
  }
  const local = opts.localPath ?? '/crossref'
  if (typeof window !== 'undefined' || opts.localPath) {
    // Prefer same-origin Vite middleware when no worker base.
    return `${local}?${params.toString()}`
  }
  const direct = opts.directBase ?? 'https://api.crossref.org/works'
  return `${direct}?${params.toString()}`
}

function stripSlash(s: string): string {
  return s.replace(/\/+$/, '')
}

/** Parse Crossref date-parts [[Y,M,D]] → year. */
export function yearFromDateParts(parts: unknown): number | null {
  if (!Array.isArray(parts) || parts.length === 0) return null
  const first = parts[0]
  if (!Array.isArray(first) || first.length === 0) return null
  const y = Number(first[0])
  return Number.isFinite(y) && y > 1000 && y < 3000 ? y : null
}

export function pickPublishedYear(item: Record<string, unknown>): number | null {
  for (const key of ['published-print', 'published-online', 'published'] as const) {
    const block = item[key] as { 'date-parts'?: unknown } | undefined
    const y = yearFromDateParts(block?.['date-parts'])
    if (y != null) return y
  }
  return null
}

export function formatAuthorsShort(
  authors: unknown,
  max = 3,
): string {
  if (!Array.isArray(authors) || authors.length === 0) return ''
  const names: string[] = []
  for (const a of authors) {
    if (!a || typeof a !== 'object') continue
    const o = a as { family?: string; given?: string; name?: string }
    if (o.family) {
      names.push(o.given ? `${o.family}, ${o.given.charAt(0)}.` : o.family)
    } else if (o.name) {
      names.push(o.name)
    }
    if (names.length >= max) break
  }
  const extra = authors.length - names.length
  if (!names.length) return ''
  return extra > 0 ? `${names.join('; ')}; et al.` : names.join('; ')
}

/** Title-keyword hints only — labeled as such in the UI. */
export function hintTagsFromTitle(title: string | null | undefined): PubTag[] {
  const t = (title ?? '').toLowerCase()
  if (!t) return []
  const tags: PubTag[] = []
  if (/\b(mof|metal[- ]organic framework|zeolite|framework)\b/.test(t)) {
    tags.push('mof')
  }
  if (
    /\b(hydrate|hydrated|monohydrate|dihydrate|trihydrate|hemihydrate|water of crystallization)\b/.test(
      t,
    )
  ) {
    tags.push('hydrate')
  }
  if (/\b(salt|cocrystal|co-crystal|chloride|sulfate|phosphate)\b/.test(t)) {
    tags.push('salt')
  }
  if (
    /\b(drug|prodrug|pharma|medicinal|ibuprofen|aspirin|paliperidone|api\b|active pharmaceutical)\b/.test(
      t,
    )
  ) {
    tags.push('drug')
  }
  if (/\b(mineral|ore|silicate|carbonate mineral)\b/.test(t)) {
    tags.push('mineral')
  }
  if (
    /\b(organic|molecular crystal|cocrystal|co-crystal|pharmaceutical)\b/.test(t)
  ) {
    tags.push('organic')
  }
  if (
    /\b(inorganic|oxide|perovskite|metal halide|coordination polymer)\b/.test(t)
  ) {
    tags.push('inorganic')
  }
  if (
    /machine learning|deep learning|neural network|graph neural|\bgnn\b|artificial intelligence/.test(
      t,
    )
  ) {
    tags.push('ml')
  }
  if (/crystal structure prediction|\bcsp\b/.test(t)) {
    tags.push('csp')
  }
  const seen = new Set<PubTag>()
  return tags.filter((x) => (seen.has(x) ? false : (seen.add(x), true)))
}

/**
 * Tags that refine the Crossref query (not client-only title chips).
 * Needed because the first newest-first page rarely mentions sparse keywords
 * (hydrate, CSP, ML, …); client-side title filtering alone looks empty.
 */
export const TOPIC_HINT_TAGS: readonly PubTag[] = [
  'hydrate',
  'mof',
  'drug',
  'salt',
  'mineral',
  'ml',
  'csp',
] as const

const HINT_CROSSREF_QUERY: Partial<Record<PubTag, string>> = {
  hydrate: 'hydrate',
  mof: 'MOF',
  drug: 'pharmaceutical',
  salt: 'salt',
  mineral: 'mineral',
  ml: 'machine learning',
  csp: 'crystal structure prediction',
}

export function isTopicHintTag(tag: PubTag): boolean {
  return TOPIC_HINT_TAGS.includes(tag)
}

export function crossrefQueryForHintTags(
  tags: readonly PubTag[],
): string | undefined {
  const parts: string[] = []
  for (const tag of tags) {
    const q = HINT_CROSSREF_QUERY[tag]
    if (q && !parts.includes(q)) parts.push(q)
  }
  if (!parts.length) return undefined
  return parts.join(' ')
}

export function parseCrossrefWork(item: unknown): CrossrefWork | null {
  if (!item || typeof item !== 'object') return null
  const o = item as Record<string, unknown>
  const doi = String(o.DOI ?? o.doi ?? '')
    .trim()
    .replace(/^https?:\/\/doi\.org\//i, '')
  if (!doi) return null
  const titles = o.title
  const title = Array.isArray(titles)
    ? String(titles[0] ?? '').trim()
    : String(titles ?? '').trim()
  if (!title) return null
  // Crossref often tags issue front-matter as journal-article.
  if (/^(issue\s+(publication\s+information|editorial\s+masthead)|masthead|table of contents)\b/i.test(title)) {
    return null
  }
  const containers = o['container-title']
  const journal = Array.isArray(containers)
    ? String(containers[0] ?? '').trim() || null
    : typeof containers === 'string'
      ? containers.trim() || null
      : null
  const publisher =
    typeof o.publisher === 'string' ? o.publisher.trim() || null : null
  const year = pickPublishedYear(o)
  const authorsShort = formatAuthorsShort(o.author)
  const hintTags = hintTagsFromTitle(title)
  return { doi, title, journal, publisher, year, authorsShort, hintTags }
}

export function parseCrossrefResponse(json: unknown): CrossrefPage {
  if (!json || typeof json !== 'object') {
    throw new Error('Crossref response was not an object')
  }
  const root = json as Record<string, unknown>
  const message = (root.message ?? root) as Record<string, unknown>
  const items = message.items
  if (!Array.isArray(items)) {
    throw new Error('Crossref response missing items[]')
  }
  const works: CrossrefWork[] = []
  for (const it of items) {
    const w = parseCrossrefWork(it)
    if (w) works.push(w)
  }
  const total = Number(message['total-results'] ?? works.length)
  const safeTotal = Number.isFinite(total) ? total : works.length
  return {
    works,
    total: safeTotal,
    nextOffset: null, // filled by fetchCrossrefPage with request offset/rows
  }
}

export async function fetchCrossrefPage(
  query: CrossrefQuery,
  opts: {
    searchBase?: string | null
    fetchImpl?: typeof fetch
    signal?: AbortSignal
  } = {},
): Promise<CrossrefPage> {
  const url = buildCrossrefUrl(query, { searchBase: opts.searchBase })
  const fetchImpl = opts.fetchImpl ?? fetch
  const headers: Record<string, string> = {
    accept: 'application/json',
  }
  // Browsers ignore custom User-Agent; worker sets the polite UA.
  // Node/tests can still send it on direct calls.
  if (typeof window === 'undefined') {
    headers['User-Agent'] = CROSSREF_USER_AGENT
  }
  const res = await fetchImpl(url, { headers, signal: opts.signal })
  if (!res.ok) {
    let detail = ''
    try {
      detail = (await res.text()).slice(0, 200)
    } catch {
      /* ignore */
    }
    throw new Error(
      `Crossref HTTP ${res.status}${detail ? `: ${detail}` : ''}`,
    )
  }
  const json = await res.json()
  const page = parseCrossrefResponse(json)
  const rows = query.rows ?? CROSSREF_ROWS
  const offset = Math.max(0, query.offset ?? 0)
  // Advance by upstream page size, not post-filter works.length — otherwise a
  // page of mastheads sets nextOffset=null and Load more disappears.
  const root = json && typeof json === 'object' ? (json as Record<string, unknown>) : null
  const message = root
    ? ((root.message ?? root) as Record<string, unknown>)
    : null
  const rawLen = Array.isArray(message?.items) ? message!.items.length : page.works.length
  const nextOffset =
    offset + rawLen < page.total && rawLen > 0 ? offset + rows : null
  return { ...page, nextOffset }
}

/** Year chips for the Recent panel (newest first, including “window”). */
export function recentYearOptions(
  now = new Date(),
  span = 3,
): { label: string; year: number | null }[] {
  const y = now.getFullYear()
  const years: { label: string; year: number | null }[] = [
    { label: `Last ${span} years`, year: null },
  ]
  for (let i = 0; i < span; i++) {
    const yy = y - i
    years.push({ label: String(yy), year: yy })
  }
  return years
}
