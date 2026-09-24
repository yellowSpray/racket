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

/** Le prefixe des classes d'une carte large, voir « selon la largeur de la carte ». */
const LARGE = '@min-[39rem]/tuile:'
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

            expect(classe(0)).toContain('bg-success-soft')
            expect(classe(1)).toContain('bg-warning-soft')
            expect(classe(2)).toContain('border-warning-border')
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
            expect(screen.getAllByText('Box A')[0].className).toContain('bg-neutral-soft')
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

            expect(screen.getByText('5 matchs').className).toContain('bg-neutral-soft')
            expect(screen.getByText('1 non joué').className).toContain('border-warning-border')
            expect(screen.getByText('1 non joué').className).toContain('bg-card')
            expect(screen.getByText('2 absences').className).toContain('bg-warning-soft')
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

    /*
     * Sur telephone la liste n'est plus faite de cartes dans la carte. Le
     * double cadre mangeait la largeur, les noms se coupaient, le score
     * prenait une ligne a lui et l'on ne voyait que deux matchs et demi. Elle
     * reprend la grammaire du bureau : l'heure en intertitre de creneau, les
     * deux noms l'un sous l'autre, le score a droite.
     */
    describe('sur telephone', () => {
        function creneaux() {
            return makeDay({
                matches: [
                    makeMatch({ id: 'm1', match_time: '19:00:00', court_number: 'Terrain 1' }),
                    makeMatch({ id: 'm2', match_time: '19:00:00', court_number: 'Terrain 2' }),
                    makeMatch({ id: 'm3', match_time: '19:30:00', court_number: 'Terrain 1' }),
                ],
            })
        }

        function liste(container: HTMLElement) {
            return container.querySelector('[data-liste-telephone]') as HTMLElement
        }

        it('ne vit que dans une carte etroite', () => {
            mockUseMatchesByDay.mockReturnValue({ ...defaultReturn, days: [creneaux()] })
            const { container } = render(<MatchesCard roundId="round1" />)
            expect(liste(container).className).toContain(`${LARGE}hidden`)
        })

        it('ecrit l\'heure une fois par creneau, en intertitre', () => {
            mockUseMatchesByDay.mockReturnValue({ ...defaultReturn, days: [creneaux()] })
            const { container } = render(<MatchesCard roundId="round1" />)
            const intertitres = [...liste(container).querySelectorAll('[data-creneau]')].map(e => e.textContent)
            expect(intertitres).toEqual(['19:00', '19:30'])
        })

        it('range chaque match sous son creneau', () => {
            mockUseMatchesByDay.mockReturnValue({ ...defaultReturn, days: [creneaux()] })
            const { container } = render(<MatchesCard roundId="round1" />)
            const groupes = [...liste(container).querySelectorAll('[data-groupe-creneau]')]
            expect(groupes.map(g => g.querySelectorAll('[data-ligne-match]').length)).toEqual([2, 1])
        })

        it('pose les deux noms l\'un sous l\'autre, sans « vs »', () => {
            mockUseMatchesByDay.mockReturnValue({ ...defaultReturn, days: [makeDay()] })
            const { container } = render(<MatchesCard roundId="round1" />)
            const ligne = liste(container).querySelector('[data-ligne-match]')!
            const noms = [...ligne.querySelectorAll('[data-joueur]')]
            expect(noms.map(n => n.textContent)).toEqual(['Alice Martin', 'Bob Dupont'])
            for (const n of noms) expect(n.className).toContain('block')
            expect(ligne.textContent).not.toContain('vs')
        })

        it('marque le vainqueur par la graisse', () => {
            mockUseMatchesByDay.mockReturnValue({
                ...defaultReturn,
                days: [makeDay({ matches: [makeMatch({ status: 'done', winner_id: 'p2', score: '1-3' })] })],
            })
            const { container } = render(<MatchesCard roundId="round1" />)
            const [p1, p2] = liste(container).querySelectorAll('[data-joueur]')
            expect(p1.className).not.toContain('font-semibold')
            expect(p2.className).toContain('font-semibold')
        })

        // La boxe et le terrain situent le match, ils n'annoncent rien.
        it('situe le match en petit gris sous les noms', () => {
            mockUseMatchesByDay.mockReturnValue({ ...defaultReturn, days: [creneaux()] })
            const { container } = render(<MatchesCard roundId="round1" />)
            const situation = liste(container).querySelector('[data-situation]')!
            expect(situation.textContent).toBe('Box A · Terrain 1')
            expect(situation.className).toContain('text-muted-foreground')
            expect(situation.className).toContain('text-xs')
        })

        it('pose le score a droite des noms, sur la meme rangee', () => {
            mockUseMatchesByDay.mockReturnValue({ ...defaultReturn, days: [makeDay()] })
            const { container } = render(<MatchesCard roundId="round1" />)
            const ligne = liste(container).querySelector('[data-ligne-match]')!
            expect(ligne.className).toContain('flex')
            expect(ligne.className).toContain('items-center')
            expect(ligne.lastElementChild!.querySelector('[data-controle-score]')).not.toBeNull()
        })

        // Plus de cadre par match : un filet entre deux rangees du creneau.
        it('separe les rangees par un filet, pas par un cadre', () => {
            mockUseMatchesByDay.mockReturnValue({ ...defaultReturn, days: [creneaux()] })
            const { container } = render(<MatchesCard roundId="round1" />)
            const lignes = [...liste(container).querySelectorAll('[data-ligne-match]')]
            for (const l of lignes) expect(l.className).not.toContain('rounded')
            expect(lignes[0].className).toContain('border-b')
            // La derniere d'un creneau laisse l'intertitre suivant faire le filet.
            expect(lignes[1].className).not.toContain('border-b')
        })

        describe('l\'en-tete', () => {
            it('abrege la date', () => {
                mockUseMatchesByDay.mockReturnValue({
                    ...defaultReturn,
                    days: [makeDay({ isToday: false, date: '2026-04-18', label: 'samedi 18 avril' })],
                })
                render(<MatchesCard roundId="round1" />)
                expect(screen.getByText('sam. 18 avr.').className).toContain(`${LARGE}hidden`)
                expect(screen.getByText('samedi 18 avril').className).toContain('hidden')
                expect(screen.getByText('samedi 18 avril').className).toContain(`${LARGE}inline`)
            })

            // « aujourd'hui » suffit : la date a cote ferait passer la ligne a deux.
            it('dit aujourd\'hui a la place de la date', () => {
                mockUseMatchesByDay.mockReturnValue({
                    ...defaultReturn,
                    days: [makeDay({ isToday: true, date: '2026-04-18', label: 'samedi 18 avril' })],
                })
                render(<MatchesCard roundId="round1" />)
                expect(screen.queryByText('sam. 18 avr.')).not.toBeInTheDocument()
                expect(screen.getByText("aujourd'hui")).toBeInTheDocument()
            })

            it('pousse la navigation de jour a droite du titre', () => {
                mockUseMatchesByDay.mockReturnValue({ ...defaultReturn, days: [makeDay()] })
                render(<MatchesCard roundId="round1" />)
                expect(screen.getByRole('button', { name: 'Jour précédent' }).className).toContain('ml-auto')
                expect(screen.getByRole('button', { name: 'Jour précédent' }).className).toContain(`${LARGE}ml-0`)
            })

            // Au lieu de flotter a droite d'une seconde ligne, ils demarrent sous le titre.
            it('pose les tags sur une ligne a eux, calee a gauche', () => {
                mockUseMatchesByDay.mockReturnValue({ ...defaultReturn, days: [makeDay()] })
                const { container } = render(<MatchesCard roundId="round1" />)
                const tags = container.querySelector('[data-tags-du-jour]')!
                expect(tags.className).toContain('basis-full')
                expect(tags.className).toContain(`${LARGE}basis-auto`)
                expect(tags.className).toContain(`${LARGE}ml-auto`)
                expect(tags.className).not.toMatch(/(^| )ml-auto/)
            })
        })

        // 16 px et non 24 : a 320, huit pixels de chaque cote, ce sont des noms entiers.
        it('resserre le retrait de la carte', () => {
            mockUseMatchesByDay.mockReturnValue({ ...defaultReturn, days: [makeDay()] })
            const { container } = render(<MatchesCard roundId="round1" />)
            expect(container.querySelector('[data-slot="card"]')!.className).toContain('py-4')
            expect(container.querySelector('[data-slot="card"]')!.className).toContain('md:py-6')
            for (const slot of ['card-header', 'card-content']) {
                const c = container.querySelector(`[data-slot="${slot}"]`)!.className
                expect(c).toContain('px-4')
                expect(c).toContain('md:px-6')
            }
        })
    })

    /*
     * La carte choisit sa mise en page d'apres SA largeur, pas celle de
     * l'ecran. A 1024 px le dashboard passe en deux colonnes et la carte tombe
     * d'un coup de 905 a 377 px : le tableau, en pourcentages, donnait alors
     * 28 px a la colonne des boxes pour un badge de 49, et tout se chevauchait
     * jusque vers 1400. Une regle sur la largeur d'ecran ne pouvait pas le
     * voir, la carte etant large a 1023 et etroite a 1024.
     */
    describe('selon la largeur de la carte', () => {
        it('se declare conteneur', () => {
            mockUseMatchesByDay.mockReturnValue({ ...defaultReturn, days: [makeDay()] })
            const { container } = render(<MatchesCard roundId="round1" />)
            expect(container.querySelector('[data-slot="card"]')!.className).toContain('@container/tuile')
        })

        it('ne montre le tableau que dans une carte large', () => {
            mockUseMatchesByDay.mockReturnValue({ ...defaultReturn, days: [makeDay()] })
            const { container } = render(<MatchesCard roundId="round1" />)
            const tableau = container.querySelector('[data-tableau-matchs]')!
            expect(tableau.className).toContain('hidden')
            expect(tableau.className).toContain(`${LARGE}block`)
        })

        it('ne s\'appuie plus sur la largeur de l\'ecran', () => {
            mockUseMatchesByDay.mockReturnValue({ ...defaultReturn, days: [makeDay()] })
            const { container } = render(<MatchesCard roundId="round1" />)
            expect(container.innerHTML).not.toMatch(/\bmd:(hidden|block|inline|ml-|basis-|gap-)/)
        })

        /*
         * Des colonnes fixes pour ce qui a une taille fixe : une heure, un
         * badge, un nom de terrain, le controle de score de 84 px. Seule la
         * colonne du match s'etire.
         */
        it('donne une largeur fixe a tout sauf au match', () => {
            mockUseMatchesByDay.mockReturnValue({ ...defaultReturn, days: [makeDay()] })
            const { container } = render(<MatchesCard roundId="round1" />)
            const cols = [...container.querySelectorAll('colgroup col')].map(c => c.className)
            expect(cols).toEqual(['w-14', 'w-[72px]', '', 'w-20', 'w-[100px]'])
        })
    })
})
