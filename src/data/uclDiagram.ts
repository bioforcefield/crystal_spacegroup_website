/** Birkbeck / UCL hypertext book of crystallography — ITA-style plates. */
export const UCL_SGP_HUB = 'http://img.chem.ucl.ac.uk/sgp/'

/**
 * URL for the primary UCL large diagram page for ITA space-group number `n` (1–230).
 * Pattern matches plates such as R-3c → http://img.chem.ucl.ac.uk/sgp/large/167az1.htm
 */
export function uclSpaceGroupDiagramUrl(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 230) {
    throw new RangeError(`ITA space-group number out of range: ${n}`)
  }
  const padded = String(n).padStart(3, '0')
  return `http://img.chem.ucl.ac.uk/sgp/large/${padded}az1.htm`
}

export const UCL_DIAGRAM_LINK_LABEL = 'UCL / ITA-style diagram'

export const UCL_DIAGRAM_CREDIT =
  'Diagrams © Birkbeck College / UCL hypertext book (ITA-style plates)'
