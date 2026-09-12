import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MatchesCard } from '../MatchesCard'
import type { MatchDay, DayMatch } from '@/hooks/useMatchesByDay'

vi.mock('@/hooks/useMatchesByDay', () => ({
    useMatchesByDay: vi.fn(),
}))

/*
 * `ScrollArea` et la chaine d'imports de la carte atteignent le client
 * Supabase, construit au chargement du module. Sans cette simulation, tout le
 * fichier echoue sur « supabaseUrl is required » avant le moindre test.
 */
vi.mock('@/lib/supabaseClient', () => ({
    supabase: { from: vi.fn(), rpc: vi.fn(), channel: vi.fn(), removeChannel: vi.fn() },
}))

import { useMatchesByDay } from '@/hooks/useMatchesByDay'

const mockUseMatchesByDay = useMatchesByDay as ReturnType<typeof vi.fn>
const mockResolveScore = vi.fn()

function makeMatch(overrides: Partial<DayMatch> = {}): DayMatch {
    return {
        id: 'm1',
        group_id: 'g1',
        player1_id: 'p1',
        player2_id: 'p2',
        match_date: '2026-04-18',
        match_time: '10:00:00',
        court_number: '1',
        winner_id: null,
        score: null,
        pending_score_p1: null,
        pending_score_p2: null,
        status: 'no_score',
        player1: { id: 'p1', first_name: 'Alice', last_name: 'Martin' },
        player2: { id: 'p2', first_name: 'Bob', last_name: 'Dupont' },
        group: { id: 'g1', group_name: 'Box A', round_id: 'round1' },
        ...overrides,
    }
}

function makeDay(overrides: Partial<MatchDay> = {}): MatchDay {
    return {
        date: '2026-04-18',
        label: 'vendredi 18 avril',
        isToday: true,
        matches: [makeMatch()],
        ...overrides,
    }
}

const defaultReturn = {
    days: [],
    loading: false,
    initialDayIndex: 0,
    resolveScore: mockResolveScore,
    refetch: vi.fn(),
}

beforeEach(() => {
    vi.clearAllMocks()
    mockUseMatchesByDay.mockReturnValue(defaultReturn)
})

