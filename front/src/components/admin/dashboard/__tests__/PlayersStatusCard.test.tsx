import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlayersStatusCard } from '../PlayersStatusCard'
import type { PlayerMovement } from '@/hooks/usePlayerMovements'

vi.mock('@/lib/formatRelativeTime', () => ({
    formatRelativeTime: vi.fn((date: string) => `mock-${date}`),
}))

let mockMovements: PlayerMovement[] = []
let mockMovementsLoading = false

vi.mock('@/hooks/usePlayerMovements', () => ({
    usePlayerMovements: () => ({
        movements: mockMovements,
        loading: mockMovementsLoading,
        error: null,
    }),
}))

function makeMovement(overrides: Partial<PlayerMovement> & { profileId: string }): PlayerMovement {
    return {
        firstName: 'Alice',
        lastName: 'Martin',
        status: 'active',
        registeredAt: '2026-04-18T10:00:00Z',
        roundId: 'r-current',
        roundNumber: 4,
        ...overrides,
    }
}

/** Raccourci : la carte ne prend plus que les deux series a comparer. */
function poser() {
    return render(<PlayersStatusCard roundId="r-current" previousRoundId="r-previous" />)
}

beforeEach(() => {
    vi.clearAllMocks()
    mockMovements = []
    mockMovementsLoading = false
})

