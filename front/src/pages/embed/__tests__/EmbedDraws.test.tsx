import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'

/**
 * L'en-tete du cadre remplace celui du site hote : c'est lui qui porte
 * l'identite du club. Il se lit donc en colonne centree, logo en premier,
 * puis le titre, puis la navigation entre series.
 */
const { useEmbedDraws, publishEmbedHeight } = vi.hoisted(() => ({
    useEmbedDraws: vi.fn(),
    publishEmbedHeight: vi.fn(),
}))

vi.mock('@/hooks/useEmbedDraws', () => ({ useEmbedDraws }))
vi.mock('@/lib/embedHeight', () => ({ publishEmbedHeight }))

import { EmbedDraws } from '../EmbedDraws'

const TOKEN = '864bc9e6-0590-4770-8a36-3de2176bc5ef'

const DRAWS = {
    club_name: 'Castle Club',
    logo_url: 'https://exemple.test/logo.png',
    event_name: 'Squash Boxes',
    round: {
        round_number: 4,
        start_date: '2026-09-01',
        end_date: '2026-09-30',
        status: 'active',
        updated_at: '2026-09-03T10:00:00Z',
    },
    series: [
        { round_number: 3, status: 'closed' },
        { round_number: 4, status: 'active' },
    ],
    groups: [],
    matches: [],
}

function afficher() {
    return render(
        <MemoryRouter initialEntries={[`/embed/tableaux/${TOKEN}`]}>
            <Routes>
                <Route path="/embed/tableaux/:token" element={<EmbedDraws />} />
            </Routes>
        </MemoryRouter>,
    )
}

