/**
 * Curated same-origin COD CIF cache (public/samples/cod/).
 * Works on GitHub Pages without CORS; arbitrary ids still need VITE_COD_PROXY.
 */

export interface CodSampleMeta {
  id: string
  label: string
  hm?: string | null
  ita?: number | null
  formula?: string | null
}

export interface CodSamplesManifest {
  note?: string
  samples: CodSampleMeta[]
}

let cached: CodSamplesManifest | null = null

export function codSampleUrl(
  id: string,
  baseUrl = import.meta.env.BASE_URL,
): string {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${base}samples/cod/${id}.cif`
}

export function codManifestUrl(baseUrl = import.meta.env.BASE_URL): string {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${base}samples/cod/manifest.json`
}

/** Teaching chips shown in the CIF load panel (subset of the full cache). */
export const COD_TEACHING_CHIPS: ReadonlyArray<{ id: string; short: string }> = [
  { id: '1100303', short: '1100303 · P-1' },
  { id: '2100301', short: 'dinicotinic · P21/c' },
  { id: '2212817', short: 'organic · Pbca' },
  { id: '9008565', short: 'Si · Fd-3m' },
  { id: '9008564', short: 'diamond · Fd-3m' },
  { id: '9000001', short: 'PbS · Fm-3m' },
  { id: '1010962', short: 'Calcite · R-3c' },
  { id: '1010916', short: 'apatite · P63/m' },
  { id: '1507756', short: 'BaTiO₃ · P4mm' },
  { id: '1010995', short: 'SiC · F-43m' },
  { id: '1544740', short: 'NiS₂ · Pa-3' },
  { id: '9011577', short: 'graphite · P63/mmc' },
  { id: '9008566', short: 'Si (alt) · Fd-3m' },
  { id: '1010953', short: 'ZnS · P63mc' },
]

export async function loadCodSamplesManifest(
  fetchImpl: typeof fetch = fetch,
): Promise<CodSamplesManifest> {
  if (cached) return cached
  try {
    const res = await fetchImpl(codManifestUrl())
    if (!res.ok) {
      cached = { samples: COD_TEACHING_CHIPS.map((c) => ({ id: c.id, label: c.short })) }
      return cached
    }
    const json = (await res.json()) as CodSamplesManifest
    if (!json?.samples?.length) {
      cached = { samples: COD_TEACHING_CHIPS.map((c) => ({ id: c.id, label: c.short })) }
      return cached
    }
    cached = json
    return cached
  } catch {
    cached = { samples: COD_TEACHING_CHIPS.map((c) => ({ id: c.id, label: c.short })) }
    return cached
  }
}

/** Reset cache (tests). */
export function resetCodSamplesCache(): void {
  cached = null
}

export function isCachedCodId(
  id: string,
  manifest?: CodSamplesManifest | null,
): boolean {
  const samples = manifest?.samples ?? COD_TEACHING_CHIPS.map((c) => ({ id: c.id }))
  return samples.some((s) => s.id === id)
}
