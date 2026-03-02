import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EventSelector } from '../EventSelector'

const mockUseEvent = vi.fn()
vi.mock('@/contexts/EventContext', () => ({
  useEvent: () => mockUseEvent(),
}))

describe('EventSelector', () => {
  it('renders loading state when loading is true', () => {
    mockUseEvent.mockReturnValue({
      currentEvent: null,
      events: [],
      loading: true,
      setCurrentEvent: vi.fn(),
    })
    render(<EventSelector />)
    expect(screen.getByText('Chargement')).toBeInTheDocument()
  })

  it('renders empty state when no events exist', () => {
    mockUseEvent.mockReturnValue({
      currentEvent: null,
      events: [],
      loading: false,
      setCurrentEvent: vi.fn(),
    })
    render(<EventSelector />)
    expect(screen.getByText('Aucun événement')).toBeInTheDocument()
  })

  it('renders placeholder when events exist but none selected', () => {
    mockUseEvent.mockReturnValue({
      currentEvent: null,
      events: [{ id: 'e1', event_name: 'Tournoi A' }],
      loading: false,
      setCurrentEvent: vi.fn(),
    })
    render(<EventSelector />)
    expect(screen.getByText('Sélectionner un événement')).toBeInTheDocument()
  })

  it('renders the select trigger without crashing when events exist', () => {
    mockUseEvent.mockReturnValue({
      currentEvent: { id: 'e1', event_name: 'Tournoi A' },
      events: [
        { id: 'e1', event_name: 'Tournoi A' },
        { id: 'e2', event_name: 'Tournoi B' },
      ],
      loading: false,
      setCurrentEvent: vi.fn(),
    })
    render(<EventSelector />)
    // The trigger should show the current event name or a value
    // The select is rendered as a combobox
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('disables the select when loading', () => {
    mockUseEvent.mockReturnValue({
      currentEvent: null,
      events: [],
      loading: true,
      setCurrentEvent: vi.fn(),
    })
    render(<EventSelector />)
    const trigger = screen.getByRole('combobox')
    expect(trigger).toBeDisabled()
  })

  it('disables the select when no events', () => {
    mockUseEvent.mockReturnValue({
      currentEvent: null,
      events: [],
      loading: false,
      setCurrentEvent: vi.fn(),
    })
    render(<EventSelector />)
    const trigger = screen.getByRole('combobox')
    expect(trigger).toBeDisabled()
  })
})
