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
})
