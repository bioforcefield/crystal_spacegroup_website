/** Descriptive CIF metadata for the structure panel (name, Z′, resolution, literature). */

export interface CifLiterature {
  title?: string
  authors: string[]
  journal?: string
  year?: string
  volume?: string
  pages?: string
  doi?: string
  /** Short formatted citation line, e.g. "Zarges et al. Angew. … 28 (1989) 1392–1394". */
  citation?: string
}

export interface CifXrayMeta {
  /** Radiation wavelength in Å when present. */
  wavelengthA?: number
  /** e.g. MoKα, CuKα from _diffrn_radiation_type. */
  radiationType?: string
  /** Probe when tagged (x-ray / neutron / electron). */
  probe?: string
  /** Ambient / measurement temperature in K when present. */
  temperatureK?: number
  /** R-factor (all) when present. */
  rFactorAll?: number
  /** Weighted R on reflections when present. */
  wRFactorRef?: number
  /** Goodness of fit (S) when present. */
  gof?: number
}

export interface CifMetadata {
  name?: string
  formula?: string
  /** SMILES when present in the CIF (rare in COD; useful when deposited). */
  smiles?: string
  z?: number
  /** Z′ from the CIF tag, or computed as Z / operator count (set by expandStructure). */
  zPrime?: number
  zPrimeSource?: 'cif' | 'computed'
  /**
   * Teaching note / formula shown next to Z′.
   * Explicit CIF tags win; computed uses Z′ = Z / N_ops (general-position estimate).
   */
  zPrimeNote?: string
  /** Warning when the Z′ estimate is unreliable (non-integer, incomplete ops, …). */
  zPrimeWarning?: string
  /** High-resolution limit d_min in Å. */
  resolutionA?: number
  resolutionSource?: 'refine' | 'theta'
  /** Diffraction / refinement tags for the X-ray panel (omit when absent). */
  xray?: CifXrayMeta
  literature?: CifLiterature
}

type Loop = { headers: string[]; rows: string[][] }

export function cleanText(raw: string | null | undefined): string | undefined {
  if (raw == null) return undefined
  let s = raw.trim()
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"')))
    s = s.slice(1, -1)
  s = s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\\a/g, 'α').replace(/\\b/g, 'β').replace(/\\g/g, 'γ')
    .replace(/---/g, '—').replace(/\s+/g, ' ').trim()
  if (!s || s === '?' || s === '.') return undefined
  return s
}

const num = (raw: string | undefined) => {
  if (!raw) return undefined
  const v = parseFloat(raw.replace(/\(.*\)$/, ''))
  return Number.isFinite(v) ? v : undefined
}

