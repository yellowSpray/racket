import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DeleteEventDialog } from '../DeleteEventDialog'
import type { Event } from '@/types/event'

// Mock supabase
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: () => ({
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
  },
}))

const makeEvent = (overrides: Partial<Event> = {}): Event => ({
  id: 'e1',
  club_id: 'c1',
  event_name: 'Tournoi Test',
  start_date: '2026-03-01',
  end_date: '2026-03-02',
  number_of_courts: 2,
  ...overrides,
})

describe('DeleteEventDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    event: makeEvent(),
    onSuccess: vi.fn(),
  }

  it('renders the confirmation title when open', () => {
    render(<DeleteEventDialog {...defaultProps} />)
    expect(screen.getByText('Êtes-vous sûr ?')).toBeInTheDocument()
  })

  it('displays the event name in the description', () => {
    render(<DeleteEventDialog {...defaultProps} />)
    expect(screen.getByText('Tournoi Test')).toBeInTheDocument()
  })

  it('renders cancel and delete buttons', () => {
    render(<DeleteEventDialog {...defaultProps} />)
    expect(screen.getByText('Annuler')).toBeInTheDocument()
    expect(screen.getByText('Supprimer')).toBeInTheDocument()
  })

  it('does not render content when dialog is closed', () => {
    render(<DeleteEventDialog {...defaultProps} open={false} />)
    expect(screen.queryByText('Êtes-vous sûr ?')).not.toBeInTheDocument()
  })

  it('displays the irreversibility warning message', () => {
    render(<DeleteEventDialog {...defaultProps} />)
    expect(screen.getByText(/irréversible/)).toBeInTheDocument()
  })

  it('handles null event gracefully', () => {
    render(<DeleteEventDialog {...defaultProps} event={null} />)
    expect(screen.getByText('Êtes-vous sûr ?')).toBeInTheDocument()
    // Event name should not appear
    expect(screen.queryByText('Tournoi Test')).not.toBeInTheDocument()
  })
})
