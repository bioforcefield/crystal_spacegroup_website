/**
 * Fetch CIF text for a COD / CSD code.
 *
 * COD: public domain — try same-origin teaching cache, optional proxy, then
 * crystallography.net. Browser CORS often blocks the direct COD host from
 * GitHub Pages; callers should offer paste/upload when CorsBlockedError is thrown.
 *
 * CSD: no free anonymous CIF API (CCDC Access Structures requires interactive
 * accept + download). We never scrape CSD; throw CsdManualError with a link.
 */

import {
  codCifUrl,
  csdAccessStructuresUrl,
  parseStructureCode,
  type StructureCode,
} from './structureCode'

export class CorsBlockedError extends Error {
  readonly codUrl: string
  readonly id: string
  constructor(id: string, codUrl: string, cause?: unknown) {
    super(
      `Browser blocked fetching COD ${id} (CORS). Open the CIF link, then paste or upload the file.`,
    )
    this.name = 'CorsBlockedError'
    this.codUrl = codUrl
    this.id = id
    if (cause !== undefined) {
      ;(this as Error & { cause?: unknown }).cause = cause
    }
  }
}

export class NotFoundError extends Error {
  constructor(label: string) {
    super(`${label} was not found (404). Check the code and try again.`)
    this.name = 'NotFoundError'
  }
}

export class CsdManualError extends Error {
  readonly refcode: string
  readonly accessUrl: string
  constructor(refcode: string) {
    super(
      `CSD ${refcode} cannot be streamed here — CCDC does not offer a free anonymous CIF API. Download via Access Structures (accept terms), then upload or paste the CIF.`,
    )
    this.name = 'CsdManualError'
    this.refcode = refcode
    this.accessUrl = csdAccessStructuresUrl(refcode)
  }
}

export interface FetchRemoteResult {
  text: string
  source: 'cache' | 'proxy' | 'cod' | 'paste'
  label: string
  code: StructureCode
}

function looksLikeCif(text: string): boolean {
  const head = text.slice(0, 4000)
  return (
    /data_/i.test(head) ||
    /_cell_length_a/i.test(head) ||
    /_atom_site_fract_/i.test(head)
  )
}

async function tryFetch(
  url: string,
  fetchImpl: typeof fetch,
): Promise<
  | { ok: true; text: string }
  | { ok: false; status?: number; cors?: boolean; error?: unknown }
> {
  try {
    const res = await fetchImpl(url, { redirect: 'follow' })
    if (res.status === 404) return { ok: false, status: 404 }
    if (!res.ok) return { ok: false, status: res.status }
    const text = await res.text()
    if (!looksLikeCif(text)) {
      return { ok: false, status: res.status, error: 'not-cif' }
    }
    return { ok: true, text }
  } catch (e) {
    return { ok: false, cors: true, error: e }
  }
}

/** Same-origin teaching cache shipped in public/samples/cod/{id}.cif */
export function codCacheUrl(id: string, baseUrl = import.meta.env.BASE_URL): string {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${base}samples/cod/${id}.cif`
}

function envProxyUrl(id: string): string | null {
  const raw = (import.meta.env.VITE_COD_PROXY as string | undefined)?.trim()
  if (!raw) return null
  if (raw.includes('{id}')) return raw.replaceAll('{id}', id)
  const prefix = raw.endsWith('/') ? raw : `${raw}/`
  return `${prefix}${id}.cif`
}

/** Dev-server same-origin proxy path (vite.config.ts). */
export function codDevProxyUrl(id: string): string {
  return `/cod-proxy/${id}.cif`
}

export async function fetchCodCif(
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FetchRemoteResult> {
  const code: StructureCode = { kind: 'cod', id, display: `COD ${id}` }
  const direct = codCifUrl(id)

  // 1) Same-origin teaching cache (works on GH Pages for curated ids)
  {
    const cached = await tryFetch(codCacheUrl(id), fetchImpl)
    if (cached.ok) {
      return {
        text: cached.text,
        source: 'cache',
        label: `COD ${id} (cached sample)`,
        code,
      }
    }
  }

  // 2) Optional configured proxy (Cloudflare Worker etc.)
  const proxy = envProxyUrl(id)
  if (proxy) {
    const r = await tryFetch(proxy, fetchImpl)
    if (r.ok) {
      return { text: r.text, source: 'proxy', label: `COD ${id}`, code }
    }
    if (r.status === 404) throw new NotFoundError(`COD ${id}`)
  }

  // 3) Vite / local same-origin proxy
  {
    const r = await tryFetch(codDevProxyUrl(id), fetchImpl)
    if (r.ok) {
      return { text: r.text, source: 'proxy', label: `COD ${id}`, code }
    }
  }

  // 4) Direct COD
  {
    const r = await tryFetch(direct, fetchImpl)
    if (r.ok) {
      return { text: r.text, source: 'cod', label: `COD ${id}`, code }
    }
    if (r.status === 404) throw new NotFoundError(`COD ${id}`)
    if (r.cors || r.status === undefined) {
      throw new CorsBlockedError(id, direct, r.error)
    }
    throw new Error(`Could not fetch COD ${id} (HTTP ${r.status ?? '?'})`)
  }
}

export async function fetchRemoteCif(
  input: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FetchRemoteResult> {
  const parsed = parseStructureCode(input)
  if (!parsed.ok) throw new Error(parsed.error)
  if (parsed.code.kind === 'csd') {
    throw new CsdManualError(parsed.code.refcode)
  }
  return fetchCodCif(parsed.code.id, fetchImpl)
}
