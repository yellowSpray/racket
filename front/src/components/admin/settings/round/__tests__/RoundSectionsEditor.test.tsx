import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RoundSectionsEditor } from '../RoundSectionsEditor'

vi.mock('@/lib/supabaseClient', () => {
    const qb = {
        select: vi.fn(() => qb),
        eq: vi.fn(() => qb),
        in: vi.fn(() => qb),
        order: vi.fn(() => qb),
        then: (res: (v: { data: unknown[] }) => unknown) => Promise.resolve({ data: [] }).then(res),
    }
    return { supabase: { from: vi.fn(() => qb) } }
})

vi.mock('../../wizard/round/WizardRoundStepConfig', () => ({
    WizardRoundStepConfig: () => <div data-testid="section-config" />,
}))
vi.mock('../../wizard/round/WizardRoundStepCalendar', () => ({
    WizardRoundStepCalendar: () => <div data-testid="section-calendar" />,
}))
vi.mock('../../wizard/WizardStepRegistrations', () => ({
    WizardStepRegistrations: () => <div data-testid="section-registrations" />,
}))
vi.mock('../../wizard/WizardStepGroups', () => ({
    WizardStepGroups: () => <div data-testid="section-groups" />,
}))
vi.mock('../../wizard/WizardStepMatches', () => ({
    WizardStepMatches: () => <div data-testid="section-matches" />,
}))

const round = {
    id: 'r1', event_id: 'e1', round_number: 2,
    start_date: '2026-09-01', end_date: '2026-09-28',
    number_of_courts: 2, status: 'upcoming' as const,
}
const event = { id: 'e1', club_id: 'c1', event_name: 'Interclub', event_rounds: [round] }

async function setup(leading?: React.ReactNode) {
    // act() englobe le chargement asynchrone des tableaux et des matchs
    await act(async () => {
        render(
            <RoundSectionsEditor
                event={event}
                round={round}
                onSaved={vi.fn()}
                leading={leading}
            />
        )
    })
}

/** Radix active un onglet au mouseDown, pas au click seul. */
function selectTab(name: string) {
    fireEvent.mouseDown(screen.getByRole('tab', { name }), { button: 0 })
}

describe('RoundSectionsEditor', () => {
    beforeEach(() => vi.clearAllMocks())

    it('expose les quatre sections en acces direct', async () => {
        await setup()
        for (const label of ['Paramètres', 'Inscriptions', 'Tableaux', 'Matchs']) {
            expect(screen.getByRole('tab', { name: label })).toBeInTheDocument()
        }
    })

    it('affiche la section Parametres par defaut, config et calendrier reunis', async () => {
        await setup()
        expect(screen.getByTestId('section-config')).toBeInTheDocument()
        expect(screen.getByTestId('section-calendar')).toBeInTheDocument()
    })

    it('n\'impose aucun ordre : on peut aller directement aux matchs', async () => {
        await setup()
        selectTab('Matchs')
        await waitFor(() => expect(screen.getByTestId('section-matches')).toBeInTheDocument())
    })

    it('bascule sur les inscriptions', async () => {
        await setup()
        selectTab('Inscriptions')
        await waitFor(() => expect(screen.getByTestId('section-registrations')).toBeInTheDocument())
    })

    it('presente les sections en fil d\'Ariane : un separateur entre chaque', async () => {
        await setup()
        // 4 sections → 3 séparateurs
        expect(screen.getAllByTestId('breadcrumb-separator')).toHaveLength(3)
    })

    it('masque les separateurs aux lecteurs d\'ecran', async () => {
        await setup()
        for (const sep of screen.getAllByTestId('breadcrumb-separator')) {
            expect(sep).toHaveAttribute('aria-hidden', 'true')
        }
    })

    it('marque la section courante comme active', async () => {
        await setup()
        expect(screen.getByRole('tab', { name: 'Paramètres' })).toHaveAttribute('data-state', 'active')
        selectTab('Tableaux')
        await waitFor(() => {
            expect(screen.getByRole('tab', { name: 'Tableaux' })).toHaveAttribute('data-state', 'active')
        })
    })

    it('place le contenu « leading » sur la meme ligne que les onglets', async () => {
        await setup(<button data-testid="leading">Retour</button>)
        const tablist = screen.getByRole('tablist')
        const leading = screen.getByTestId('leading')
        expect(tablist.parentElement).toContainElement(leading)
    })

    it('n\'affiche pas de ligne d\'outils vide quand rien n\'est passe en leading', async () => {
        await setup()
        expect(screen.queryByTestId('leading')).not.toBeInTheDocument()
        expect(screen.getByRole('tablist')).toBeInTheDocument()
    })

    it('laisse la section occuper toute la hauteur restante', async () => {
        await setup()
        const panel = screen.getByRole('tabpanel')
        expect(panel).toHaveClass('flex', 'flex-col', 'flex-1', 'min-h-0')
        expect(panel.parentElement).toHaveClass('flex', 'flex-col', 'flex-1', 'min-h-0')
    })

    it('n\'affiche pas de navigation Precedent / Suivant', async () => {
        await setup()
        expect(screen.queryByRole('button', { name: /précédent/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /suivant/i })).not.toBeInTheDocument()
    })
})