describe('MatchesCard', () => {
    it('shows loading state', () => {
        mockUseMatchesByDay.mockReturnValue({ ...defaultReturn, loading: true })
        render(<MatchesCard roundId="round1" />)
        expect(screen.getByText('Chargement...')).toBeInTheDocument()
    })

    it('shows empty state when no days', () => {
        render(<MatchesCard roundId="round1" />)
        expect(screen.getByText(/aucun match programmé/i)).toBeInTheDocument()
    })

    it('shows player names for a match', () => {
        mockUseMatchesByDay.mockReturnValue({
            ...defaultReturn,
            days: [makeDay()],
        })
        render(<MatchesCard roundId="round1" />)
        // Both desktop table and mobile cards are in the DOM (CSS hides one at runtime)
        expect(screen.getAllByText('Alice Martin').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('Bob Dupont').length).toBeGreaterThanOrEqual(1)
    })

    it('shows the day label', () => {
        mockUseMatchesByDay.mockReturnValue({
            ...defaultReturn,
            days: [makeDay({ label: 'vendredi 18 avril' })],
        })
        render(<MatchesCard roundId="round1" />)
        expect(screen.getByText('vendredi 18 avril')).toBeInTheDocument()
    })

    it('shows "aujourd\'hui" badge when day isToday', () => {
        mockUseMatchesByDay.mockReturnValue({
            ...defaultReturn,
            days: [makeDay({ isToday: true })],
        })
        render(<MatchesCard roundId="round1" />)
        expect(screen.getByText("aujourd'hui")).toBeInTheDocument()
    })

    it('shows the group badge', () => {
        mockUseMatchesByDay.mockReturnValue({
            ...defaultReturn,
            days: [makeDay()],
        })
        render(<MatchesCard roundId="round1" />)
        expect(screen.getAllByText('Box A').length).toBeGreaterThanOrEqual(1)
    })

    /*
     * `court_number` porte le **nom** du terrain, pas son numero : la colonne
     * est mal nommee. Les clubs le remplissent depuis `club_courts.court_name`,
     * dont le defaut est deja « Terrain 1 ». Le prefixer ici donnait
     * « Terrain Terrain 1 », et un club qui nomme ses terrains « Central » ou
     * « Bulle 2 » se verrait imposer un mot qui n'est pas le sien.
     */
    it('affiche le nom du terrain tel qu\'il est saisi', () => {
        mockUseMatchesByDay.mockReturnValue({
            ...defaultReturn,
            days: [makeDay({ matches: [makeMatch({ court_number: 'Terrain 3' })] })],
        })
        render(<MatchesCard roundId="round1" />)

        expect(screen.getAllByText('Terrain 3').length).toBeGreaterThanOrEqual(1)
        expect(screen.queryByText(/Terrain Terrain/)).not.toBeInTheDocument()
    })

    it('n\'invente pas de prefixe pour un terrain autrement nomme', () => {
        mockUseMatchesByDay.mockReturnValue({
            ...defaultReturn,
            days: [makeDay({ matches: [makeMatch({ court_number: 'Central' })] })],
        })
        render(<MatchesCard roundId="round1" />)
        expect(screen.getAllByText('Central').length).toBeGreaterThanOrEqual(1)
    })

    it('shows score for a done match', () => {
        mockUseMatchesByDay.mockReturnValue({
            ...defaultReturn,
            days: [makeDay({
                matches: [makeMatch({ status: 'done', winner_id: 'p1', score: '3-1' })],
            })],
        })
        render(<MatchesCard roundId="round1" />)
        expect(screen.getAllByText('3-1').length).toBeGreaterThanOrEqual(1)
    })

    describe('la colonne des scores', () => {
        /*
         * Un seul controle par rangee, quel que soit l'etat du match. Avant, un
         * match termine montrait une pastille figee et un match sans score
         * montrait une pastille, un selecteur et un bouton Valider : trois
         * objets pour une colonne de 33 %, et deux grammaires a apprendre.
         *
         * Le selecteur natif est pose en transparence sur la pastille, comme
         * dans le fil d'Ariane. Le clavier marche sans une ligne de code, et
         * sur telephone c'est le systeme qui ouvre sa roulette.
         */
        it('pose un seul selecteur, sans bouton Valider', () => {
            mockUseMatchesByDay.mockReturnValue({
                ...defaultReturn,
                days: [makeDay({
                    matches: [
                        makeMatch({ id: 'm1', status: 'done', winner_id: 'p1', score: '3-1' }),
                        makeMatch({ id: 'm2', status: 'no_score' }),
                    ],
                })],
            })
            render(<MatchesCard roundId="round1" />)

            expect(screen.queryByRole('button', { name: /valider/i })).not.toBeInTheDocument()
            // Deux rangees, deux dispositions : quatre selecteurs.
            expect(screen.getAllByRole('combobox')).toHaveLength(4)
        })

        // Choisir enregistre. Il n'y a plus d'etape a confirmer.
        it('enregistre des le choix', async () => {
            mockResolveScore.mockResolvedValue(true)
            mockUseMatchesByDay.mockReturnValue({
                ...defaultReturn,
                days: [makeDay({ matches: [makeMatch({ status: 'no_score' })] })],
            })
            render(<MatchesCard roundId="round1" />)

            fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: '3-1' } })

            await waitFor(() => {
                expect(mockResolveScore).toHaveBeenCalledWith('m1', '3-1', 'p1', 'p2')
            })
        })

        /*
         * Un score enregistre n'offre plus l'option vide. Le remettre a vide
         * serait un effacement, et l'effacement demande un geste explicite :
         * dans une grille ou l'on parcourt vingt lignes d'un coup, une entree
         * vide choisie par megarde detruirait un resultat sans rien dire.
         */
        it('n\'offre pas le vide sur un score deja pose', () => {
            mockUseMatchesByDay.mockReturnValue({
                ...defaultReturn,
                days: [makeDay({
                    matches: [makeMatch({ status: 'done', winner_id: 'p1', score: '3-1' })],
                })],
            })
            render(<MatchesCard roundId="round1" />)

            const valeurs = [...screen.getAllByRole('combobox')[0].querySelectorAll('option')]
                .map(o => o.getAttribute('value'))
            expect(valeurs).not.toContain('')
        })

        /*
         * Trois etats, trois couleurs. Un resultat est vert, une absence est
         * un ambre plein car c'est un resultat acquis, un match en retard est
         * un contour ambre sur blanc car il demande une action.
         */
        it('colore le controle selon l\'etat du match', () => {
            vi.useFakeTimers({ toFake: ['Date'] })
            vi.setSystemTime(new Date('2026-04-18T20:00:00'))
            mockUseMatchesByDay.mockReturnValue({
                ...defaultReturn,
                days: [makeDay({
                    matches: [
                        makeMatch({ id: 'm1', status: 'done', winner_id: 'p1', score: '3-1' }),
                        makeMatch({ id: 'm2', status: 'done', winner_id: 'p2', score: 'ABS-0' }),
                        makeMatch({ id: 'm3', status: 'no_score', match_time: '10:00:00' }),
                    ],
                })],
            })
            const { container } = render(<MatchesCard roundId="round1" />)
            const classe = (i: number) =>
                container.querySelectorAll('[data-controle-score]')[i].className

            expect(classe(0)).toContain('bg-green-100')
            expect(classe(1)).toContain('bg-amber-100')
            expect(classe(2)).toContain('border-amber-400')
            vi.useRealTimers()
        })

        /*
         * Meme montage que le fil d'Ariane : `data-liste-stylee` fait basculer
         * `index.css` sur `appearance: base-select`, faute de quoi la liste est
         * dessinee par le systeme et son survol est le bleu de Windows.
         */
        it('confie sa liste a la feuille de style, pas au systeme', () => {
            mockUseMatchesByDay.mockReturnValue({
                ...defaultReturn,
                days: [makeDay({ matches: [makeMatch({ status: 'no_score' })] })],
            })
            render(<MatchesCard roundId="round1" />)
            expect(screen.getAllByRole('combobox')[0]).toHaveAttribute('data-liste-stylee')
        })

        // « Abs » et non « ABS-0 » : la pastille dit le fait, le menu dit qui.
        it('abrege l\'absence sur la pastille', () => {
            mockUseMatchesByDay.mockReturnValue({
                ...defaultReturn,
                days: [makeDay({
                    matches: [makeMatch({ status: 'done', winner_id: 'p2', score: 'ABS-0' })],
                })],
            })
            const { container } = render(<MatchesCard roundId="round1" />)
            expect(container.querySelector('[data-controle-score]')!.textContent).toContain('Abs')
        })

        /*
         * Le conflit garde son traitement a part, et c'est voulu : deux joueurs
         * ont annonce deux scores differents, et aucun controle unique ne peut
         * montrer les deux valeurs en meme temps.
         */
        it('laisse le conflit a son propre traitement', () => {
            mockUseMatchesByDay.mockReturnValue({
                ...defaultReturn,
                days: [makeDay({
                    matches: [makeMatch({
                        status: 'conflict', pending_score_p1: '3-1', pending_score_p2: '2-3',
                    })],
                })],
            })
            render(<MatchesCard roundId="round1" />)
            expect(screen.getAllByRole('button', { name: /valider/i }).length).toBeGreaterThanOrEqual(2)
        })
    })

    describe('les colonnes du tableau', () => {
        function creneaux() {
            return makeDay({
                matches: [
                    makeMatch({ id: 'm1', match_time: '19:00:00' }),
                    makeMatch({ id: 'm2', match_time: '19:00:00' }),
                    makeMatch({ id: 'm3', match_time: '19:30:00' }),
                ],
            })
        }

        /*
         * L'heure ne s'ecrit que sur la premiere rangee de son creneau. Trois
         * matchs a 19h00 repetaient trois fois la meme heure, et l'oeil devait
         * comparer des chiffres pour voir un groupe que le blanc montre tout
         * seul.
         */
        it('n\'ecrit l\'heure qu\'en tete de creneau', () => {
            mockUseMatchesByDay.mockReturnValue({ ...defaultReturn, days: [creneaux()] })
            const { container } = render(<MatchesCard roundId="round1" />)
            const heures = [...container.querySelectorAll('[data-cellule-heure]')]
                .map(e => e.textContent)

            expect(heures).toEqual(['19:00', '', '19:30'])
        })

        /*
         * Le vainqueur se dit par la graisse et rien d'autre. Le vert etait
         * pris pour un etat « validé » alors qu'il ne disait que « a gagne »,
         * et il entrait en concurrence avec le vert des scores a droite.
         */
        it('marque le vainqueur par la graisse, sans couleur', () => {
            mockUseMatchesByDay.mockReturnValue({
                ...defaultReturn,
                days: [makeDay({
                    matches: [makeMatch({ status: 'done', winner_id: 'p1', score: '3-1' })],
                })],
            })
            render(<MatchesCard roundId="round1" />)
            const gagnant = screen.getAllByText('Alice Martin')[0]

            expect(gagnant.className).toContain('font-semibold')
            expect(gagnant.className).not.toContain('text-green')
        })

        // Un gris plus clair : la boxe situe, elle n'annonce rien.
        it('pose la boxe sur un gris clair', () => {
            mockUseMatchesByDay.mockReturnValue({ ...defaultReturn, days: [makeDay()] })
            render(<MatchesCard roundId="round1" />)
            expect(screen.getAllByText('Box A')[0].className).toContain('bg-gray-100')
        })
    })

    it('disables prev button on first day', () => {
        mockUseMatchesByDay.mockReturnValue({
            ...defaultReturn,
            days: [makeDay(), makeDay({ date: '2026-04-19', isToday: false })],
        })
        render(<MatchesCard roundId="round1" />)
        expect(screen.getByRole('button', { name: /jour précédent/i })).toBeDisabled()
    })

    it('disables next button on last day', () => {
        mockUseMatchesByDay.mockReturnValue({
            ...defaultReturn,
            days: [makeDay()],
        })
        render(<MatchesCard roundId="round1" />)
        expect(screen.getByRole('button', { name: /jour suivant/i })).toBeDisabled()
    })

    it('navigates to next day on next button click', () => {
        const day1 = makeDay({ label: 'vendredi 18 avril' })
        const day2 = makeDay({ date: '2026-04-19', label: 'samedi 19 avril', isToday: false })
        mockUseMatchesByDay.mockReturnValue({
            ...defaultReturn,
            days: [day1, day2],
        })
        render(<MatchesCard roundId="round1" />)
        expect(screen.getByText('vendredi 18 avril')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: /jour suivant/i }))
        expect(screen.getByText('samedi 19 avril')).toBeInTheDocument()
    })

    /*
     * La serie ne se dit plus ici. `EventSelector` vivait dans cet en-tete
     * faute de mieux ; le fil d'Ariane la porte desormais, deux fois plus haut
     * et pour toute l'application.
     */
    it('ne porte plus le selecteur d\'evenement', () => {
        mockUseMatchesByDay.mockReturnValue({ ...defaultReturn, days: [makeDay()] })
        const { container } = render(<MatchesCard roundId="round1" />)
        expect(container.querySelector('[data-slot="card-title"] select')).toBeNull()
    })

    describe('les trois tags du jour', () => {
        /*
         * Un match sans score dont l'heure est passee de 1h30 est « non joue ».
         * Le delai vient de `isMatchUnplayed`, et l'horloge est figee ici :
         * sans ca le decompte dependrait du jour ou les tests tournent.
         */
        function jour() {
            vi.setSystemTime(new Date('2026-04-18T20:00:00'))
            return makeDay({
                matches: [
                    makeMatch({ id: 'm1', status: 'done', winner_id: 'p1', score: '3-1' }),
                    makeMatch({ id: 'm2', status: 'done', winner_id: 'p2', score: 'ABS-0' }),
                    makeMatch({ id: 'm3', status: 'done', winner_id: 'p1', score: '0-ABS' }),
                    makeMatch({ id: 'm4', status: 'no_score', match_time: '10:00:00' }),
                    makeMatch({ id: 'm5', status: 'no_score', match_time: '23:00:00' }),
                ],
            })
        }

        beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }))
        afterEach(() => vi.useRealTimers())

        it('compte le total, les non joues et les absences', () => {
            mockUseMatchesByDay.mockReturnValue({ ...defaultReturn, days: [jour()] })
            render(<MatchesCard roundId="round1" />)

            expect(screen.getByText('5 matchs')).toBeInTheDocument()
            // m4 seul : m5 se joue a 23h, il n'est pas en retard.
            expect(screen.getByText('1 non joué')).toBeInTheDocument()
            expect(screen.getByText('2 absences')).toBeInTheDocument()
        })

        /*
         * Trois roles, trois poids. Le total renseigne, d'ou un gris neutre.
         * Les absences sont un fait acquis, d'ou un ambre plein. Les non joues
         * sont les seuls a demander une action : un contour ambre sur blanc,
         * qui se detache des deux autres sans crier.
         */
        it('donne un style different a chacun', () => {
            mockUseMatchesByDay.mockReturnValue({ ...defaultReturn, days: [jour()] })
            render(<MatchesCard roundId="round1" />)

            expect(screen.getByText('5 matchs').className).toContain('bg-gray-100')
            expect(screen.getByText('1 non joué').className).toContain('border-amber-400')
            expect(screen.getByText('1 non joué').className).toContain('bg-white')
            expect(screen.getByText('2 absences').className).toContain('bg-amber-100')
        })

        // Zero non joue, zero absence : deux tags de moins, pas deux zeros.
        it('n\'affiche que les tags qui comptent quelque chose', () => {
            vi.setSystemTime(new Date('2026-04-18T09:00:00'))
            mockUseMatchesByDay.mockReturnValue({
                ...defaultReturn,
                days: [makeDay({ matches: [makeMatch({ id: 'm1', match_time: '10:00:00' })] })],
            })
            render(<MatchesCard roundId="round1" />)

            expect(screen.getByText('1 match')).toBeInTheDocument()
            // Les non joues restent affiches a zero : c'est le seul des trois
            // qui appelle une action, et « 0 non joué » est une bonne nouvelle
            // qu'on vient chercher. Les absences, elles, s'effacent.
            expect(screen.getByText('0 non joué')).toBeInTheDocument()
            expect(screen.queryByText(/absence/)).not.toBeInTheDocument()
        })

        /*
         * La pastille qui clignotait disait « 1/2 joués » avec un point anime.
         * Trois tags fixes la remplacent : une animation permanente dans un
         * coin de l'ecran fatigue et ne dit rien de plus.
         */
        it('remplace la pastille de progression', () => {
            mockUseMatchesByDay.mockReturnValue({ ...defaultReturn, days: [jour()] })
            const { container } = render(<MatchesCard roundId="round1" />)

            expect(screen.queryByText(/\/5 joués/)).not.toBeInTheDocument()
            expect(container.querySelector('.animate-ping')).toBeNull()
        })
    })
})
