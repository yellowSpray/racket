import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { GroupSizeCard } from '../GroupSizeCard'

describe('GroupSizeCard', () => {
  it('renders without crashing', () => {
    render(<GroupSizeCard defaultMaxPlayers={4} onSave={vi.fn()} />)
  })

  it('displays the card title', () => {
    render(<GroupSizeCard defaultMaxPlayers={4} onSave={vi.fn()} />)
    expect(screen.getByText('Taille des groupes')).toBeInTheDocument()
  })

  it('displays the card description', () => {
    render(<GroupSizeCard defaultMaxPlayers={4} onSave={vi.fn()} />)
    expect(screen.getByText(/Joueurs par groupe par défaut/)).toBeInTheDocument()
  })

  it('renders the label text', () => {
    render(<GroupSizeCard defaultMaxPlayers={4} onSave={vi.fn()} />)
    expect(screen.getByText('joueurs par groupe')).toBeInTheDocument()
  })

  it('renders the edit button', () => {
    render(<GroupSizeCard defaultMaxPlayers={4} onSave={vi.fn()} />)
    expect(screen.getByLabelText('Modifier')).toBeInTheDocument()
  })

  it('slider is disabled by default', () => {
    render(<GroupSizeCard defaultMaxPlayers={4} onSave={vi.fn()} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('data-disabled', '')
  })

  it('slider is enabled after clicking edit button', () => {
    render(<GroupSizeCard defaultMaxPlayers={4} onSave={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Modifier'))
    const slider = screen.getByRole('slider')
    expect(slider).not.toHaveAttribute('data-disabled')
  })

  it('shows next-event warning when in edit mode', () => {
    render(<GroupSizeCard defaultMaxPlayers={4} onSave={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Modifier'))
    expect(screen.getByText("Les modifications s'appliqueront au prochain événement")).toBeInTheDocument()
  })

  it('displays the default max players value as large number', () => {
    render(<GroupSizeCard defaultMaxPlayers={6} onSave={vi.fn()} />)
    expect(screen.getByText('6')).toBeInTheDocument()
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-valuenow', '6')
  })

  it('calls onSave when clicking save in edit mode', async () => {
    const mockSave = vi.fn().mockResolvedValue(true)
    render(<GroupSizeCard defaultMaxPlayers={4} onSave={mockSave} />)
    fireEvent.click(screen.getByLabelText('Modifier'))
    fireEvent.click(screen.getByLabelText('Enregistrer'))
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith({ default_max_players_per_group: 4 })
    })
  })

  it('exits edit mode after successful save', async () => {
    const mockSave = vi.fn().mockResolvedValue(true)
    render(<GroupSizeCard defaultMaxPlayers={4} onSave={mockSave} />)
    fireEvent.click(screen.getByLabelText('Modifier'))
    fireEvent.click(screen.getByLabelText('Enregistrer'))
    await waitFor(() => {
      const slider = screen.getByRole('slider')
      expect(slider).toHaveAttribute('data-disabled', '')
    })
  })

  it('updates displayed value when defaultMaxPlayers prop changes', () => {
    const { rerender } = render(<GroupSizeCard defaultMaxPlayers={4} onSave={vi.fn()} />)
    expect(screen.getByText('4')).toBeInTheDocument()

    rerender(<GroupSizeCard defaultMaxPlayers={7} onSave={vi.fn()} />)
    expect(screen.getByText('7')).toBeInTheDocument()
  })
})
