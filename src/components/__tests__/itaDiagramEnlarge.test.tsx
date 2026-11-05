// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import OperatorPanel from '../OperatorPanel'
import { getDemo } from '../../data/registry'

afterEach(() => {
  document.body.style.overflow = ''
  cleanup()
})

function renderPanel() {
  const demo = getDemo(14)!
  return render(
    <MemoryRouter>
      <OperatorPanel
        demo={demo}
        selectedIndex={1}
        onSelect={() => {}}
        placementMode="nearest"
      />
    </MemoryRouter>,
  )
}

describe('ITA Vol. A diagram enlarge', () => {
  it('keeps the inline diagram at the default size and opens a dialog', () => {
    renderPanel()
    const inline = screen.getByAltText(
      /International Tables Vol\. A diagram for space group 14/,
    )
    expect(inline.getAttribute('width')).toBe('280')
    expect(inline.getAttribute('height')).toBe('280')
    expect(screen.queryByTestId('ita-modal')).toBeNull()

    fireEvent.click(screen.getByTestId('ita-enlarge'))
    const modal = screen.getByTestId('ita-modal')
    expect(modal.getAttribute('role')).toBe('dialog')
    expect(modal.getAttribute('aria-modal')).toBe('true')
    expect(document.body.style.overflow).toBe('hidden')
    // Full-resolution copy lives on the white plate (no fixed 280 attrs).
    const enlarged = screen.getByAltText(/enlarged/)
    expect(enlarged.getAttribute('src')).toBe(inline.getAttribute('src'))
    expect(enlarged.getAttribute('width')).toBeNull()
    expect(enlarged.closest('.ita-modal-plate')).not.toBeNull()
  })

  it('closes on Close and Escape and restores focus to Enlarge', async () => {
    renderPanel()
    const enlarge = screen.getByTestId('ita-enlarge')
    fireEvent.click(enlarge)
    expect(screen.getByTestId('ita-modal')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByTestId('ita-close'))

    fireEvent.click(screen.getByTestId('ita-close'))
    expect(screen.queryByTestId('ita-modal')).toBeNull()
    expect(document.body.style.overflow).toBe('')
    await waitFor(() => expect(document.activeElement).toBe(enlarge))

    fireEvent.click(enlarge)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByTestId('ita-modal')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(enlarge))
  })

  it('restores Enlarge focus after backdrop pointer sequence steals it', async () => {
    renderPanel()
    const enlarge = screen.getByTestId('ita-enlarge')
    fireEvent.click(enlarge)
    const backdrop = screen.getByTestId('ita-modal-backdrop')

    // Native order: mousedown closes/unmounts, then mouseup/click land on whatever
    // is underneath and leave document.activeElement on <body>.
    fireEvent.mouseDown(backdrop)
    expect(screen.queryByTestId('ita-modal')).toBeNull()
    if (!document.body.hasAttribute('tabindex')) {
      document.body.tabIndex = -1
    }
    document.body.focus()
    fireEvent.mouseUp(document.body)
    fireEvent.click(document.body)
    expect(document.activeElement).toBe(document.body)

    await waitFor(() => expect(document.activeElement).toBe(enlarge))
    expect(document.body.style.overflow).toBe('')
  })
})
