import type { CodPubEntry, PubFilterState, PubTag } from './types'

export function matchesPubFilters(
  entry: CodPubEntry,
  filters: PubFilterState,
): boolean {
  if (filters.year != null && entry.year !== filters.year) return false
  if (filters.tags.length > 0) {
    const have = new Set(entry.tags)
    if (!filters.tags.every((t) => have.has(t))) return false
  }
  const q = filters.query.trim().toLowerCase()
  if (!q) return true
  const hay = [
    entry.id,
    entry.name,
    entry.title ?? '',
    entry.journal ?? '',
    entry.formula ?? '',
    entry.sg ?? '',
    entry.doi ?? '',
    ...entry.tags,
  ]
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}

export function filterPubs(
  entries: readonly CodPubEntry[],
  filters: PubFilterState,
): CodPubEntry[] {
  return entries.filter((e) => matchesPubFilters(e, filters))
}

/** Years present in the list, newest first. Null-year entries omitted. */
export function collectYears(entries: readonly CodPubEntry[]): number[] {
  const set = new Set<number>()
  for (const e of entries) {
    if (e.year != null) set.add(e.year)
  }
  return [...set].sort((a, b) => b - a)
}

export interface YearGroup {
  year: number | null
  entries: CodPubEntry[]
}

/** Group filtered entries by year (desc). Null-year bucket last, labeled separately. */
export function groupPubsByYear(entries: readonly CodPubEntry[]): YearGroup[] {
  const map = new Map<number | null, CodPubEntry[]>()
  for (const e of entries) {
    const key = e.year
    const list = map.get(key)
    if (list) list.push(e)
    else map.set(key, [e])
  }
  const years = [...map.keys()].sort((a, b) => {
    if (a == null) return 1
    if (b == null) return -1
    return b - a
  })
  return years.map((year) => ({
    year,
    entries: (map.get(year) ?? []).slice().sort((a, b) => a.id.localeCompare(b.id)),
  }))
}

export function countByTag(
  entries: readonly CodPubEntry[],
  tags: readonly PubTag[],
): Record<PubTag, number> {
  const out = Object.fromEntries(tags.map((t) => [t, 0])) as Record<PubTag, number>
  for (const e of entries) {
    for (const t of e.tags) {
      if (t in out) out[t] += 1
    }
  }
  return out
}

export function doiUrl(doi: string | null | undefined): string | null {
  if (!doi) return null
  const d = doi.trim().replace(/^doi:\s*/i, '')
  if (!d) return null
  if (/^https?:\/\//i.test(d)) return d
  return `https://doi.org/${d}`
}

export function cifMapPath(codId: string, base = ''): string {
  const id = codId.replace(/\D/g, '')
  const prefix = base.replace(/\/$/, '')
  return `${prefix}/cif?cod=${id}`
}
