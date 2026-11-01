/** Lattice Lab mark: isometric unit cell with lattice-point atoms and a body-centre atom. */
export function LatticeLabLogo({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M16 3 27 9v13l-11 6.5L5 22V9z" fill="#38bdf8" fillOpacity=".1" />
      <g stroke="#38bdf8" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
        <path d="M16 3 27 9v13l-11 6.5L5 22V9z" />
        <path d="M5 9l11 6.5L27 9M16 15.5v13" stroke="#a78bfa" />
      </g>
      <g fill="#38bdf8">
        <circle cx="16" cy="3.2" r="2.2" />
        <circle cx="27" cy="9" r="2.2" />
        <circle cx="5" cy="9" r="2.2" />
        <circle cx="27" cy="22" r="2.2" />
        <circle cx="5" cy="22" r="2.2" />
        <circle cx="16" cy="28.5" r="2.2" />
      </g>
      <circle cx="16" cy="15.5" r="2.8" fill="#a78bfa" />
    </svg>
  )
}
