import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlayerMovementsFeed } from '../PlayerMovementsFeed'
import type { PlayerMovement } from '@/hooks/usePlayerMovements'

vi.mock('@/lib/formatRelativeTime', () => ({
    formatRelativeTime: vi.fn((date: string) => `mock-${date}`),
}))

function makeMovement(overrides: Partial<PlayerMovement> & { profileId: string }): PlayerMovement {
    return {
        firstName: 'Alice',
        lastName: 'Martin',
        status: 'active',
        updatedAt: '2026-03-08T10:00:00Z',
        ...overrides,
    }
}

describe('PlayerMovementsFeed', () => {
    it('should show loading state', () => {
        render(<PlayerMovementsFeed movements={[]} loading={true} />)
        expect(screen.getByText('Chargement...')).toBeInTheDocument()
    })

    it('should show empty state when no movements', () => {
        render(<PlayerMovementsFeed movements={[]} loading={false} />)
        expect(screen.getByText('Aucun mouvement récent')).toBeInTheDocument()
    })

    it('should display player names', () => {
        const movements = [
            makeMovement({ profileId: 'p1', firstName: 'Alice', lastName: 'Martin', status: 'active' }),
            makeMovement({ profileId: 'p2', firstName: 'Bob', lastName: 'Dupont', status: 'inactive' }),
        ]

        render(<PlayerMovementsFeed movements={movements} loading={false} />)

        expect(screen.getByText('Alice Martin')).toBeInTheDocument()
        expect(screen.getByText('Bob Dupont')).toBeInTheDocument()
    })

    it('should show "Inscrit" badge for active status', () => {
        const movements = [makeMovement({ profileId: 'p1', status: 'active' })]
        render(<PlayerMovementsFeed movements={movements} loading={false} />)
        expect(screen.getByText('Inscrit')).toBeInTheDocument()
    })

    it('should show "Désinscrit" badge for inactive status', () => {
        const movements = [makeMovement({ profileId: 'p1', status: 'inactive' })]
        render(<PlayerMovementsFeed movements={movements} loading={false} />)
        expect(screen.getByText('Désinscrit')).toBeInTheDocument()
    })

    it('should display relative time for each movement', () => {
        const movements = [makeMovement({ profileId: 'p1', updatedAt: '2026-03-08T10:00:00Z' })]
        render(<PlayerMovementsFeed movements={movements} loading={false} />)
        expect(screen.getByText('mock-2026-03-08T10:00:00Z')).toBeInTheDocument()
    })
})
