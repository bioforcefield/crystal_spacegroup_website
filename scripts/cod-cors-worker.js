/**
 * Cloudflare Worker: CORS proxy for COD CIF downloads + search.
 *
 * One-click deploy (Cloudflare account required):
 *   npx wrangler deploy -c scripts/wrangler.cod-proxy.toml
 * Or via GitHub Actions when CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID secrets exist.
 *
 * Then rebuild Pages with:
 *   VITE_COD_PROXY="https://crystal-cod-proxy.<subdomain>.workers.dev/{id}.cif" npm run build:pages
 *
 * Without a worker, GitHub Pages still serves curated ids from public/samples/cod/.
 *
 * Accepted request shapes:
 *   /1100303.cif
 *   /cod/1100303.cif
 *   /?id=1100303
 *   /search?text=urea
 *   /search?smile=c1ccccc1   (forwarded to COD as smarts= — SMILES/substructure)
 *   /search?year=2020        (optional; combine with text/smile)
 *   /crossref?filter=…&rows=20&cursor=*   (Crossref metadata proxy)
 */
const CROSSREF_UPSTREAM = 'https://api.crossref.org/works'
const CROSSREF_UA =
  'CrystalSpaceGroups/1.0 (mailto:chuanjiewu@gmail.com)'
const CROSSREF_TIMEOUT_MS = 20_000
const CROSSREF_MAX_BYTES = 2_000_000
const COD_UPSTREAM = 'https://www.crystallography.net/cod'
const SEARCH_TIMEOUT_MS = 20_000
const SEARCH_MAX_BYTES = 4_000_000
const SEARCH_CAP = 20

export default {
  async fetch(request) {
    try {
      return await handle(request)
    } catch (err) {
      const msg = err && err.message ? String(err.message) : String(err)
      return new Response(`crystal-cod-proxy error: ${msg}\n`, {
        status: 502,
        headers: corsHeaders({ 'content-type': 'text/plain' }),
      })
    }
  },
}

async function handle(request) {
  const url = new URL(request.url)
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders({ 'content-type': 'text/plain' }),
    })
  }

  const path = url.pathname.replace(/\/+$/, '') || '/'
  if (path === '/search' || path.endsWith('/search')) {
    return handleSearch(url, request.method)
  }
  if (path === '/crossref' || path.endsWith('/crossref')) {
    return handleCrossref(url, request.method)
  }

  const id =
    url.searchParams.get('id') ||
    (url.pathname.match(/(\d{5,10})(?:\.cif)?\/?$/) || [])[1]
  if (!id) {
    return new Response(
      'crystal-cod-proxy: GET /{codId}.cif  or  GET /search?text=…|smile=…|year=YYYY  or  GET /crossref?…\n',
      {
        status: 400,
        headers: corsHeaders({ 'content-type': 'text/plain' }),
      },
    )
  }
  const upstream = await fetch(`${COD_UPSTREAM}/${id}.cif`, {
    redirect: 'follow',
    headers: { accept: 'chemical/x-cif, text/plain, */*' },
  })
  if (request.method === 'HEAD') {
    return new Response(null, {
      status: upstream.status,
      headers: corsHeaders({
        'content-type':
          upstream.headers.get('content-type') || 'chemical/x-cif',
        'cache-control': 'public, max-age=86400',
        'x-cod-id': id,
      }),
    })
  }
  const body = await upstream.arrayBuffer()
  return new Response(body, {
    status: upstream.status,
    headers: corsHeaders({
      'content-type':
        upstream.headers.get('content-type') || 'chemical/x-cif',
      'cache-control': 'public, max-age=86400',
      'x-cod-id': id,
      'x-cod-upstream-status': String(upstream.status),
    }),
  })
}

