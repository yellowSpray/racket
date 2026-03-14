import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { PlayerMovement } from '@/hooks/usePlayerMovements'

vi.mock('@/lib/formatRelativeTime', () => ({
    formatRelativeTime: vi.fn((date: string) => `mock-${date}`),
}))

let mockMovements: PlayerMovement[] = []
let mockLoading = false

vi.mock('@/hooks/usePlayerMovements', () => ({
    usePlayerMovements: () => ({
        movements: mockMovements,
        loading: mockLoading,
        error: null,
    }),
}))

vi.mock('@/components/ui/carousel', () => ({
    Carousel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CarouselContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CarouselItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

import { PlayerMovementsCard } from '../PlayerMovementsCard'

function makeMovement(overrides: Partial<PlayerMovement> & { profileId: string }): PlayerMovement {
    return {
        firstName: 'Alice',
        lastName: 'Martin',
        status: 'active',
        updatedAt: '2026-03-08T10:00:00Z',
        ...overrides,
    }
}

describe('PlayerMovementsCard', () => {
    beforeEach(() => {
        mockMovements = []
        mockLoading = false
    })

    it('should show title "Inscrits" by default', () => {
        render(<PlayerMovementsCard eventId="e1" clubId="c1" />)
        expect(screen.getByText('Inscrits')).toBeInTheDocument()
    })

    it('should show loading state', () => {
        mockLoading = true
        render(<PlayerMovementsCard eventId="e1" clubId="c1" />)
        expect(screen.getAllByText('Chargement...').length).toBeGreaterThanOrEqual(1)
    })

    it('should show empty state when no movements', () => {
        render(<PlayerMovementsCard eventId="e1" clubId="c1" />)
        expect(screen.getAllByText('Aucun mouvement récent').length).toBeGreaterThanOrEqual(1)
    })

    it('should display player names', () => {
        mockMovements = [
            makeMovement({ profileId: 'p1', firstName: 'Alice', lastName: 'Martin', status: 'active' }),
            makeMovement({ profileId: 'p2', firstName: 'Bob', lastName: 'Dupont', status: 'inactive' }),
        ]

        render(<PlayerMovementsCard eventId="e1" clubId="c1" />)

        expect(screen.getByText('Alice Martin')).toBeInTheDocument()
        expect(screen.getByText('Bob Dupont')).toBeInTheDocument()
    })

    it('should show "Inscrit" badge for active status', () => {
        mockMovements = [makeMovement({ profileId: 'p1', status: 'active' })]
        render(<PlayerMovementsCard eventId="e1" clubId="c1" />)
        expect(screen.getByText('Inscrit')).toBeInTheDocument()
    })

    it('should show "Désinscrit" badge for inactive status', () => {
        mockMovements = [makeMovement({ profileId: 'p1', status: 'inactive' })]
        render(<PlayerMovementsCard eventId="e1" clubId="c1" />)
        expect(screen.getByText('Désinscrit')).toBeInTheDocument()
    })

    it('should display relative time for each movement', () => {
        mockMovements = [makeMovement({ profileId: 'p1', updatedAt: '2026-03-08T10:00:00Z' })]
        render(<PlayerMovementsCard eventId="e1" clubId="c1" />)
        expect(screen.getByText('mock-2026-03-08T10:00:00Z')).toBeInTheDocument()
    })

    it('should show navigation arrows', () => {
        render(<PlayerMovementsCard eventId="e1" clubId="c1" />)
        expect(screen.getByLabelText('Slide précédent')).toBeInTheDocument()
        expect(screen.getByLabelText('Slide suivant')).toBeInTheDocument()
    })
})
