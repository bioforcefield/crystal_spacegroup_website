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
 */
const COD_UPSTREAM = 'https://www.crystallography.net/cod'
const SEARCH_TIMEOUT_MS = 20_000
const SEARCH_MAX_BYTES = 2_000_000
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
      'crystal-cod-proxy: GET /{codId}.cif  or  GET /search?text=…  or  GET /search?smile=…\n',
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

  // Prefer text if both provided (mutually exclusive preference).
  let kind = null
  let value = ''
  if (text) {
    kind = 'text'
    value = text
  } else if (smile) {
    kind = 'smile'
    value = smile
  }

  if (!kind) {
    return jsonResponse(
      {
        error: 'Provide ?text=… (name/keyword) or ?smile=… (SMILES/substructure)',
      },
      400,
    )
  }
  if (value.length > 200) {
    return jsonResponse({ error: 'Query too long (max 200 characters)' }, 400)
  }

  const upstreamUrl = new URL(`${COD_UPSTREAM}/result.php`)
  if (kind === 'text') {
    upstreamUrl.searchParams.set('text', value)
  } else {
    // COD REST API uses `smarts` for SMILES/substructure queries (wiki.crystallography.net).
    // `smile` alone returns empty; we accept smile/smiles in our API for UX.
    upstreamUrl.searchParams.set('smarts', value)
  }
  upstreamUrl.searchParams.set('format', 'json')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS)
  let upstream
  try {
    upstream = await fetch(upstreamUrl.toString(), {
      redirect: 'follow',
      signal: controller.signal,
      headers: { accept: 'application/json, text/plain, */*' },
    })
  } catch (e) {
    const aborted = e && e.name === 'AbortError'
    return jsonResponse(
      {
        error: aborted
          ? 'COD search timed out'
          : `COD search failed: ${e && e.message ? e.message : String(e)}`,
      },
      502,
    )
  } finally {
    clearTimeout(timer)
  }

  if (method === 'HEAD') {
    return new Response(null, {
      status: upstream.status,
      headers: corsHeaders({
        'content-type': 'application/json',
        'cache-control': 'public, max-age=300',
        'x-cod-search': kind,
      }),
    })
  }

  const buf = await upstream.arrayBuffer()
  if (buf.byteLength > SEARCH_MAX_BYTES) {
    return jsonResponse(
      { error: 'COD search response too large; try a more specific query' },
      502,
    )
  }

  const rawText = new TextDecoder().decode(buf)
  if (!upstream.ok) {
    return jsonResponse(
      {
        error: `COD search HTTP ${upstream.status}`,
        detail: rawText.slice(0, 200),
      },
      502,
    )
  }

  let parsed
  try {
    parsed = JSON.parse(rawText)
  } catch {
    return jsonResponse(
      { error: 'COD search returned non-JSON (TLS or HTML error page?)' },
      502,
    )
  }

  if (!Array.isArray(parsed)) {
    return jsonResponse(
      { error: 'Unexpected COD search shape (expected JSON array)' },
      502,
    )
  }

  const total = parsed.length
  const hits = parsed.slice(0, SEARCH_CAP).map(normalizeHit).filter(Boolean)

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