async function handleSearch(url, method) {
  const text = (url.searchParams.get('text') || '').trim()
  const smile = (
    url.searchParams.get('smile') ||
    url.searchParams.get('smiles') ||
    ''
  ).trim()
  const yearRaw = (url.searchParams.get('year') || '').trim()
  let year = null
  if (yearRaw) {
    if (!/^\d{4}$/.test(yearRaw)) {
      return jsonResponse({ error: 'year must be a 4-digit YYYY' }, 400)
    }
    year = yearRaw
  }

  // Prefer text if both provided (mutually exclusive preference).
  let kind = null
  let value = ''
  if (text) {
    kind = 'text'
    value = text
  } else if (smile) {
    kind = 'smile'
    value = smile
  } else if (year) {
    kind = 'year'
    value = year
  }

  if (!kind) {
    return jsonResponse(
      {
        error:
          'Provide ?text=… (name/keyword), ?smile=… (SMILES/substructure), and/or ?year=YYYY',
      },
      400,
    )
  }
  if (value.length > 200) {
    return jsonResponse({ error: 'Query too long (max 200 characters)' }, 400)
  }

  // 1) ID list first (small) — avoids multi-MB JSON for broad SMILES like c1ccccc1
  const listUrl = new URL(`${COD_UPSTREAM}/result.php`)
  if (kind === 'text') listUrl.searchParams.set('text', value)
  else if (kind === 'smile') listUrl.searchParams.set('smarts', value) // COD SMILES/substructure API param
  // year-only or year+text/smile: COD accepts year=
  if (year) listUrl.searchParams.set('year', year)
  listUrl.searchParams.set('format', 'lst')

  const listRes = await fetchWithTimeout(listUrl.toString(), SEARCH_TIMEOUT_MS)
  if (!listRes.ok) {
    return jsonResponse(
      { error: `COD search HTTP ${listRes.status}` },
      502,
    )
  }
  const listText = await readTextCapped(listRes, SEARCH_MAX_BYTES)
  if (listText.error) {
    return jsonResponse({ error: listText.error }, 502)
  }
  const allIds = String(listText.text)
    .split(/[\s,]+/)
    .map((s) => s.replace(/\D/g, ''))
    .filter((id) => /^\d{5,10}$/.test(id))
  // de-dupe preserving order
  const seen = new Set()
  const unique = []
  for (const id of allIds) {
    if (seen.has(id)) continue
    seen.add(id)
    unique.push(id)
  }
  const total = unique.length
  const pageIds = unique.slice(0, SEARCH_CAP)

  if (method === 'HEAD') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders({
        'content-type': 'application/json',
        'cache-control': 'public, max-age=300',
        'x-cod-search': kind,
        'x-cod-total': String(total),
      }),
    })
  }

  if (pageIds.length === 0) {
    return jsonResponse(
      {
        query: { kind, value },
        total: 0,
        capped: false,
        limit: SEARCH_CAP,
        hits: [],
      },
      200,
      { 'cache-control': 'public, max-age=300', 'x-cod-search': kind },
    )
  }

  // 2) Hydrate metadata for the page of ids
  const metaUrl = new URL(`${COD_UPSTREAM}/result.php`)
  metaUrl.searchParams.set('id', pageIds.join(','))
  metaUrl.searchParams.set('format', 'json')
  const metaRes = await fetchWithTimeout(metaUrl.toString(), SEARCH_TIMEOUT_MS)
  if (!metaRes.ok) {
    // Still return id-only hits if metadata fails
    const hits = pageIds.map((id) => ({
      id,
      sg: null,
      sgNumber: null,
      formula: null,
      vol: null,
      name: null,
    }))
    return jsonResponse(
      {
        query: { kind, value },
        total,
        capped: total > SEARCH_CAP,
        limit: SEARCH_CAP,
        hits,
        warning: `Metadata HTTP ${metaRes.status}`,
      },
      200,
      { 'cache-control': 'public, max-age=300', 'x-cod-search': kind },
    )
  }
  const metaText = await readTextCapped(metaRes, SEARCH_MAX_BYTES)
  if (metaText.error) {
    return jsonResponse({ error: metaText.error }, 502)
  }
  let parsed
  try {
    parsed = JSON.parse(metaText.text)
  } catch {
    return jsonResponse(
      { error: 'COD metadata returned non-JSON' },
      502,
    )
  }
  if (!Array.isArray(parsed)) {
    return jsonResponse(
      { error: 'Unexpected COD metadata shape' },
      502,
    )
  }
  const byId = new Map()
  for (const row of parsed) {
    const hit = normalizeHit(row)
    if (hit) byId.set(hit.id, hit)
  }
  const hits = pageIds.map(
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

  return jsonResponse(
    {
      query: { kind, value },
      total,
      capped: total > SEARCH_CAP,
      limit: SEARCH_CAP,
      hits,
    },
    200,
    { 'cache-control': 'public, max-age=300', 'x-cod-search': kind },
  )
}

