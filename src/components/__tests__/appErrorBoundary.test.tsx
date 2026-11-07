// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Suspense, lazy } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import AppErrorBoundary from '../AppErrorBoundary'

afterEach(cleanup)

function Boom(): never {
  throw new Error('kaboom')
}

describe('AppErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(<AppErrorBoundary><p>fine</p></AppErrorBoundary>)
    expect(screen.getByText('fine')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows a plain error with a Reload control instead of a blank page', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onReload = vi.fn()
    render(<AppErrorBoundary onReload={onReload}><Boom /></AppErrorBoundary>)
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('Something went wrong loading this page.')
    expect(alert.textContent).toContain('kaboom')
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))
    expect(onReload).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it('catches a rejected lazy chunk import', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const Lazy = lazy(() => Promise.reject(new Error('Failed to fetch dynamically imported module: /assets/x.js')))
    render(
      <AppErrorBoundary onReload={() => {}}>
        <Suspense fallback={<p>Loading…</p>}><Lazy /></Suspense>
      </AppErrorBoundary>,
    )
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Failed to fetch dynamically imported module')
    expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy()
    spy.mockRestore()
  })
})
