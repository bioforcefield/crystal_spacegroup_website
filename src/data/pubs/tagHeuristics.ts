/**
 * Light tagging rules used when seeding the curated COD pubs set.
 * These are teaching heuristics — not a claim that every COD entry
 * can be auto-classified correctly.
 *
 * Manual overrides in codPubs.ts always win for the seeded list.
 *
 * Rules (applied to formula + name/title/mineral/chemname text):
 * - mineral: named mineral field, or mineral keywords (calcite, quartz, …)
 * - hydrate: “hydrate” / H2O / known hydrate minerals (gypsum, ice, …)
 * - salt: halide/sulfate/phosphate/nitrate cues, or alkali+halide without C
 * - drug: curated pharma names (aspirin, ibuprofen, pristinamycin, …)
 * - mof: MOF / framework / zeolite keywords (or curated MOF ids)
 * - organic vs inorganic: C+H (or light-atom-only) molecular formulas → organic;
 *   otherwise inorganic (elements, oxides, minerals without organics)
 */
import type { PubTag } from './types'

const ORGANIC_ELEMS = new Set([
  'C',
  'H',
  'N',
  'O',
  'F',
  'Cl',
  'Br',
  'I',
  'S',
  'P',
])

export function parseFormulaElements(formula: string | null | undefined): Set<string> {
  if (!formula) return new Set()
  const cleaned = formula.replace(/^-\s*/, '').replace(/\s*-\s*$/, '')
  return new Set(cleaned.match(/[A-Z][a-z]?/g) ?? [])
}

export function suggestTags(input: {
  formula?: string | null
  name?: string | null
  title?: string | null
  mineral?: string | null
  chemname?: string | null
}): PubTag[] {
  const formula = input.formula ?? ''
  const blob = [input.name, input.title, input.mineral, input.chemname]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  const elems = parseFormulaElements(formula)
  const tags: PubTag[] = []

  if (
    input.mineral ||
    /\b(mineral|apatite|calcite|corundum|graphite|diamond|galena|quartz|gypsum|halite)\b/.test(
      blob,
    )
  ) {
    tags.push('mineral')
  }
  if (/\b(hydrate|h2o|ice\b|gypsum|baylissite)\b/.test(blob)) {
    tags.push('hydrate')
  }
  if (
    /\b(chloride|sulfate|sulphate|phosphate|nitrate|salt|halite)\b/.test(blob) ||
    (elems.has('Na') || elems.has('K') || elems.has('Cl')) && !elems.has('C')
  ) {
    tags.push('salt')
  }
  if (
    /\b(aspirin|ibuprofen|penicillin|pristinamycin|nicotinic|drug|pharma)\b/.test(
      blob,
    )
  ) {
    tags.push('drug')
  }
  if (/\b(mof|metal-organic|framework|zeolite)\b/.test(blob)) {
    tags.push('mof')
  }

  const hasC = elems.has('C')
  const hasH = elems.has('H')
  const onlyLight = elems.size > 0 && [...elems].every((e) => ORGANIC_ELEMS.has(e))
  if (input.mineral && !hasC) {
    tags.push('inorganic')
  } else if (hasC && (hasH || onlyLight)) {
    tags.push('organic')
  } else {
    tags.push('inorganic')
  }

  const seen = new Set<PubTag>()
  return tags.filter((t) => (seen.has(t) ? false : (seen.add(t), true)))
}