describe('EmbedDraws', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        useEmbedDraws.mockReturnValue({ draws: DRAWS, loading: false, error: null })
    })

    it('place le logo avant le titre', () => {
        afficher()

        const entete = screen.getByRole('banner')
        const logo = entete.querySelector('img')
        const titre = entete.querySelector('h1')

        expect(logo).not.toBeNull()
        expect(titre).not.toBeNull()
        expect(
            logo!.compareDocumentPosition(titre!) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy()
    })

    it('place le nom du club sous le titre', () => {
        afficher()

        const entete = screen.getByRole('banner')
        const titre = entete.querySelector('h1')!
        const club = screen.getByText('Castle Club')

        expect(
            titre.compareDocumentPosition(club) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy()
    })

    it('place la navigation apres l en-tete', () => {
        afficher()

        const entete = screen.getByRole('banner')
        const navigation = screen.getByRole('navigation', { name: 'Séries' })

        expect(
            entete.compareDocumentPosition(navigation) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy()
    })

    it('centre la colonne de l en-tete', () => {
        afficher()

        const entete = screen.getByRole('banner')

        expect(entete.className).toContain('flex-col')
        expect(entete.className).toContain('items-center')
    })

    it('centre la navigation', () => {
        afficher()

        const navigation = screen.getByRole('navigation', { name: 'Séries' })

        expect(navigation.className).toContain('justify-center')
    })

    it('affiche la date de mise a jour', () => {
        afficher()

        expect(screen.getByText(/Mis à jour le/)).toBeInTheDocument()
    })

    it('signe du nom du produit', () => {
        // Le pied du cadre est vu par tous les joueurs du club sur le site
        // exterieur : c'est la seule mention du produit qu'ils croisent.
        afficher()

        expect(screen.getByText(/Racket Fest/)).toBeInTheDocument()
        expect(screen.queryByText(/Event Fest/)).toBeNull()
    })

    it('resserre ses marges sous 640 pixels', () => {
        // Chaque pixel de marge est un pixel de moins pour la grille, qui est
        // deja a l'etroit sur telephone.
        const { container } = afficher()

        const coque = container.querySelector('[data-embed-shell]')!

        expect(coque.className).toContain('p-3')
        expect(coque.className).toContain('sm:p-6')
    })

    it('annonce la hauteur marges comprises', () => {
        /*
         * `contentRect` d'un ResizeObserver decrit la boite de contenu : il
         * ignore les marges interieures du cadre. Annoncer cette valeur
         * laissait l'iframe trop courte de la hauteur des paddings, donc une
         * petite barre de defilement residuelle. On remesure le noeud entier.
         */
        let rappel: ResizeObserverCallback | null = null
        vi.stubGlobal('ResizeObserver', class {
            constructor(cb: ResizeObserverCallback) { rappel = cb }
            observe() {}
            unobserve() {}
            disconnect() {}
        })

        const mesure = vi
            .spyOn(Element.prototype, 'getBoundingClientRect')
            .mockReturnValue({ height: 300 } as DOMRect)

        afficher()
        publishEmbedHeight.mockClear()

        rappel!(
            [{ contentRect: { height: 252 } } as ResizeObserverEntry],
            {} as ResizeObserver,
        )

        expect(publishEmbedHeight).toHaveBeenCalledWith(300)
        expect(publishEmbedHeight).not.toHaveBeenCalledWith(252)

        mesure.mockRestore()
        vi.unstubAllGlobals()
    })

    it('masque la navigation quand une serie est epinglee', () => {
        render(
            <MemoryRouter initialEntries={[`/embed/tableaux/${TOKEN}?serie=4`]}>
                <Routes>
                    <Route path="/embed/tableaux/:token" element={<EmbedDraws />} />
                </Routes>
            </MemoryRouter>,
        )

        expect(screen.queryByRole('navigation', { name: 'Séries' })).toBeNull()
    })

    /*
     * Le bareme decide de la colonne Total. Il vient de la fonction SQL, qui
     * resout evenement puis club : le cadre ne peut pas lire ces tables, elles
     * sont derriere la RLS et son visiteur est anonyme.
     *
     * Le defaut constate en production : `DrawTable` ne recevait aucun bareme
     * et retombait sur ses valeurs codees en dur. Une victoire 3-1 valait 5
     * points dans l'application et 4 dans le cadre, sur les memes matchs.
     */
    describe('bareme des points', () => {
        const BOX = {
            id: 'g1',
            round_id: 'r1',
            group_name: 'Box 1',
            max_players: 6,
            created_at: '',
            players: [
                { id: 'p1', first_name: 'Fernando', last_name: 'Louge', phone: '', power_ranking: 0 },
                { id: 'p2', first_name: 'Laurent', last_name: 'Evers', phone: '', power_ranking: 0 },
            ],
        }

        const MATCH = {
            id: 'm1',
            group_id: 'g1',
            player1_id: 'p1',
            player2_id: 'p2',
            score: '3-1',
            winner_id: 'p1',
            match_date: '2026-09-14',
            match_time: '19:30',
        }

        /**
         * Le total affiche sur la ligne d'un joueur : derniere cellule.
         *
         * `getAllByText` et pas `getByText` : le nom figure deux fois dans le
         * DOM, en version abregee et en version complete, l'une des deux etant
         * masquee par CSS selon la largeur. Les deux sont sur la meme ligne.
         */
        const total = (nom: string) => {
            const ligne = screen.getAllByText(new RegExp(nom))[0].closest('tr')
            const cellules = ligne!.querySelectorAll('td')
            return cellules[cellules.length - 1].textContent
        }

        it('applique le bareme rendu par la base', () => {
            useEmbedDraws.mockReturnValue({
                draws: {
                    ...DRAWS,
                    groups: [BOX],
                    matches: [MATCH],
                    // 3-1 vaut 5 / 2 ici, la ou le defaut du code dit 4 / 1.
                    score_points: [
                        { score: '3-0', winner_points: 6, loser_points: 0 },
                        { score: '3-1', winner_points: 5, loser_points: 2 },
                        { score: '3-2', winner_points: 4, loser_points: 3 },
                        { score: 'ABS', winner_points: 4, loser_points: 0 },
                    ],
                },
                loading: false,
                error: null,
            })

            afficher()

            expect(total('Louge')).toBe('5')
            expect(total('Evers')).toBe('2')
        })

        it('retombe sur le defaut quand la base n en porte aucun', () => {
            useEmbedDraws.mockReturnValue({
                draws: { ...DRAWS, groups: [BOX], matches: [MATCH], score_points: null },
                loading: false,
                error: null,
            })

            afficher()

            expect(total('Louge')).toBe('4')
            expect(total('Evers')).toBe('1')
        })
    })
})
