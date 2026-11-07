/**
 * One-shot recovery for a code chunk that fails to load (e.g. a tab still holding an
 * older index.html after a redeploy removed its hashed chunks). Vite dispatches a
 * cancelable `vite:preloadError`; we reload once, and only if no reload was attempted
 * in the last minute this session, so a persistently missing chunk can never loop.
 * Otherwise the error propagates to the app error boundary, which shows it with a
 * Reload control.
 */
export const CHUNK_RELOAD_KEY = 'csg-chunk-reload-at'
export const CHUNK_RELOAD_WINDOW_MS = 60_000

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export function shouldReloadForChunkError(storage: StorageLike | null, now = Date.now()): boolean {
  if (!storage) return false
  try {
    const last = Number(storage.getItem(CHUNK_RELOAD_KEY))
    if (Number.isFinite(last) && last > 0 && now - last < CHUNK_RELOAD_WINDOW_MS) return false
    storage.setItem(CHUNK_RELOAD_KEY, String(now))
    // Read back: if storage silently fails to persist, don't risk a loop.
    return storage.getItem(CHUNK_RELOAD_KEY) === String(now)
  } catch {
    return false
  }
}

function sessionStore(win: Window): StorageLike | null {
  try {
    return win.sessionStorage
  } catch {
    return null
  }
}

export function installChunkReload(win: Window = window, reload: () => void = () => win.location.reload()): () => void {
  const onPreloadError = (event: Event) => {
    if (!shouldReloadForChunkError(sessionStore(win))) return
    event.preventDefault()
    reload()
  }
  win.addEventListener('vite:preloadError', onPreloadError)
  return () => win.removeEventListener('vite:preloadError', onPreloadError)
}
