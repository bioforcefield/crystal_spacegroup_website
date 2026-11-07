import { useId } from 'react'
import { setAnimationsPaused, useAnimationsPaused, usePrefersReducedMotion } from '../hooks/motionPrefs'

/**
 * Visible, persistent "Pause animations / Resume animations" control (WCAG
 * 2.2.2). One shared state for every instance on the page and remembered
 * across visits; reduced motion is reported but does not replace it.
 * ARIA pattern: an action button whose name says what it will do (no
 * aria-pressed, so the state is not announced twice).
 */
export default function AnimationPauseToggle({ className }: { className?: string }) {
  const paused = useAnimationsPaused()
  const reduced = usePrefersReducedMotion()
  const noteId = useId()
  return (
    <>
    <button
      type="button"
      className={`btn anim-pause-toggle${className ? ` ${className}` : ''}`}
      onClick={() => setAnimationsPaused(!paused)}
      aria-describedby={reduced ? noteId : undefined}
    >
      <span aria-hidden="true">{paused ? '▶' : '❚❚'}</span> {paused ? 'Resume animations' : 'Pause animations'}
    </button>
    {reduced && (
      <span id={noteId} className="sr-only">
        Your system asks for reduced motion, so animations stay still either way.
      </span>
    )}
    </>
  )
}
