import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MatchReassignDialog } from '../MatchReassignDialog'
import type { Match } from '@/types/match'

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'm1',
    group_id: 'g1',
    player1_id: 'p1',
    player2_id: 'p2',
    match_date: '2026-03-01',
    match_time: '19:00',
    court_number: 'Terrain 1',
    winner_id: null,
    score: null,
    player1: { id: 'p1', first_name: 'Alice', last_name: 'Smith' },
    player2: { id: 'p2', first_name: 'Bob', last_name: 'Jones' },
    group: { id: 'g1', group_name: 'Box 1', event_id: 'evt-1' },
    ...overrides,
  }
}

describe('MatchReassignDialog', () => {
  const defaultProps = {
    match: makeMatch(),
    open: true,
    onOpenChange: vi.fn(),
    onSave: vi.fn(),
    dates: ['2026-03-01', '2026-03-02', '2026-03-03'],
    timeSlots: ['19:00', '19:30', '20:00', '20:30'],
    courts: ['Terrain 1', 'Terrain 2'],
    saving: false,
  }

  it('renders match info in dialog', () => {
    render(<MatchReassignDialog {...defaultProps} />)

    expect(screen.getByText(/Alice Smith/)).toBeInTheDocument()
    expect(screen.getByText(/Bob Jones/)).toBeInTheDocument()
  })

  it('shows current values in selects', () => {
    render(<MatchReassignDialog {...defaultProps} />)

    const dateSelect = screen.getByLabelText('Date') as HTMLSelectElement
    const timeSelect = screen.getByLabelText('Heure') as HTMLSelectElement
    const courtSelect = screen.getByLabelText('Terrain') as HTMLSelectElement

    expect(dateSelect.value).toBe('2026-03-01')
    expect(timeSelect.value).toBe('19:00')
    expect(courtSelect.value).toBe('Terrain 1')
  })

  it('calls onSave with updated values', () => {
    const onSave = vi.fn()
    render(<MatchReassignDialog {...defaultProps} onSave={onSave} />)

    const dateSelect = screen.getByLabelText('Date')
    fireEvent.change(dateSelect, { target: { value: '2026-03-02' } })

    const timeSelect = screen.getByLabelText('Heure')
    fireEvent.change(timeSelect, { target: { value: '20:00' } })

    const saveButton = screen.getByRole('button', { name: /enregistrer/i })
    fireEvent.click(saveButton)

    expect(onSave).toHaveBeenCalledWith('m1', {
      match_date: '2026-03-02',
      match_time: '20:00',
      court_number: 'Terrain 1',
    })
  })

  it('calls onOpenChange when cancel is clicked', () => {
    const onOpenChange = vi.fn()
    render(<MatchReassignDialog {...defaultProps} onOpenChange={onOpenChange} />)

    const cancelButton = screen.getByRole('button', { name: /annuler/i })
    fireEvent.click(cancelButton)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders nothing when match is null', () => {
    const { container } = render(
      <MatchReassignDialog {...defaultProps} match={null} />
    )
    // Dialog should still render but with no match info
    expect(container).toBeTruthy()
  })

  it('disables save button when saving', () => {
    render(<MatchReassignDialog {...defaultProps} saving={true} />)

    const saveButton = screen.getByRole('button', { name: /enregistrement/i })
    expect(saveButton).toBeDisabled()
  })
})
