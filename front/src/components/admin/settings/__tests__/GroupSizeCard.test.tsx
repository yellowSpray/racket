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
    expect(screen.getByText(/Nombre de joueurs par défaut/)).toBeInTheDocument()
  })

  it('renders the input label', () => {
    render(<GroupSizeCard defaultMaxPlayers={4} onSave={vi.fn()} />)
    expect(screen.getByText('Joueurs par groupe')).toBeInTheDocument()
  })

  it('renders the save button', () => {
    render(<GroupSizeCard defaultMaxPlayers={4} onSave={vi.fn()} />)
    expect(screen.getByText('Enregistrer')).toBeInTheDocument()
  })

  it('displays the default max players value', () => {
    render(<GroupSizeCard defaultMaxPlayers={6} onSave={vi.fn()} />)
    const input = screen.getByLabelText('Joueurs par groupe') as HTMLInputElement
    expect(input.value).toBe('6')
  })

  it('updates value on input change', () => {
    render(<GroupSizeCard defaultMaxPlayers={4} onSave={vi.fn()} />)
    const input = screen.getByLabelText('Joueurs par groupe') as HTMLInputElement
    fireEvent.change(input, { target: { value: '8' } })
    expect(input.value).toBe('8')
  })

  it('calls onSave with correct data on submit', async () => {
    const mockSave = vi.fn().mockResolvedValue(true)
    render(<GroupSizeCard defaultMaxPlayers={4} onSave={mockSave} />)
    fireEvent.submit(screen.getByText('Enregistrer').closest('form')!)
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith({ default_max_players_per_group: 4 })
    })
  })

  it('shows "Enregistré" after successful save', async () => {
    const mockSave = vi.fn().mockResolvedValue(true)
    render(<GroupSizeCard defaultMaxPlayers={4} onSave={mockSave} />)
    fireEvent.submit(screen.getByText('Enregistrer').closest('form')!)
    await waitFor(() => {
      expect(screen.getByText('Enregistré')).toBeInTheDocument()
    })
  })

  it('shows validation error when value is less than 2', async () => {
    render(<GroupSizeCard defaultMaxPlayers={4} onSave={vi.fn()} />)
    const input = screen.getByLabelText('Joueurs par groupe') as HTMLInputElement
    fireEvent.change(input, { target: { value: '1' } })
    fireEvent.submit(screen.getByText('Enregistrer').closest('form')!)
    await waitFor(() => {
      expect(screen.getByText('Le nombre doit être entre 2 et 10')).toBeInTheDocument()
    })
  })

  it('shows validation error when value is greater than 10', async () => {
    render(<GroupSizeCard defaultMaxPlayers={4} onSave={vi.fn()} />)
    const input = screen.getByLabelText('Joueurs par groupe') as HTMLInputElement
    fireEvent.change(input, { target: { value: '11' } })
    fireEvent.submit(screen.getByText('Enregistrer').closest('form')!)
    await waitFor(() => {
      expect(screen.getByText('Le nombre doit être entre 2 et 10')).toBeInTheDocument()
    })
  })

  it('does not call onSave when validation fails', async () => {
    const mockSave = vi.fn().mockResolvedValue(true)
    render(<GroupSizeCard defaultMaxPlayers={4} onSave={mockSave} />)
    const input = screen.getByLabelText('Joueurs par groupe') as HTMLInputElement
    fireEvent.change(input, { target: { value: '1' } })
    fireEvent.submit(screen.getByText('Enregistrer').closest('form')!)
    await waitFor(() => {
      expect(mockSave).not.toHaveBeenCalled()
    })
  })

  it('updates displayed value when defaultMaxPlayers prop changes', () => {
    const { rerender } = render(<GroupSizeCard defaultMaxPlayers={4} onSave={vi.fn()} />)
    const input = screen.getByLabelText('Joueurs par groupe') as HTMLInputElement
    expect(input.value).toBe('4')

    rerender(<GroupSizeCard defaultMaxPlayers={7} onSave={vi.fn()} />)
    expect(input.value).toBe('7')
  })
})
