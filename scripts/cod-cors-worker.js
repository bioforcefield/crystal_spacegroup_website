/**
 * Optional Cloudflare Worker: same-origin-friendly COD CIF proxy with CORS.
 *
 * Deploy (Cloudflare dashboard or wrangler), then build the site with:
 *   VITE_COD_PROXY="https://YOUR_WORKER.workers.dev/{id}.cif" npm run build:pages
 *
 * Request paths accepted:
 *   /1100303.cif
 *   /cod/1100303.cif
 *   /?id=1100303
 */
export default {
  async fetch(request) {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() })
    }
    const id =
      url.searchParams.get('id') ||
      (url.pathname.match(/(\d{5,10})(?:\.cif)?\/?$/) || [])[1]
    if (!id) {
      return new Response('Usage: /{codId}.cif', {
        status: 400,
        headers: corsHeaders({ 'content-type': 'text/plain' }),
      })
    }
    const upstream = await fetch(
      `https://www.crystallography.net/cod/${id}.cif`,
      { redirect: 'follow' },
    )
    const body = await upstream.arrayBuffer()
    return new Response(body, {
      status: upstream.status,
      headers: corsHeaders({
        'content-type': upstream.headers.get('content-type') || 'chemical/x-cif',
        'cache-control': 'public, max-age=86400',
      }),
    })
  },
}

function corsHeaders(extra = {}) {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': '*',
    ...extra,
  }
}
