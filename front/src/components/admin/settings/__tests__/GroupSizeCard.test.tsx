import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { GroupSizeCard } from '../GroupSizeCard'

describe('GroupSizeCard', () => {
  const defaultProps = {
    defaultMinPlayers: 3,
    defaultMaxPlayers: 5,
    onSave: vi.fn(),
  }

  it('renders without crashing', () => {
    render(<GroupSizeCard {...defaultProps} />)
  })

  it('displays the card title', () => {
    render(<GroupSizeCard {...defaultProps} />)
    expect(screen.getByText('Taille des groupes')).toBeInTheDocument()
  })

  it('displays the card description', () => {
    render(<GroupSizeCard {...defaultProps} />)
    expect(screen.getByText(/Joueurs par groupe par défaut/)).toBeInTheDocument()
  })

  it('renders both min and max values', () => {
    render(<GroupSizeCard {...defaultProps} />)
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('renders min and max labels', () => {
    render(<GroupSizeCard {...defaultProps} />)
    expect(screen.getByText('Min')).toBeInTheDocument()
    expect(screen.getByText('Max')).toBeInTheDocument()
  })

  it('renders the edit button', () => {
    render(<GroupSizeCard {...defaultProps} />)
    expect(screen.getByLabelText('Modifier')).toBeInTheDocument()
  })

  it('sliders are disabled by default', () => {
    render(<GroupSizeCard {...defaultProps} />)
    const sliders = screen.getAllByRole('slider')
    sliders.forEach(slider => {
      expect(slider).toHaveAttribute('data-disabled', '')
    })
  })

  it('sliders are enabled after clicking edit button', () => {
    render(<GroupSizeCard {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('Modifier'))
    const sliders = screen.getAllByRole('slider')
    sliders.forEach(slider => {
      expect(slider).not.toHaveAttribute('data-disabled')
    })
  })

  it('shows next-event warning when in edit mode', () => {
    render(<GroupSizeCard {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('Modifier'))
    expect(screen.getByText("Les modifications s'appliqueront au prochain événement")).toBeInTheDocument()
  })

  it('calls onSave with both min and max values when saving', async () => {
    const mockSave = vi.fn().mockResolvedValue(true)
    render(<GroupSizeCard {...defaultProps} onSave={mockSave} />)
    fireEvent.click(screen.getByLabelText('Modifier'))
    fireEvent.click(screen.getByLabelText('Enregistrer'))
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith({
        default_min_players_per_group: 3,
        default_max_players_per_group: 5,
      })
    })
  })

  it('exits edit mode after successful save', async () => {
    const mockSave = vi.fn().mockResolvedValue(true)
    render(<GroupSizeCard {...defaultProps} onSave={mockSave} />)
    fireEvent.click(screen.getByLabelText('Modifier'))
    fireEvent.click(screen.getByLabelText('Enregistrer'))
    await waitFor(() => {
      const sliders = screen.getAllByRole('slider')
      sliders.forEach(slider => {
        expect(slider).toHaveAttribute('data-disabled', '')
      })
    })
  })

  it('updates displayed values when props change', () => {
    const { rerender } = render(<GroupSizeCard {...defaultProps} />)
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()

    rerender(<GroupSizeCard defaultMinPlayers={4} defaultMaxPlayers={7} onSave={vi.fn()} />)
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })
})
