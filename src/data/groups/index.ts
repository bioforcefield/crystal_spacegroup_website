/** Shared space-group generator / validation helpers. */

export { parseTriplet, parseCoordExpr, normalizeTripletText } from './parseTriplet'
export {
  multiplySeitz,
  composeOps,
  reduceT,
  matClose,
  tCloseMod1,
  seitzEqual,
  isIdentitySeitz,
  IDENTITY_R,
} from './composeOps'
export type { Seitz } from './composeOps'
export { checkClosure, findOp } from './closure'
export type { ClosureResult } from './closure'
export {
  deriveElements,
  deriveInversions,
  deriveTwofoldOrScrewB,
  deriveTwofoldAxes,
  deriveFourfoldC,
  deriveThreefoldC,
  deriveBodyDiagonalThreefolds,
  deriveGlidesPerpB,
  deriveAxisAlignedGlides,
  deriveDiagonalGlides,
  isGeometryLimited,
  fracNear,
} from './deriveElements'
export type { DerivedElements } from './deriveElements'
export { buildOperatorsFromTriplets, classify } from './buildOperators'
