/** Tag vocabulary for the curated COD publications browser. */
export type PubTag =
  | 'organic'
  | 'inorganic'
  | 'drug'
  | 'hydrate'
  | 'salt'
  | 'mineral'
  | 'mof'
  | 'ml'
  | 'csp'

export interface CodPubEntry {
  /** COD numeric id */
  id: string
  /** Short display name (compound / mineral) */
  name: string
  /** COD bibliographic title when available */
  title?: string | null
  year: number | null
  journal: string | null
  doi: string | null
  formula: string | null
  sg: string | null
  sgNumber: number | null
  tags: readonly PubTag[]
}

export interface PubFilterState {
  /** Multi-select tags; empty = any */
  tags: readonly PubTag[]
  /** Exact year or null = all years */
  year: number | null
  /** Free-text over name/title/journal/id/formula */
  query: string
}
