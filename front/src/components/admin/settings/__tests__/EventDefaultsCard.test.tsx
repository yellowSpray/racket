import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EventDefaultsCard } from '../EventDefaultsCard'

describe('EventDefaultsCard', () => {
  const defaultProps = {
    defaultStartTime: '19:00',
    defaultEndTime: '23:00',
    defaultMatchDuration: 30,
    defaultMinPlayers: 3,
    defaultMaxPlayers: 5,
    visitorFee: 10,
    openToVisitors: false,
    autoRenewPlayers: true,
    inviteUrl: '',
    eventName: '',
    onSave: vi.fn().mockResolvedValue(true),
    onToggleVisitors: vi.fn().mockResolvedValue(undefined),
    onToggleAutoRenew: vi.fn().mockResolvedValue(undefined),
  }

  it('renders without crashing', () => {
    render(<EventDefaultsCard {...defaultProps} />)
  })

  it('displays the card title', () => {
    render(<EventDefaultsCard {...defaultProps} />)
    expect(screen.getByText('Événement par défaut')).toBeInTheDocument()
  })

  it('displays default values in inputs', () => {
    render(<EventDefaultsCard {...defaultProps} />)
    expect(screen.getByDisplayValue('19:00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('23:00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('30')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10')).toBeInTheDocument()
  })

  it('displays min/max players in the slider area', () => {
    render(<EventDefaultsCard {...defaultProps} />)
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('Joueurs par groupe par défaut')).toBeInTheDocument()
  })

  it('renders the edit button', () => {
    render(<EventDefaultsCard {...defaultProps} />)
    expect(screen.getByLabelText('Modifier')).toBeInTheDocument()
  })

  it('inputs are disabled by default', () => {
    render(<EventDefaultsCard {...defaultProps} />)
    expect(screen.getByLabelText('Heure de début')).toBeDisabled()
    expect(screen.getByLabelText('Heure de fin')).toBeDisabled()
    expect(screen.getByLabelText('Durée de match')).toBeDisabled()
    expect(screen.getByLabelText('Tarif visiteur')).toBeDisabled()
  })

  it('inputs are enabled after clicking edit', () => {
    render(<EventDefaultsCard {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('Modifier'))
    expect(screen.getByLabelText('Heure de début')).not.toBeDisabled()
    expect(screen.getByLabelText('Heure de fin')).not.toBeDisabled()
    expect(screen.getByLabelText('Durée de match')).not.toBeDisabled()
    expect(screen.getByLabelText('Tarif visiteur')).not.toBeDisabled()
  })

  it('shows next-event warning when editing', () => {
    render(<EventDefaultsCard {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('Modifier'))
    expect(screen.getByText("Les modifications s'appliqueront au prochain événement")).toBeInTheDocument()
  })

  it('calls onSave with all fields on save', async () => {
    const mockSave = vi.fn().mockResolvedValue(true)
    render(<EventDefaultsCard {...defaultProps} onSave={mockSave} />)
    fireEvent.click(screen.getByLabelText('Modifier'))
    fireEvent.click(screen.getByLabelText('Enregistrer'))
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith({
        default_start_time: '19:00',
        default_end_time: '23:00',
        default_match_duration: 30,
        default_min_players_per_group: 3,
        default_max_players_per_group: 5,
        visitor_fee: 10,
      })
    })
  })

  it('exits edit mode after successful save', async () => {
    const mockSave = vi.fn().mockResolvedValue(true)
    render(<EventDefaultsCard {...defaultProps} onSave={mockSave} />)
    fireEvent.click(screen.getByLabelText('Modifier'))
    fireEvent.click(screen.getByLabelText('Enregistrer'))
    await waitFor(() => {
      expect(screen.getByLabelText('Heure de début')).toBeDisabled()
    })
  })

  it('updates when props change', () => {
    const { rerender } = render(<EventDefaultsCard {...defaultProps} />)
    expect(screen.getByDisplayValue('19:00')).toBeInTheDocument()

    rerender(<EventDefaultsCard {...defaultProps} defaultStartTime="18:00" visitorFee={15} />)
    expect(screen.getByDisplayValue('18:00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('15')).toBeInTheDocument()
  })

  it('displays visitors and auto-renew switches', () => {
    render(<EventDefaultsCard {...defaultProps} />)
    expect(screen.getByLabelText('Ouvert aux visiteurs')).toBeInTheDocument()
    expect(screen.getByLabelText('Renouvellement automatique')).toBeInTheDocument()
  })

  it('calls onToggleVisitors when switch is clicked', async () => {
    const mockToggle = vi.fn().mockResolvedValue(undefined)
    render(<EventDefaultsCard {...defaultProps} onToggleVisitors={mockToggle} />)
    fireEvent.click(screen.getByLabelText('Ouvert aux visiteurs'))
    await waitFor(() => {
      expect(mockToggle).toHaveBeenCalledWith(true)
    })
  })
})
