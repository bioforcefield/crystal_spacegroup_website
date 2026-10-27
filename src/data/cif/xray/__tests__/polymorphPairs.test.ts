import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  POLYMORPH_PAIRS,
  findPolymorphPair,
  polymorphPairCodIds,
} from '../polymorphPairs'

const codDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../public/samples/cod',
)

describe('POLYMORPH_PAIRS', () => {
  it('has at least three curated pairs with distinct A/B ids', () => {
    expect(POLYMORPH_PAIRS.length).toBeGreaterThanOrEqual(3)
    for (const p of POLYMORPH_PAIRS) {
      expect(p.formA.codId).not.toBe(p.formB.codId)
      expect(p.chemistry.length).toBeGreaterThan(0)
      expect(p.note.length).toBeGreaterThan(10)
    }
  })

  it('findPolymorphPair resolves by id', () => {
    const first = POLYMORPH_PAIRS[0]!
    expect(findPolymorphPair(first.id)?.short).toBe(first.short)
    expect(findPolymorphPair('nope')).toBeUndefined()
  })

  it('every pair COD id is present in the same-origin cache', () => {
    for (const id of polymorphPairCodIds()) {
      expect(existsSync(join(codDir, `${id}.cif`)), `missing cache ${id}`).toBe(
        true,
      )
    }
  })
})
