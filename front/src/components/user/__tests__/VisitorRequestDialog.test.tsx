import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VisitorRequestDialog } from '../VisitorRequestDialog'
import type { DiscoverableEvent } from '@/types/visitor'

const makeEvent = (overrides: Partial<DiscoverableEvent> = {}): DiscoverableEvent => ({
  id: 'evt-1',
  event_name: 'Tournoi de Printemps',
  start_date: '2026-04-01',
  end_date: '2026-04-05',
  open_to_visitors: true,
  invite_token: 'token-abc',
  club_id: 'club-1',
  clubs: { club_name: 'Club Squash Paris', visitor_fee: 15 },
  ...overrides,
})

describe('VisitorRequestDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    event: makeEvent(),
    onSubmit: vi.fn().mockResolvedValue({ success: true }),
    loading: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dialog with event info when open', () => {
    render(<VisitorRequestDialog {...defaultProps} />)
    expect(screen.getByText('Demander à rejoindre')).toBeInTheDocument()
    expect(screen.getByText(/Tournoi de Printemps/)).toBeInTheDocument()
    expect(screen.getByText(/Club Squash Paris/)).toBeInTheDocument()
  })

  it('does not render content when open is false', () => {
    render(<VisitorRequestDialog {...defaultProps} open={false} />)
    expect(screen.queryByText('Demander à rejoindre')).not.toBeInTheDocument()
  })

  it('shows event name and club name in description', () => {
    render(<VisitorRequestDialog {...defaultProps} />)
    expect(screen.getByText(/Tournoi de Printemps/)).toBeInTheDocument()
    expect(screen.getByText(/Club Squash Paris/)).toBeInTheDocument()
  })

  it('shows visitor fee when greater than 0', () => {
    render(<VisitorRequestDialog {...defaultProps} />)
    expect(screen.getByText(/15/)).toBeInTheDocument()
  })

  it('does not show visitor fee when equal to 0', () => {
    const event = makeEvent({ clubs: { club_name: 'Club Gratuit', visitor_fee: 0 } })
    render(<VisitorRequestDialog {...defaultProps} event={event} />)
    expect(screen.queryByText(/Frais visiteur/)).not.toBeInTheDocument()
  })

  it('shows formatted dates', () => {
    render(<VisitorRequestDialog {...defaultProps} />)
    const formattedStart = new Date('2026-04-01').toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    expect(screen.getByText(new RegExp(formattedStart))).toBeInTheDocument()
  })

  it('calls onSubmit with event id and message on confirm', async () => {
    render(<VisitorRequestDialog {...defaultProps} />)

    const textarea = screen.getByPlaceholderText("Message pour l'organisateur (optionnel)")
    fireEvent.change(textarea, { target: { value: 'Bonjour, je souhaite participer' } })

    const submitButton = screen.getByText('Envoyer la demande')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith('evt-1', 'Bonjour, je souhaite participer')
    })
  })

  it('calls onSubmit with undefined message when textarea is empty', async () => {
    render(<VisitorRequestDialog {...defaultProps} />)

    const submitButton = screen.getByText('Envoyer la demande')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith('evt-1', undefined)
    })
  })

  it('calls onOpenChange(false) on cancel', () => {
    render(<VisitorRequestDialog {...defaultProps} />)

    const cancelButton = screen.getByText('Annuler')
    fireEvent.click(cancelButton)

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows error message when onSubmit returns error', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ success: false, error: 'Une erreur est survenue' })
    render(<VisitorRequestDialog {...defaultProps} onSubmit={onSubmit} />)

    const submitButton = screen.getByText('Envoyer la demande')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Une erreur est survenue')).toBeInTheDocument()
    })
  })

  it('disables confirm button when loading', () => {
    render(<VisitorRequestDialog {...defaultProps} loading={true} />)
    const submitButton = screen.getByText('Envoyer la demande')
    expect(submitButton).toBeDisabled()
  })

  it('handles null event gracefully', () => {
    render(<VisitorRequestDialog {...defaultProps} event={null} />)
    expect(screen.queryByText('Tournoi de Printemps')).not.toBeInTheDocument()
  })
})
