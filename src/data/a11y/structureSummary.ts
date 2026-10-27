import type { ExpandedStructure } from '../cif/types'
import type { SpaceGroupDemo } from '../types'

/** Concise spoken summary for CIF 3D canvas / structure panel. */
export function describeCifStructure(structure: ExpandedStructure): string {
  const bits: string[] = ['Crystal structure 3D view']
  if (structure.metadata?.name) bits.push(structure.metadata.name)
  else if (structure.metadata?.formula) bits.push(structure.metadata.formula)
  if (structure.spaceGroupNumber != null) {
    bits.push(
      `space group ${structure.spaceGroupNumber}${
        structure.spaceGroupName ? ` ${structure.spaceGroupName}` : ''
      }`,
    )
  } else if (structure.spaceGroupName) {
    bits.push(`space group ${structure.spaceGroupName}`)
  }
  const { a, b, c, betaDeg } = structure.cell
  bits.push(
    `cell ${a.toFixed(2)} by ${b.toFixed(2)} by ${c.toFixed(2)} angstrom` +
      (betaDeg && betaDeg !== 90 ? `, beta ${betaDeg} degrees` : ''),
  )
  if (structure.metadata?.zPrime != null) {
    bits.push(`Z prime ${structure.metadata.zPrime}`)
  }
  bits.push(
    `${structure.moleculeCount} intact molecules, ${structure.operators.length} operators, ${structure.atoms.length} sites`,
  )
  return bits.join('. ') + '.'
}

export function describeSpaceGroupCanvas(demo: SpaceGroupDemo): string {
  const m = demo.meta
  return (
    `Space-group teaching demo ${m.number} ${m.hm}, ${m.system} system, ` +
    `${demo.operators.length} general-position operators` +
    (demo.demoSource === 'generated' ? ', auto-generated from ITA' : '') +
    '. Use the operator list to highlight BASE to IMAGE. 3D view is visual only.'
  )
}
