// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import CifEmptyState from '../CifEmptyState'

afterEach(cleanup)

describe('CifEmptyState', () => {
  it('offers the three examples and reports which was chosen', () => {
    const onOpen = vi.fn()
    render(<CifEmptyState onOpenExample={onOpen} />)
    expect(screen.getByTestId('cif-welcome').textContent).toMatch(/PDB ID, a COD id or a file/)
    fireEvent.click(screen.getByRole('button', { name: /4HHB/ }))
    fireEvent.click(screen.getByRole('button', { name: /1BNA/ }))
    fireEvent.click(screen.getByRole('button', { name: /Acetic acid/ }))
    expect(onOpen.mock.calls.map((c) => c[0])).toEqual(['pdb:4hhb', 'pdb:1bna', 'sample'])
  })
  it('hides example buttons without a handler and shows a spinner while busy', () => {
    const { rerender } = render(<CifEmptyState />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    rerender(<CifEmptyState busy />)
    expect(screen.getByRole('status').textContent).toMatch(/Loading structure/)
    expect(screen.queryByTestId('cif-welcome')).toBeNull()
  })
})
