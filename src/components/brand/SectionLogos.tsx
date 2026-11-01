/** Section marks in the Lattice Lab style: sky #38bdf8 + violet #a78bfa, heavy strokes, 32×32 grid. */
import type { ReactNode } from 'react'

type P = { size?: number; className?: string }
const S = '#38bdf8'
const V = '#a78bfa'

function Svg({ size = 24, className, children, testId }: P & { children: ReactNode; testId: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 32 32" fill="none"
      aria-hidden="true" focusable="false" data-logo={testId}>
      {children}
    </svg>
  )
}

/** Pubs: stacked journal pages, top sheet carrying a small lattice. */
export function PubsLogo(p: P) {
  return (
    <Svg {...p} testId="pubs">
      <path d="M9 4h14l4 4v18H9z" stroke={V} strokeWidth="1.8" strokeLinejoin="round" opacity=".55" />
      <path d="M5 7h14l4 4v18H5z" fill={S} fillOpacity=".1" stroke={S} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M19 7v4h4" stroke={S} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 15h10M9 25h10M9 15v10M14 15v10M19 15v10M9 20h10" stroke={V} strokeWidth="1.5" strokeLinecap="round" />
      <g fill={S}>
        <circle cx="9" cy="15" r="1.7" /><circle cx="19" cy="15" r="1.7" />
        <circle cx="9" cy="25" r="1.7" /><circle cx="19" cy="25" r="1.7" />
      </g>
      <circle cx="14" cy="20" r="2.1" fill={V} />
    </Svg>
  )
}

/** Morph: faceted crystal habit (prism capped by pyramids, Wulff-like). */
export function MorphLogo(p: P) {
  return (
    <Svg {...p} testId="morph">
      <path d="M16 2 25 9v14l-9 7-9-7V9z" fill={S} fillOpacity=".1" />
      <g stroke={S} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
        <path d="M16 2 25 9v14l-9 7-9-7V9z" />
        <path d="M7 9l9 4 9-4M16 13v17M7 23l9-3 9 3" stroke={V} />
      </g>
      <path d="M16 13 25 9 16 2 7 9z" fill={V} fillOpacity=".35" />
      <g fill={S}>
        <circle cx="16" cy="2.6" r="2" /><circle cx="16" cy="29.4" r="2" />
      </g>
    </Svg>
  )
}

/** Kinetics: nucleation–growth sigmoid rising to a small crystal. */
export function KineticsLogo(p: P) {
  return (
    <Svg {...p} testId="kinetics">
      <path d="M4 4v24h24" stroke={S} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 26c6 0 7-1 9-7s4-10 9-10" stroke={V} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M25 3l4 3v5l-4 3-4-3V6z" fill={S} fillOpacity=".25" stroke={S} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="10" cy="25" r="1.9" fill={S} />
      <circle cx="14" cy="19" r="2.2" fill={V} />
    </Svg>
  )
}

/** Process: jacketed stirred crystallizer with impeller and suspended crystals. */
export function ProcessLogo(p: P) {
  return (
    <Svg {...p} testId="process">
      <path d="M7 7v15a9 6 0 0 0 18 0V7" fill={S} fillOpacity=".1" stroke={S} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M4 10v12a12 8 0 0 0 24 0V10" stroke={V} strokeWidth="1.5" strokeLinecap="round" opacity=".7" />
      <path d="M16 3v19M11 21h10" stroke={S} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M11 21l-2 2M21 21l2 2" stroke={S} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 13l1.5-1.5 1.5 1.5-1.5 1.5zM19 16l1.5-1.5 1.5 1.5-1.5 1.5zM20 10l1.2-1.2 1.2 1.2-1.2 1.2z" fill={V} />
    </Svg>
  )
}

/** Solid forms: two packings of the same molecule (polymorph pair) with a guest (hydrate/coformer). */
export function FormsLogo(p: P) {
  return (
    <Svg {...p} testId="forms">
      <rect x="3" y="5" width="12" height="12" rx="1.5" fill={S} fillOpacity=".1" stroke={S} strokeWidth="1.8" />
      <path d="M21 4l7 4v8l-7 4-7-4V8z" fill={V} fillOpacity=".12" stroke={V} strokeWidth="1.8" strokeLinejoin="round" />
      <g fill={S}><circle cx="6.5" cy="8.5" r="1.6" /><circle cx="11.5" cy="8.5" r="1.6" /><circle cx="6.5" cy="13.5" r="1.6" /><circle cx="11.5" cy="13.5" r="1.6" /></g>
      <g fill={V}><circle cx="21" cy="9" r="1.6" /><circle cx="18" cy="14" r="1.6" /><circle cx="24" cy="14" r="1.6" /></g>
      <path d="M5 22h22v6H5z" fill={S} fillOpacity=".08" stroke={S} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="10" cy="25" r="1.7" fill={S} /><circle cx="16" cy="25" r="1.4" fill={V} /><circle cx="22" cy="25" r="1.7" fill={S} />
    </Svg>
  )
}
