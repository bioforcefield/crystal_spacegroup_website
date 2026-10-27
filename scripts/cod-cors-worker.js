/**
 * Cloudflare Worker: CORS proxy for COD CIF downloads.
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
 */
const COD_UPSTREAM = 'https://www.crystallography.net/cod'

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
  const id =
    url.searchParams.get('id') ||
    (url.pathname.match(/(\d{5,10})(?:\.cif)?\/?$/) || [])[1]
  if (!id) {
    return new Response(
      'crystal-cod-proxy: GET /{codId}.cif  (Crystallography Open Database)\n',
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
