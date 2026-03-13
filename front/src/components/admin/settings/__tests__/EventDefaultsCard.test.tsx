import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EventDefaultsCard } from '../EventDefaultsCard'

describe('EventDefaultsCard', () => {
  const defaultProps = {
    defaultStartTime: '19:00',
    defaultEndTime: '23:00',
    defaultNumberOfCourts: 4,
    defaultMatchDuration: 30,
    onSave: vi.fn().mockResolvedValue(true),
  }

  it('renders without crashing', () => {
    render(<EventDefaultsCard {...defaultProps} />)
  })

  it('displays the card title', () => {
    render(<EventDefaultsCard {...defaultProps} />)
    expect(screen.getByText('Événement par défaut')).toBeInTheDocument()
  })

  it('displays all 4 default values', () => {
    render(<EventDefaultsCard {...defaultProps} />)
    expect(screen.getByDisplayValue('19:00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('23:00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('4')).toBeInTheDocument()
    expect(screen.getByDisplayValue('30')).toBeInTheDocument()
  })

  it('renders the edit button', () => {
    render(<EventDefaultsCard {...defaultProps} />)
    expect(screen.getByLabelText('Modifier')).toBeInTheDocument()
  })

  it('all inputs are disabled by default', () => {
    render(<EventDefaultsCard {...defaultProps} />)
    expect(screen.getByLabelText('Heure de début')).toBeDisabled()
    expect(screen.getByLabelText('Heure de fin')).toBeDisabled()
    expect(screen.getByLabelText('Nombre de terrains')).toBeDisabled()
    expect(screen.getByLabelText('Durée de match')).toBeDisabled()
  })

  it('all inputs are enabled after clicking edit', () => {
    render(<EventDefaultsCard {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('Modifier'))
    expect(screen.getByLabelText('Heure de début')).not.toBeDisabled()
    expect(screen.getByLabelText('Heure de fin')).not.toBeDisabled()
    expect(screen.getByLabelText('Nombre de terrains')).not.toBeDisabled()
    expect(screen.getByLabelText('Durée de match')).not.toBeDisabled()
  })

  it('shows next-event warning when editing', () => {
    render(<EventDefaultsCard {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('Modifier'))
    expect(screen.getByText("Les modifications s'appliqueront au prochain événement")).toBeInTheDocument()
  })

  it('calls onSave with all 4 fields on save', async () => {
    const mockSave = vi.fn().mockResolvedValue(true)
    render(<EventDefaultsCard {...defaultProps} onSave={mockSave} />)
    fireEvent.click(screen.getByLabelText('Modifier'))
    fireEvent.click(screen.getByLabelText('Enregistrer'))
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith({
        default_start_time: '19:00',
        default_end_time: '23:00',
        default_number_of_courts: 4,
        default_match_duration: 30,
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

    rerender(<EventDefaultsCard {...defaultProps} defaultStartTime="18:00" defaultNumberOfCourts={6} />)
    expect(screen.getByDisplayValue('18:00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('6')).toBeInTheDocument()
  })
})