export function extractMetadata(pairs: Map<string, string>, loops: Loop[]): CifMetadata {
  const loopCol = (keys: string[]): string[] => {
    for (const k of keys) {
      for (const l of loops) {
        const idx = l.headers.indexOf(k)
        if (idx >= 0) return l.rows.map((r) => cleanText(r[idx])).filter((x): x is string => !!x)
      }
    }
    return []
  }
  const get = (...keys: string[]): string | undefined => {
    for (const k of keys) {
      const v = cleanText(pairs.get(k))
      if (v) return v
      const col = loopCol([k])
      if (col.length) return col[0]
    }
    return undefined
  }

  const meta: CifMetadata = {}
  meta.formula = get('_chemical_formula_sum', '_chemical_formula.sum')
  meta.smiles = get('_chemical_formula_smiles', '_chemical_formula.smiles')
  // Descriptor loops (mmCIF-style): pick the SMILES-typed row when present
  for (const l of loops) {
    const typeIdx = l.headers.findIndex(
      (h) =>
        h === '_pdbx_chem_comp_descriptor.type' ||
        h === '_chem_comp_descriptor.type' ||
        /(^|[._])type$/i.test(h) && h.toLowerCase().includes('descriptor'),
    )
    const descIdx = l.headers.findIndex(
      (h) =>
        h === '_pdbx_chem_comp_descriptor.descriptor' ||
        h === '_chem_comp_descriptor.descriptor' ||
        h.endsWith('.descriptor'),
    )
    if (typeIdx < 0 || descIdx < 0) continue
    for (const row of l.rows) {
      const t = cleanText(row[typeIdx])?.toUpperCase() ?? ''
      if (!t.includes('SMILES')) continue
      const s = cleanText(row[descIdx])
      if (s) {
        meta.smiles = s
        break
      }
    }
    if (meta.smiles) break
  }
  meta.name =
    get('_chemical_name_common', '_chemical_name.common', '_chemical_name_systematic',
      '_chemical_name.systematic', '_chemical_name_mineral', '_struct_title', '_struct.title')

  meta.z = num(get('_cell_formula_units_z', '_cell.formula_units_z'))
  const zp = num(get('_cell_formula_units_z_prime', '_exptl_crystal_z_prime', '_exptl_crystal.z_prime', '_cell.z_prime', '_space_group_z_prime'))
  if (zp != null && zp > 0) { meta.zPrime = zp; meta.zPrimeSource = 'cif' }

  const res = num(get('_refine_ls_d_res_high', '_refine.ls_d_res_high', '_reflns_d_resolution_high', '_reflns.d_resolution_high', '_diffrn_reflns_resolution_high'))
  if (res != null && res > 0) { meta.resolutionA = res; meta.resolutionSource = 'refine' }
  else {
    const theta = num(get('_diffrn_reflns_theta_max', '_diffrn_reflns.theta_max', '_reflns_theta_max'))
    const lambda = num(get('_diffrn_radiation_wavelength', '_diffrn_radiation_wavelength.wavelength'))
    if (theta && lambda && theta > 0 && theta < 90) {
      meta.resolutionA = lambda / (2 * Math.sin((theta * Math.PI) / 180))
      meta.resolutionSource = 'theta'
    }
  }

  const xray: CifXrayMeta = {}
  const wl = num(get('_diffrn_radiation_wavelength', '_diffrn_radiation_wavelength.wavelength', '_diffrn_radiation.wavelength'))
  if (wl != null && wl > 0) xray.wavelengthA = wl
  const radType = get('_diffrn_radiation_type', '_diffrn_radiation.type')
  if (radType) xray.radiationType = radType.replace(/\\a/gi, 'α').replace(/\\b/gi, 'β')
  const probe = get('_diffrn_radiation_probe', '_diffrn_radiation.probe', '_diffrn_radiation_xray_symbol')
  if (probe) xray.probe = probe
  else if (radType) {
    const low = radType.toLowerCase()
    if (low.includes('neutron')) xray.probe = 'neutron'
    else if (low.includes('electron')) xray.probe = 'electron'
    else xray.probe = 'x-ray'
  }
  const temp = num(get('_diffrn_ambient_temperature', '_diffrn_ambient_temperature.temperature', '_cell_measurement_temperature', '_cell.measurement_temperature'))
  if (temp != null && temp > 0) xray.temperatureK = temp
  const rAll = num(get('_refine_ls_R_factor_all', '_refine.ls_R_factor_all'))
  if (rAll != null && rAll >= 0) xray.rFactorAll = rAll
  const wR = num(get('_refine_ls_wR_factor_ref', '_refine.ls_wR_factor_ref', '_refine_ls_wR_factor_gt'))
  if (wR != null && wR >= 0) xray.wRFactorRef = wR
  const gof = num(get('_refine_ls_goodness_of_fit_ref', '_refine.ls_goodness_of_fit_ref', '_refine_ls_goodness_of_fit_all', '_refine_ls_goodness_of_fit_gt'))
  if (gof != null && gof > 0) xray.gof = gof
  if (xray.wavelengthA != null || xray.radiationType || xray.temperatureK != null ||
      xray.rFactorAll != null || xray.wRFactorRef != null || xray.gof != null || xray.probe) {
    meta.xray = xray
  }

  const authors = loopCol(['_publ_author_name', '_publ_author.name', '_citation_author.name'])
  if (!authors.length) { const a = get('_publ_author_name'); if (a) authors.push(a) }
  const lit: CifLiterature = {
    authors,
    title: get('_publ_section_title', '_citation.title', '_citation_title'),
    journal: get('_journal_name_full', '_journal.name_full', '_citation.journal_full', '_citation.journal_abbrev', '_journal_coden_astm'),
    year: get('_journal_year', '_journal.year', '_citation.year'),
    volume: get('_journal_volume', '_journal.volume', '_citation.journal_volume'),
    doi: get('_journal_paper_doi', '_journal.paper_doi', '_citation.pdbx_database_id_doi', '_citation.doi', '_citation_doi'),
  }
  const pf = get('_journal_page_first', '_journal.page_first', '_citation.page_first')
  const pl = get('_journal_page_last', '_journal.page_last', '_citation.page_last')
  if (pf) lit.pages = pl && pl !== pf ? `${pf}–${pl}` : pf
  if (lit.doi) lit.doi = lit.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
  if (lit.title || lit.journal || lit.doi || authors.length) {
    const surname = (a: string) => a.split(',')[0]!.trim()
    const who = authors.length === 0 ? '' : authors.length === 1 ? surname(authors[0]!)
      : authors.length === 2 ? `${surname(authors[0]!)} & ${surname(authors[1]!)}` : `${surname(authors[0]!)} et al.`
    const src = [lit.journal, lit.volume, lit.year ? `(${lit.year})` : '', lit.pages].filter(Boolean).join(' ')
    const c = [who, src].filter(Boolean).join(', ')
    if (c) lit.citation = c
    meta.literature = lit
  }
  return meta
}
