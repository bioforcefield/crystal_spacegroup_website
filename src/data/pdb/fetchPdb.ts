/** Fetch an mmCIF from RCSB (CORS-enabled static file service). */
import { PDB_ID_RE } from '../cif/cifRoute'

export class PdbNotFoundError extends Error {}

export const rcsbEntryUrl = (id: string) => `https://www.rcsb.org/structure/${id.toUpperCase()}`
export const rcsbCifUrl = (id: string) => `https://files.rcsb.org/download/${id.toUpperCase()}.cif`

export const PDB_TEACHING_CHIPS: ReadonlyArray<{ id: string; short: string; title: string }> = [
  { id: '1crn', short: 'Crambin · P2₁', title: 'Crambin (46 residues), P 1 21 1 — small, fast' },
  { id: '1mbn', short: 'Myoglobin · P2₁', title: 'Sperm-whale myoglobin with heme, P 1 21 1' },
  { id: '193l', short: 'Lysozyme · P4₃2₁2', title: 'Hen egg-white lysozyme, tetragonal P 43 21 2' },
  { id: '4ins', short: 'Insulin · R3', title: '2Zn pig insulin hexamer, H 3 (rhombohedral, hexagonal axes)' },
  { id: '2lzm', short: 'T4 lysozyme · P3₂21', title: 'T4 lysozyme, trigonal P 32 2 1' },
  { id: '1hsg', short: 'HIV protease + indinavir', title: 'HIV-1 protease with indinavir (MK1), P 21 21 2 — ligand focus' },
  { id: '4hhb', short: 'Hemoglobin · heme', title: 'Human deoxyhemoglobin (4 chains + 4 hemes), P 1 21 1' },
  { id: '1bna', short: 'B-DNA dodecamer', title: 'Dickerson–Drew B-DNA dodecamer, P 21 21 21 — ladder cartoon' },
]

export async function fetchPdbCif(id: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  if (!PDB_ID_RE.test(id)) throw new Error(`“${id}” is not a PDB ID (4 characters, e.g. 1CRN).`)
  let res: Response
  try {
    res = await fetchImpl(rcsbCifUrl(id))
  } catch {
    throw new Error(`Couldn't reach RCSB for PDB ${id.toUpperCase()} — check your connection and retry.`)
  }
  if (res.status === 404) throw new PdbNotFoundError(`PDB ${id.toUpperCase()} was not found at RCSB (obsolete, unreleased, or a large entry only distributed in other formats).`)
  if (!res.ok) throw new Error(`RCSB returned HTTP ${res.status} for PDB ${id.toUpperCase()}.`)
  return res.text()
}
