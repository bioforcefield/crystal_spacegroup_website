/**
 * One requestAnimationFrame loop per animated canvas / SVG piece that only
 * runs while it can be seen and motion is on:
 *  - stops when off-screen (IntersectionObserver), the tab is hidden, the
 *    user paused animations, reduced motion is on, or the piece is static;
 *  - restarts when that changes (both directions);
 *  - draws one static endpoint when motion is off / static, and on resize;
 *  - caches the CSS size from a ResizeObserver (no per-frame layout reads).
 */
import { getMotionOff, subscribeAnimationsPaused, subscribeReducedMotion } from '../../hooks/motionPrefs'

export interface LoopSize {
  w: number
  h: number
}

export interface LoopOptions {
  /** Element whose visibility and size drive the loop. */
  el: Element
  /** draw(now, still, size): still=true → static endpoint. */
  draw: (now: number, still: boolean, size: LoopSize) => void
  /** False for pieces with nothing to animate (identity): one static draw. */
  animated?: boolean
}

export function startLoop({ el, draw, animated = true }: LoopOptions): () => void {
  const rect = (el as HTMLElement).getBoundingClientRect?.()
  const size: LoopSize = { w: rect?.width || 0, h: rect?.height || 0 }
  let inview = true
  let raf = 0
  let drawn = false
  let disposed = false
  const hasRaf = typeof requestAnimationFrame === 'function'
  const hidden = () => typeof document !== 'undefined' && document.hidden
  const running = () => animated && hasRaf && !getMotionOff() && inview && !hidden()

  const frame = (now: number) => {
    raf = 0
    if (disposed) return
    if (!running()) {
      update()
      return
    }
    draw(now, false, size)
    drawn = true
    raf = requestAnimationFrame(frame)
  }

  const update = () => {
    if (disposed) return
    if (running()) {
      if (!raf) raf = requestAnimationFrame(frame)
      return
    }
    if (raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
    // Motion off or nothing to animate → static endpoint. Off-screen / hidden
    // → keep the last frame (draw once if nothing was drawn yet).
    if (getMotionOff() || !animated || !hasRaf || !drawn) {
      draw(typeof performance !== 'undefined' ? performance.now() : 0, true, size)
      drawn = true
    }
  }

  const io =
    typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((es) => {
          inview = es.some((e) => e.isIntersecting)
          update()
        })
      : null
  io?.observe(el)
  const ro =
    typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver((es) => {
          const r = es[es.length - 1]?.contentRect
          if (r) {
            size.w = r.width
            size.h = r.height
          }
          if (!raf) {
            drawn = false
            update()
          }
        })
      : null
  ro?.observe(el)
  const onVis = () => update()
  document.addEventListener('visibilitychange', onVis)
  const unPause = subscribeAnimationsPaused(update)
  const unReduce = subscribeReducedMotion(update)
  update()

  return () => {
    disposed = true
    if (raf) cancelAnimationFrame(raf)
    io?.disconnect()
    ro?.disconnect()
    document.removeEventListener('visibilitychange', onVis)
    unPause()
    unReduce()
  }
}
