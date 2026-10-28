/**
 * Privacy-light visit counter client.
 *
 * Policy: one increment per browser tab session (sessionStorage gate).
 * The Cloudflare worker GET /visits increments; ?peek=1 returns without bumping.
 * No cookies, no fingerprinting, no Google Analytics.
 */

const SESSION_KEY = 'csg-visits-session'
const COUNT_KEY = 'csg-visits-count'

export type VisitsEnv = {
  VITE_VISITS_URL?: string
  VITE_COD_PROXY?: string
}

export type VisitStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function stripTrailingSlash(s: string): string {
  return s.replace(/\/+$/, '')
}

function defaultStorage(): VisitStorage | null {
  try {
    if (typeof sessionStorage === 'undefined') return null
    return sessionStorage
  } catch {
    return null
  }
}

/**
 * Resolve the visits endpoint.
 * Prefer VITE_VISITS_URL; else derive from VITE_COD_PROXY origin + /visits.
 */
export function resolveVisitsUrl(
  env: VisitsEnv = import.meta.env as VisitsEnv,
): string | null {
  const explicit = env.VITE_VISITS_URL?.trim()
  if (explicit) return stripTrailingSlash(explicit)

  const proxy = env.VITE_COD_PROXY?.trim()
  if (!proxy) return null

  let base = proxy.replace(/\{id\}/g, '0').replace(/\/+\d+\.cif\/?$/i, '')
  base = stripTrailingSlash(base)
  try {
    const u = new URL(base.includes('://') ? base : `https://${base}`)
    return `${u.origin}/visits`
  } catch {
    return null
  }
}

/** Format a count for the footer chip (en-US grouping) or em dash when unknown. */
export function formatVisitCount(count: number | null | undefined): string {
  if (count == null || !Number.isFinite(count) || count < 0) return '—'
  return Math.floor(count).toLocaleString('en-US')
}

export function visitCounterLabel(count: number | null | undefined): string {
  return `Visits: ${formatVisitCount(count)}`
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

function readSessionCount(storage: VisitStorage | null): number | null {
  if (!storage) return null
  try {
    const raw = storage.getItem(COUNT_KEY)
    if (raw == null) return null
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 ? n : null
  } catch {
    return null
  }
}

function writeSession(
  storage: VisitStorage | null,
  count: number,
  recorded: boolean,
) {
  if (!storage) return
  try {
    storage.setItem(COUNT_KEY, String(count))
    if (recorded) storage.setItem(SESSION_KEY, '1')
  } catch {
    /* private mode / blocked storage — still show the fetched count */
  }
}

function sessionAlreadyRecorded(storage: VisitStorage | null): boolean {
  if (!storage) return false
  try {
    return storage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

async function parseCount(res: Response): Promise<number | null> {
  if (!res.ok) return null
  const data = (await res.json()) as { count?: unknown }
  const n = Number(data?.count)
  return Number.isFinite(n) && n >= 0 ? n : null
}

/**
 * Fetch the public visit count, incrementing at most once per tab session.
 * Returns null when the endpoint is unset or unreachable (UI shows "—").
 */
export async function fetchVisitCount(opts?: {
  env?: VisitsEnv
  fetchImpl?: FetchLike
  storage?: VisitStorage | null
  /** Force peek (no increment), e.g. for tests. */
  peekOnly?: boolean
}): Promise<number | null> {
  const url = resolveVisitsUrl(opts?.env)
  if (!url) return null

  const fetchImpl = opts?.fetchImpl ?? fetch
  const storage =
    opts && 'storage' in (opts as object)
      ? (opts.storage ?? null)
      : defaultStorage()
  const already = sessionAlreadyRecorded(storage)
  const cached = readSessionCount(storage)
  const peek = opts?.peekOnly === true || already

  // Same session + we already have a count: avoid a network round-trip.
  if (already && cached != null && opts?.peekOnly !== true) {
    return cached
  }

  const endpoint = peek ? `${url}?peek=1` : url
  try {
    const res = await fetchImpl(endpoint, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
      headers: { accept: 'application/json' },
    })
    const count = await parseCount(res)
    if (count == null) return cached
    writeSession(storage, count, !peek)
    return count
  } catch {
    return cached
  }
}
