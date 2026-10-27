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
 */
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

  const id =
    url.searchParams.get('id') ||
    (url.pathname.match(/(\d{5,10})(?:\.cif)?\/?$/) || [])[1]
  if (!id) {
    return new Response(
      'crystal-cod-proxy: GET /{codId}.cif  or  GET /search?text=…|smile=…|year=YYYY\n',
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
