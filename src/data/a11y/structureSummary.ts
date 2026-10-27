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
  if (structure.hbonds?.length) {
    const cross = structure.hbonds.filter((h) => h.crossOp).length
    bits.push(
      `${structure.hbonds.length} geometric H-bond contacts` +
        (cross ? `, ${cross} cross-operator` : ''),
    )
  }
  return bits.join('. ') + '.'
}

export function describeSpaceGroupCanvas(demo: SpaceGroupDemo): string {
  const m = demo.meta
  const nAxes = demo.screwAxes?.length ?? 0
  const nGlides = demo.glidePlanes?.length ?? 0
  const nInv = demo.inversionCenters?.length ?? 0
  const elements =
    nAxes + nGlides + nInv > 0
      ? `, ${nAxes} axis overlay${nAxes === 1 ? '' : 's'}, ${nGlides} plane overlay${nGlides === 1 ? '' : 's'}, ${nInv} inversion center${nInv === 1 ? '' : 's'}`
      : ', no drawable geometric overlays yet'
  return (
    `Space-group teaching demo ${m.number} ${m.hm}, ${m.system} system, ` +
    `${demo.operators.length} general-position operators` +
    elements +
    (demo.demoSource === 'generated' ? ', auto-generated from ITA' : ', hand-tuned teaching demo') +
    '. Use the operator list or chips to highlight BASE to IMAGE. 3D view is visual only; not a full screen-reader geometry description.'
  )
}