async function handleCrossref(url, method) {
  // Forward a curated subset of Crossref works query params.
  const allowed = ['filter', 'query', 'rows', 'cursor', 'sort', 'order', 'select', 'offset']
  const upstream = new URL(CROSSREF_UPSTREAM)
  for (const key of allowed) {
    const v = url.searchParams.get(key)
    if (v != null && v !== '') upstream.searchParams.set(key, v)
  }
  if (![...upstream.searchParams.keys()].length) {
    return jsonResponse(
      {
        error:
          'Provide Crossref works params, e.g. ?filter=issn:1528-7483,from-pub-date:2024-01-01&rows=20&offset=0',
      },
      400,
    )
  }

  // Crossref rejects cursor paging with date sorts (published, issued, …).
  const cursor = upstream.searchParams.get('cursor')
  const sort = (upstream.searchParams.get('sort') || '').toLowerCase()
  const dateSorts = new Set([
    'published',
    'published-print',
    'published-online',
    'issued',
    'created',
    'deposited',
    'indexed',
  ])
  if (cursor != null && cursor !== '' && dateSorts.has(sort)) {
    return jsonResponse(
      {
        status: 'failed',
        'message-type': 'validation-failure',
        error:
          `sort=${sort} is incompatible with cursor pagination. Use offset=0,20,… instead of cursor (or drop sort for relevance + cursor).`,
        message: [
          {
            type: 'sort-criteria-incompatible-with-cursor',
            value: 'sort',
            message: `Sorting by [${sort}] is not compatible with deep cursor paging; use offset pagination.`,
          },
        ],
      },
      400,
    )
  }

  // Cap rows
  const rowsRaw = upstream.searchParams.get('rows') || '20'
  const rows = Math.min(Math.max(parseInt(rowsRaw, 10) || 20, 1), 50)
  upstream.searchParams.set('rows', String(rows))
  // Do not force cursor=* — incompatible with sort=published (use offset).

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CROSSREF_TIMEOUT_MS)
  let res
  try {
    res = await fetch(upstream.toString(), {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'User-Agent': CROSSREF_UA,
      },
    })
  } catch (e) {
    const aborted = e && e.name === 'AbortError'
    return jsonResponse(
      {
        error: aborted
          ? 'Crossref timed out'
          : `Crossref failed: ${e && e.message ? e.message : String(e)}`,
      },
      502,
    )
  } finally {
    clearTimeout(timer)
  }

  if (method === 'HEAD') {
    return new Response(null, {
      status: res.status,
      headers: corsHeaders({
        'content-type': 'application/json',
        'cache-control': 'public, max-age=300',
        'x-crossref-status': String(res.status),
      }),
    })
  }

  const buf = await res.arrayBuffer()
  if (buf.byteLength > CROSSREF_MAX_BYTES) {
    return jsonResponse(
      { error: 'Crossref response too large; narrow the filter' },
      502,
    )
  }
  return new Response(buf, {
    status: res.status,
    headers: corsHeaders({
      'content-type':
        res.headers.get('content-type') || 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300',
      'x-crossref-status': String(res.status),
    }),
  })
}

async function fetchWithTimeout(url, ms) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { accept: 'application/json, text/plain, */*' },
    })
  } catch (e) {
    const aborted = e && e.name === 'AbortError'
    throw new Error(
      aborted
        ? 'COD search timed out'
        : `COD search failed: ${e && e.message ? e.message : String(e)}`,
    )
  } finally {
    clearTimeout(timer)
  }
}

async function readTextCapped(res, maxBytes) {
  const buf = await res.arrayBuffer()
  if (buf.byteLength > maxBytes) {
    return {
      error: 'COD search response too large; try a more specific query',
    }
  }
  return { text: new TextDecoder().decode(buf) }
}

function normalizeHit(row) {
  if (!row || typeof row !== 'object') return null
  const id = String(row.file ?? row.id ?? '').replace(/\D/g, '')
  if (!/^\d{5,10}$/.test(id)) return null
  const formula = cleanStr(row.formula ?? row.calcformula)
  const sg = cleanStr(row.sg)
  const sgNumber = row.sgNumber != null ? String(row.sgNumber) : null
  const vol = row.vol != null && row.vol !== '' ? String(row.vol) : null
  const name =
    cleanStr(row.commonname) ||
    cleanStr(row.chemname) ||
    cleanStr(row.mineral) ||
    null
  return { id, sg, sgNumber, formula, vol, name }
}

function cleanStr(v) {
  if (v == null) return null
  const s = String(v).replace(/^-\s*/, '').replace(/\s*-\s*$/, '').trim()
  return s || null
}

function jsonResponse(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders({
      'content-type': 'application/json; charset=utf-8',
      ...extra,
    }),
  })
}

function corsHeaders(extra = {}) {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, HEAD, OPTIONS',
    'access-control-allow-headers': '*',
    'access-control-max-age': '86400',
    vary: 'Origin',
    ...extra,
  }
}
