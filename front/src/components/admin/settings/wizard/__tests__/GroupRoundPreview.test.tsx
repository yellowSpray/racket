import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { GroupRoundPreview } from '../GroupRoundPreview'
import type { EventRound } from '@/types/event'
import type { Group } from '@/types/draw'

vi.mock('@/components/admin/draws/DrawTable', () => ({
    DrawTable: ({ group }: { group: Group }) => <div data-testid="draw-table">{group.group_name}</div>,
}))

const round = {
    id: 'r1', event_id: 'e1', round_number: 2,
    start_date: '2026-06-15', end_date: '2026-07-13',
    number_of_courts: 3, status: 'upcoming' as const,
    playing_dates: ['2026-06-15', '2026-06-22'],
}

function group(id: string, name: string): Group {
    return {
        id, round_id: 'r1', group_name: name, max_players: 6, created_at: '',
        players: Array.from({ length: 6 }, (_, i) => ({
            id: `${id}-p${i}`, first_name: `J${i}`, last_name: '', phone: '', power_ranking: 300,
        })),
    } as Group
}

const groups = ['Box 1', 'Box 2', 'Box 3', 'Box 4', 'Box 5'].map((n, i) => group(`g${i}`, n))

function renderPreview() {
    const { container } = render(
        <GroupRoundPreview round={round as EventRound} groups={groups} />
    )
    return container.firstElementChild!
}

describe('GroupRoundPreview — mise en page', () => {
    it('rend un tableau par groupe', () => {
        renderPreview()
        expect(screen.getAllByTestId('draw-table')).toHaveLength(5)
    })

    it('passe à trois colonnes sur les grands écrans, comme la page Tirages', () => {
        expect(renderPreview()).toHaveClass('lg:grid-cols-2', '3xl:grid-cols-3')
    })

    it('laisse chaque tableau prendre sa hauteur naturelle', () => {
        // Sans cela, la grille a une hauteur définie, ses lignes se partagent l'espace
        // et `h-full` sur DrawTable rogne les tableaux — on ne voyait plus que 4 joueurs.
        const grid = renderPreview()
        expect(grid).toHaveClass('auto-rows-min', 'content-start')
    })

    it('fait défiler la grille, pas la page', () => {
        expect(renderPreview()).toHaveClass('flex-1', 'min-h-0', 'overflow-y-auto')
    })
})
