import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ClubCourtsCard } from '../ClubCourtsCard'
import type { ClubCourt } from '@/types/settings'

describe('ClubCourtsCard', () => {
    const mockCourts: ClubCourt[] = [
        { id: 'ct1', club_id: 'c1', court_name: 'Terrain 1', available_from: '19:00', available_to: '23:00', sort_order: 0 },
        { id: 'ct2', club_id: 'c1', court_name: 'Terrain 2', available_from: '19:00', available_to: '23:00', sort_order: 1 },
    ]

    const defaultProps = {
        courts: mockCourts,
        loading: false,
        error: null as string | null,
        defaultNumberOfCourts: 4,
        defaultStartTime: '19:00',
        defaultEndTime: '23:00',
        onAdd: vi.fn().mockResolvedValue(true),
        onUpdate: vi.fn().mockResolvedValue(true),
        onRemove: vi.fn().mockResolvedValue(true),
        onInit: vi.fn().mockResolvedValue(true),
    }

    it('renders without crashing', () => {
        render(<ClubCourtsCard {...defaultProps} />)
    })

    it('displays the card title', () => {
        render(<ClubCourtsCard {...defaultProps} />)
        expect(screen.getByText('Terrains du club')).toBeInTheDocument()
    })

    it('displays court rows in the table', () => {
        render(<ClubCourtsCard {...defaultProps} />)
        expect(screen.getByDisplayValue('Terrain 1')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Terrain 2')).toBeInTheDocument()
    })

    it('shows empty state when no courts', () => {
        render(<ClubCourtsCard {...defaultProps} courts={[]} />)
        expect(screen.getByText('Aucun terrain configuré')).toBeInTheDocument()
    })

    it('shows init button in empty state with correct count', () => {
        render(<ClubCourtsCard {...defaultProps} courts={[]} />)
        expect(screen.getByText(/Initialiser 4 terrains/)).toBeInTheDocument()
    })

    it('calls onInit when clicking init button', async () => {
        const mockInit = vi.fn().mockResolvedValue(true)
        render(<ClubCourtsCard {...defaultProps} courts={[]} onInit={mockInit} />)

        fireEvent.click(screen.getByText(/Initialiser 4 terrains/))

        await waitFor(() => {
            expect(mockInit).toHaveBeenCalledWith(4, '19:00', '23:00')
        })
    })

    it('shows add form when clicking add button', () => {
        render(<ClubCourtsCard {...defaultProps} courts={[]} />)
        fireEvent.click(screen.getByText('Ajouter manuellement'))
        expect(screen.getByLabelText('Nom')).toBeInTheDocument()
    })

    it('calls onAdd when submitting form', async () => {
        const mockAdd = vi.fn().mockResolvedValue(true)
        render(<ClubCourtsCard {...defaultProps} courts={[]} onAdd={mockAdd} />)

        fireEvent.click(screen.getByText('Ajouter manuellement'))
        fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Terrain A' } })
        fireEvent.submit(screen.getByTestId('add-court-form'))

        await waitFor(() => {
            expect(mockAdd).toHaveBeenCalledWith({
                court_name: 'Terrain A',
                available_from: '19:00',
                available_to: '23:00',
            })
        })
    })

    it('calls onRemove when clicking delete button', async () => {
        const mockRemove = vi.fn().mockResolvedValue(true)
        render(<ClubCourtsCard {...defaultProps} onRemove={mockRemove} />)

        const deleteButtons = screen.getAllByLabelText('Supprimer le terrain')
        fireEvent.click(deleteButtons[0])

        await waitFor(() => {
            expect(mockRemove).toHaveBeenCalledWith('ct1')
        })
    })

    it('shows error message when error is set', () => {
        render(<ClubCourtsCard {...defaultProps} error="Une erreur" />)
        expect(screen.getByText('Une erreur')).toBeInTheDocument()
    })

    it('shows add button when courts exist', () => {
        render(<ClubCourtsCard {...defaultProps} />)
        expect(screen.getByText('Ajouter un terrain')).toBeInTheDocument()
    })
})
