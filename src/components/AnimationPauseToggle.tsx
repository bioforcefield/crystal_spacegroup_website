import { setAnimationsPaused, useAnimationsPaused, usePrefersReducedMotion } from '../hooks/motionPrefs'

/**
 * Visible, persistent "Pause animations / Resume animations" control (WCAG
 * 2.2.2). One shared state for every instance on the page and remembered
 * across visits; reduced motion is reported but does not replace it.
 */
export default function AnimationPauseToggle({ className }: { className?: string }) {
  const paused = useAnimationsPaused()
  const reduced = usePrefersReducedMotion()
  return (
    <button
      type="button"
      className={`btn anim-pause-toggle${className ? ` ${className}` : ''}`}
      aria-pressed={paused}
      onClick={() => setAnimationsPaused(!paused)}
      title={reduced ? 'Your system asks for reduced motion: animations already show still endpoints' : undefined}
    >
      <span aria-hidden="true">{paused ? '▶' : '❚❚'}</span> {paused ? 'Resume animations' : 'Pause animations'}
      {reduced && <span className="sr-only"> (reduced motion is on: animations are still)</span>}
    </button>
  )
}