describe('PlayersStatusCard', () => {
    /*
     * « Arrivees » et non « Inscrits ». La carte ne compte pas l'effectif de la
     * serie, elle compte ceux qui n'etaient pas la a la serie precedente. Le
     * titre doit dire cela, sinon le nombre affiche a cote ment des qu'une
     * serie precedente existe.
     */
    it('nomme la premiere diapositive « Arrivées »', () => {
        poser()
        expect(screen.getByText('Arrivées')).toBeInTheDocument()
    })

    it('prev button is disabled on first slide', () => {
        poser()
        expect(screen.getByLabelText('Slide précédent')).toBeDisabled()
    })

    it('next button is enabled on first slide', () => {
        poser()
        expect(screen.getByLabelText('Slide suivant')).not.toBeDisabled()
    })

    it('navigates to "Désinscrits" on next click', () => {
        poser()
        fireEvent.click(screen.getByLabelText('Slide suivant'))
        expect(screen.getByText('Désinscrits')).toBeInTheDocument()
    })

    it('navigates to "Liste d\'attente" after two next clicks', () => {
        poser()
        fireEvent.click(screen.getByLabelText('Slide suivant'))
        fireEvent.click(screen.getByLabelText('Slide suivant'))
        expect(screen.getByText("Liste d'attente")).toBeInTheDocument()
    })

    /*
     * Trois diapositives, plus quatre. Les demandes de visiteurs ont ete
     * retirees : le parcours qui les alimente, `/events/join/:token`, est hors
     * service depuis la migration 14, et il appartient a la partie utilisateur
     * reportee apres le MVP admin. `useVisitorRequests` reste dans le depot,
     * une diapositive de plus la remet.
     */
    it('n\'a plus de diapositive de demandes visiteurs', () => {
        poser()
        fireEvent.click(screen.getByLabelText('Slide suivant'))
        fireEvent.click(screen.getByLabelText('Slide suivant'))
        expect(screen.getByLabelText('Slide suivant')).toBeDisabled()
        expect(screen.queryByText('Demandes visiteurs')).not.toBeInTheDocument()
    })

    it('shows loading state on the first slide', () => {
        mockMovementsLoading = true
        poser()
        expect(screen.getByText('Chargement...')).toBeInTheDocument()
    })

    it('annonce l\'absence de nouvel inscrit', () => {
        poser()
        expect(screen.getByText('Aucune arrivée')).toBeInTheDocument()
    })

    it('shows player names', () => {
        mockMovements = [makeMovement({ profileId: 'p1', firstName: 'Alice', lastName: 'Martin' })]
        poser()
        expect(screen.getByText('Alice Martin')).toBeInTheDocument()
    })

    /*
     * La ligne ne porte plus le badge de serie. Deux colonnes suffisent, un nom
     * et une date : la serie est celle que le fil d'Ariane affiche deja, et la
     * repeter trente fois dans une colonne de 360 px volait la place du nom.
     */
    it('ne pose plus de badge de serie sur la ligne', () => {
        mockMovements = [makeMovement({ profileId: 'p1', roundNumber: 4 })]
        poser()
        expect(screen.queryByText('Série 4')).not.toBeInTheDocument()
    })

    it('shows relative time for movements', () => {
        mockMovements = [makeMovement({ profileId: 'p1', registeredAt: '2026-04-18T10:00:00Z' })]
        poser()
        expect(screen.getByText('mock-2026-04-18T10:00:00Z')).toBeInTheDocument()
    })

    it('range les departs dans la deuxieme diapositive', () => {
        // Un depart appartient a la serie precedente : il ne doit pas apparaitre
        // parmi les arrivees.
        mockMovements = [makeMovement({ profileId: 'p1', firstName: 'Chloe', lastName: 'Lefevre', status: 'inactive', roundNumber: 3 })]
        poser()

        expect(screen.getByText('Aucune arrivée')).toBeInTheDocument()

        fireEvent.click(screen.getByLabelText('Slide suivant'))
        expect(screen.getByText('Chloe Lefevre')).toBeInTheDocument()
    })

    describe('le compte de l\'en-tete', () => {
        /*
         * Il compte les lignes de la diapositive affichee, jamais l'effectif de
         * la serie : un nombre pose au-dessus d'une liste doit etre celui de
         * cette liste.
         */
        it('compte les lignes de la diapositive affichee', () => {
            mockMovements = [
                makeMovement({ profileId: 'p1' }),
                makeMovement({ profileId: 'p2', firstName: 'Bob' }),
                makeMovement({ profileId: 'p3', firstName: 'Chloe', status: 'inactive' }),
            ]
            poser()

            expect(screen.getByText('2')).toBeInTheDocument()

            fireEvent.click(screen.getByLabelText('Slide suivant'))
            expect(screen.getByText('1')).toBeInTheDocument()
        })

        // Rien a compter, donc pas de pastille : un zero occupe la place d'une
        // information sans en etre une.
        it('s\'efface quand il n\'y a rien a compter', () => {
            poser()
            expect(screen.queryByText('0')).not.toBeInTheDocument()
        })

        /*
         * Vert et non rouge : le rouge plein des paiements est une alerte, ce
         * compte-ci renseigne. Meme forme en revanche, un disque qui s'allonge
         * en pastille au-dela de deux chiffres.
         */
        it('se dit en vert, pas dans le rouge des paiements', () => {
            mockMovements = [makeMovement({ profileId: 'p1' })]
            poser()
            const compte = screen.getByText('1')
            expect(compte.className).toContain('bg-green-800')
            expect(compte.className).toContain('min-w-5')
        })
    })

    describe('la liste', () => {
        /*
         * Meme traitement que les paiements : des bandes de 32 px une ligne sur
         * deux. C'est le seul repere horizontal de la carte, sans lui l'oeil
         * perd la ligne en allant chercher la date a droite.
         */
        it('alterne le fond des lignes', () => {
            mockMovements = [1, 2, 3, 4].map(n =>
                makeMovement({ profileId: `p${n}`, firstName: `Joueur${n}` }),
            )
            const { container } = poser()
            const lignes = [...container.querySelectorAll('[data-ligne-mouvement]')]

            expect(lignes).toHaveLength(4)
            expect(lignes[0].className).toContain('bg-muted/40')
            expect(lignes[1].className).not.toContain('bg-muted/40')
            expect(lignes[2].className).toContain('bg-muted/40')
            expect(lignes[3].className).not.toContain('bg-muted/40')
        })

        /*
         * Les memes espacements que la tuile des paiements : 24 px au-dessus de
         * l'en-tete et sous la derniere ligne, ce que `Card` donne deja, et 4
         * seulement entre l'en-tete et la premiere ligne. Les bandes tiennent
         * entre les deux verticales de l'en-tete, donc `CardContent` porte le
         * meme retrait que lui.
         */
        it('reprend les espacements de la tuile des paiements', () => {
            mockMovements = [makeMovement({ profileId: 'p1' })]
            const { container } = poser()

            const contenu = container.querySelector('[data-slot="card-content"]')!
            expect(contenu.className).toContain('pt-1')
            expect(contenu.className).toContain('px-6')
            expect(container.querySelector('[data-slot="card-header"]')!.className).toContain('px-6')
            expect(container.querySelector('[data-ligne-mouvement]')!.className).toContain('px-4')
            expect(container.querySelector('[data-slot="card"]')!.className).not.toMatch(/\bpb-\d/)
        })
    })
})
