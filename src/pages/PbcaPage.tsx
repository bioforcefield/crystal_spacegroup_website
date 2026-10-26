import { pbcaDemo } from '../data/pbca'
import SpaceGroupPage from './SpaceGroupPage'

/** @deprecated Prefer SpaceGroupPage with pbcaDemo — kept for route compatibility. */
export default function PbcaPage() {
  return <SpaceGroupPage demo={pbcaDemo} />
}
