/**
 * Motion preferences shared by every animated piece on a page:
 *  - "Pause animations" — a visible, persistent user choice (WCAG 2.2.2),
 *    remembered in localStorage and shared live between all instances on the
 *    page through one module store (other tabs follow via the storage event);
 *  - prefers-reduced-motion — followed live in both directions.
 * Animations treat either as "motion off" and show a static endpoint.
 */
import { useSyncExternalStore } from 'react'

export const ANIM_PAUSED_STORAGE_KEY = 'csg.animationsPaused.v1'
const RM_QUERY = '(prefers-reduced-motion: reduce)'

type Listener = () => void
const pausedListeners = new Set<Listener>()
let paused: boolean | null = null
let storageHooked = false

function readPaused(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(ANIM_PAUSED_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function syncRootClass(v: boolean) {
  if (typeof document !== 'undefined') document.documentElement.classList.toggle('anim-paused', v)
}

/** Pure snapshot read (no DOM side effects); memory is authoritative once set. */
export function getAnimationsPaused(): boolean {
  if (paused === null) paused = typeof window !== 'undefined' && readPaused()
  return paused
}

/** Apply the stored choice to <html class="anim-paused"> once at startup. */
export function initMotionPrefs(): void {
  syncRootClass(getAnimationsPaused())
}

export function setAnimationsPaused(v: boolean): void {
  paused = v
  syncRootClass(v)
  try {
    localStorage.setItem(ANIM_PAUSED_STORAGE_KEY, v ? '1' : '0')
  } catch {
    /* private mode / quota — the in-memory choice still applies this session */
  }
  pausedListeners.forEach((l) => l())
}

export function subscribeAnimationsPaused(l: Listener): () => void {
  pausedListeners.add(l)
  if (!storageHooked && typeof window !== 'undefined') {
    storageHooked = true
    window.addEventListener('storage', (e) => {
      if (e.key !== ANIM_PAUSED_STORAGE_KEY) return
      paused = readPaused()
      syncRootClass(paused)
      pausedListeners.forEach((f) => f())
    })
  }
  return () => {
    pausedListeners.delete(l)
  }
}

export function getReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.(RM_QUERY)?.matches
}

export function subscribeReducedMotion(l: Listener): () => void {
  const m = typeof window !== 'undefined' ? window.matchMedia?.(RM_QUERY) : undefined
  m?.addEventListener?.('change', l)
  return () => m?.removeEventListener?.('change', l)
}

export const getMotionOff = () => getAnimationsPaused() || getReducedMotion()

export function useAnimationsPaused(): boolean {
  return useSyncExternalStore(subscribeAnimationsPaused, getAnimationsPaused, () => false)
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false)
}

/** True when animations should show a static endpoint (paused or reduced motion). */
export function useMotionOff(): boolean {
  const p = useAnimationsPaused()
  const r = usePrefersReducedMotion()
  return p || r
}
