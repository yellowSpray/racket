import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProposedGroups } from '../ProposedGroups'
import type { Group } from '@/types/draw'

const proposedGroups: Group[] = [
    {
        id: 'proposed-g1', event_id: 'e1', group_name: 'Box 1', max_players: 4, created_at: '',
        players: [
            { id: 'p1', first_name: 'Alice', last_name: 'A', phone: '', power_ranking: 10 },
            { id: 'p2', first_name: 'Bob', last_name: 'B', phone: '', power_ranking: 9 },
            { id: 'p3', first_name: 'Charlie', last_name: 'C', phone: '', power_ranking: 8 },
            { id: 'p5', first_name: 'Eve', last_name: 'E', phone: '', power_ranking: 6 },
        ],
    },
    {
        id: 'proposed-g2', event_id: 'e1', group_name: 'Box 2', max_players: 4, created_at: '',
        players: [
            { id: 'p4', first_name: 'Diana', last_name: 'D', phone: '', power_ranking: 7 },
            { id: 'p6', first_name: 'Frank', last_name: 'F', phone: '', power_ranking: 5 },
            { id: 'p7', first_name: 'Grace', last_name: 'G', phone: '', power_ranking: 4 },
            { id: 'p8', first_name: 'Hank', last_name: 'H', phone: '', power_ranking: 3 },
        ],
    },
]

describe('ProposedGroups', () => {
    it('renders group names', () => {
        render(
            <ProposedGroups
                groups={proposedGroups}
                onGroupsChanged={() => {}}
            />
        )
        expect(screen.getByText('Box 1')).toBeInTheDocument()
        expect(screen.getByText('Box 2')).toBeInTheDocument()
    })

    it('renders player names', () => {
        render(
            <ProposedGroups
                groups={proposedGroups}
                onGroupsChanged={() => {}}
            />
        )
        expect(screen.getByText(/Alice/)).toBeInTheDocument()
        expect(screen.getByText(/Eve/)).toBeInTheDocument()
        expect(screen.getByText(/Diana/)).toBeInTheDocument()
    })

    it('shows player count per group', () => {
        render(
            <ProposedGroups
                groups={proposedGroups}
                onGroupsChanged={() => {}}
            />
        )
        // Both groups have 4 players
        const badges = screen.getAllByText('4/4')
        expect(badges).toHaveLength(2)
    })

    it('renders header text', () => {
        render(
            <ProposedGroups
                groups={proposedGroups}
                onGroupsChanged={() => {}}
            />
        )
        expect(screen.getByText(/Nouveaux groupes/)).toBeInTheDocument()
    })

    it('renders empty state when no groups', () => {
        render(
            <ProposedGroups
                groups={[]}
                onGroupsChanged={() => {}}
            />
        )
        expect(screen.getByText(/Aucun groupe/)).toBeInTheDocument()
    })
})
