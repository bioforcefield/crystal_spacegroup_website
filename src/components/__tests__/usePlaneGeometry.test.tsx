// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePlaneGeometry } from '../usePlaneGeometry'
import type { Vec3 } from '../../data/types'

describe('selected / context plane geometry is disposed', () => {
  it('disposes the old geometry when the polygon changes and on unmount', () => {
    const a: Vec3[] = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]]
    const b: Vec3[] = [[0, 0, 0.5], [1, 0, 0.5], [1, 1, 0.5]]
    const { result, rerender, unmount } = renderHook(({ c }) => usePlaneGeometry(c), { initialProps: { c: a } })
    const first = result.current
    const d1 = vi.spyOn(first, 'dispose')
    expect(first.getAttribute('position').count).toBe(6)
    rerender({ c: a })
    expect(result.current).toBe(first)
    expect(d1).not.toHaveBeenCalled()
    rerender({ c: b })
    const second = result.current
    expect(second).not.toBe(first)
    expect(d1).toHaveBeenCalledTimes(1)
    const d2 = vi.spyOn(second, 'dispose')
    unmount()
    expect(d2).toHaveBeenCalledTimes(1)
  })
})
