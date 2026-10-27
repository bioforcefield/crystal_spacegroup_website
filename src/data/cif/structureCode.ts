/**
 * Normalize user-entered COD / CSD structure identifiers.
 */

export type StructureCode =
  | { kind: 'cod'; id: string; display: string }
  | { kind: 'csd'; refcode: string; display: string }

export type StructureCodeParse =
  | { ok: true; code: StructureCode }
  | { ok: false; error: string }

/** COD numeric id: 1–7+ digits, optional "COD" prefix / URL / .cif suffix. */
const COD_RE =
  /^(?:cod[\s:_-]*)?(\d{5,10})(?:\.cif)?$/i

/**
 * CSD refcode: 6 letters + optional 2-digit form (ACETAC, ACETAC01).
 * Also accept "CSD ACETAC01" / trailing .cif.
 */
const CSD_RE =
  /^(?:csd[\s:_-]*)?([A-Za-z]{5,6}\d{0,2})(?:\.cif)?$/i

/** Pull id from a crystallography.net COD URL if pasted. */
function fromCodUrl(raw: string): string | null {
  const m = raw.match(
    /crystallography\.net\/(?:cod\/)?(\d{5,10})(?:\.cif)?/i,
  )
  return m?.[1] ?? null
}

export function parseStructureCode(input: string): StructureCodeParse {
  const trimmed = input.trim()
  if (!trimmed) {
    return { ok: false, error: 'Enter a COD number (e.g. 1100303) or CSD refcode (e.g. ACETAC01)' }
  }

  const urlId = fromCodUrl(trimmed)
  if (urlId) {
    return {
      ok: true,
      code: { kind: 'cod', id: urlId, display: `COD ${urlId}` },
    }
  }

  // Strip surrounding quotes
  const s = trimmed.replace(/^['"]|['"]$/g, '').trim()

  const cod = s.match(COD_RE)
  if (cod) {
    // Prefer COD when purely numeric; CSD never starts with digits only
    return {
      ok: true,
      code: { kind: 'cod', id: cod[1]!, display: `COD ${cod[1]!}` },
    }
  }

  const csd = s.match(CSD_RE)
  if (csd) {
    const ref = csd[1]!.toUpperCase()
    // Heuristic: refcodes are 6 letters optionally + 2 digits (not all-digit)
    if (/^\d+$/.test(ref)) {
      return { ok: false, error: `Unrecognized code "${trimmed}"` }
    }
    if (!/^[A-Z]{5,6}\d{0,2}$/.test(ref)) {
      return {
        ok: false,
        error: `CSD refcodes look like ACETAC or ACETAC01 (got "${ref}")`,
      }
    }
    return {
      ok: true,
      code: { kind: 'csd', refcode: ref, display: `CSD ${ref}` },
    }
  }

  return {
    ok: false,
    error:
      'Unrecognized code — use a COD id (1100303) or CSD refcode (ACETAC01)',
  }
}

export function codCifUrl(id: string): string {
  return `https://www.crystallography.net/cod/${id}.cif`
}

export function csdAccessStructuresUrl(refcode: string): string {
  // Public CCDC Access Structures search by identifier (refcode / CCDC number).
  return `https://www.ccdc.cam.ac.uk/structures/Search?Ccdcid=${encodeURIComponent(refcode)}`
}
