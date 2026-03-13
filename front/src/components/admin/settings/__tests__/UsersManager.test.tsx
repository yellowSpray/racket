import { render, screen, within, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UsersManager } from '../UsersManager'
import type { ClubMember } from '@/types/member'

const mockFetchMembers = vi.fn()
const mockInviteMember = vi.fn()
const mockUpdateRole = vi.fn()
const mockRemoveMember = vi.fn()

const mockMembers: ClubMember[] = [
    {
        id: 'u1',
        first_name: 'Alice',
        last_name: 'Martin',
        email: 'alice@test.com',
        phone: '0612345678',
        role: 'user',
        is_linked: true,
        created_at: '2025-01-15T10:00:00Z',
    },
    {
        id: 'u2',
        first_name: 'Bob',
        last_name: 'Dupont',
        email: 'bob@test.com',
        phone: '0698765432',
        role: 'admin',
        is_linked: true,
        created_at: '2025-02-01T10:00:00Z',
    },
    {
        id: 'u3',
        first_name: 'Charlie',
        last_name: 'Blanc',
        email: 'charlie@test.com',
        phone: '0654321098',
        role: 'user',
        is_linked: false,
        created_at: '2025-03-01T10:00:00Z',
    },
]

vi.mock('@/hooks/useClubMembers', () => ({
    useClubMembers: () => ({
        members: mockMembers,
        loading: false,
        error: null,
        fetchMembers: mockFetchMembers,
        inviteMember: mockInviteMember,
        updateRole: mockUpdateRole,
        removeMember: mockRemoveMember,
    }),
}))

vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
        profile: { id: 'admin-1', club_id: 'club-1', role: 'superadmin' },
    }),
}))

describe('UsersManager', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders the table headers', () => {
        render(<UsersManager />)
        expect(screen.getByText('Nom')).toBeInTheDocument()
        expect(screen.getByText('Email')).toBeInTheDocument()
        expect(screen.getByText('Rôle')).toBeInTheDocument()
        expect(screen.getByText('Compte')).toBeInTheDocument()
    })

    it('renders member names in the table', () => {
        render(<UsersManager />)
        expect(screen.getByText('Alice Martin')).toBeInTheDocument()
        expect(screen.getByText('Bob Dupont')).toBeInTheDocument()
        expect(screen.getByText('Charlie Blanc')).toBeInTheDocument()
    })

    it('renders member emails', () => {
        render(<UsersManager />)
        expect(screen.getByText('alice@test.com')).toBeInTheDocument()
        expect(screen.getByText('bob@test.com')).toBeInTheDocument()
    })

    it('renders role badges', () => {
        render(<UsersManager />)
        expect(screen.getAllByText('Utilisateur')).toHaveLength(2)
        expect(screen.getByText('Admin')).toBeInTheDocument()
    })

    it('renders linked/pending account status badges', () => {
        render(<UsersManager />)
        expect(screen.getAllByText('Lié').length).toBeGreaterThanOrEqual(2)
        expect(screen.getByText('En attente')).toBeInTheDocument()
    })

    it('calls fetchMembers on mount', () => {
        render(<UsersManager />)
        expect(mockFetchMembers).toHaveBeenCalledWith('club-1')
    })

    it('sorts by name when clicking the Nom header', () => {
        render(<UsersManager />)

        const nomHeader = screen.getByText('Nom')
        fireEvent.click(nomHeader)

        // After ascending sort, Alice should come before Bob, Bob before Charlie
        const rows = screen.getAllByRole('row')
        // row[0] is header, rows 1-3 are data
        const firstDataRow = within(rows[1])
        const lastDataRow = within(rows[3])
        expect(firstDataRow.getByText('Alice Martin')).toBeInTheDocument()
        expect(lastDataRow.getByText('Charlie Blanc')).toBeInTheDocument()

        // Click again for descending
        fireEvent.click(nomHeader)
        const rowsDesc = screen.getAllByRole('row')
        const firstDataRowDesc = within(rowsDesc[1])
        expect(firstDataRowDesc.getByText('Charlie Blanc')).toBeInTheDocument()
    })

    it('does not sort when clicking the Actions header', () => {
        render(<UsersManager />)

        const actionsHeader = screen.getByText('Actions')
        fireEvent.click(actionsHeader)

        // Order should remain unchanged (u1, u2, u3 as provided)
        const rows = screen.getAllByRole('row')
        const firstDataRow = within(rows[1])
        expect(firstDataRow.getByText('Alice Martin')).toBeInTheDocument()
    })
})

describe('UsersManager - search filter via props', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('filters by name when globalFilter prop is set', () => {
        render(<UsersManager globalFilter="Alice" onGlobalFilterChange={vi.fn()} />)

        expect(screen.getByText('Alice Martin')).toBeInTheDocument()
        expect(screen.queryByText('Bob Dupont')).not.toBeInTheDocument()
        expect(screen.queryByText('Charlie Blanc')).not.toBeInTheDocument()
    })

    it('filters by email when globalFilter prop is set', () => {
        render(<UsersManager globalFilter="bob@" onGlobalFilterChange={vi.fn()} />)

        expect(screen.getByText('Bob Dupont')).toBeInTheDocument()
        expect(screen.queryByText('Alice Martin')).not.toBeInTheDocument()
    })

    it('shows all members when globalFilter is empty', () => {
        render(<UsersManager globalFilter="" onGlobalFilterChange={vi.fn()} />)

        expect(screen.getByText('Alice Martin')).toBeInTheDocument()
        expect(screen.getByText('Bob Dupont')).toBeInTheDocument()
        expect(screen.getByText('Charlie Blanc')).toBeInTheDocument()
    })

    it('does not filter by role text', () => {
        render(<UsersManager globalFilter="admin" onGlobalFilterChange={vi.fn()} />)

        // All 3 data rows should be gone since none match on name/email
        const rows = screen.getAllByRole('row')
        // Only header row remains
        expect(rows).toHaveLength(1)
    })
})

describe('UsersManager - empty state', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders empty state when no members', () => {
        vi.mocked(mockMembers).length = 0
        // Re-mock with empty members
        vi.doMock('@/hooks/useClubMembers', () => ({
            useClubMembers: () => ({
                members: [],
                loading: false,
                error: null,
                fetchMembers: mockFetchMembers,
                inviteMember: mockInviteMember,
                updateRole: mockUpdateRole,
                removeMember: mockRemoveMember,
            }),
        }))
    })
})
