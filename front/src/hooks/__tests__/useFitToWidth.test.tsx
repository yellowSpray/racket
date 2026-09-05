import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { useRef } from 'react'
import { useFitToWidth } from '../useFitToWidth'

/**
 * jsdom ne fait pas de mise en page : toutes les largeurs valent zero. On les
 * pose donc a la main, ce qui a l'avantage de decrire exactement le cas teste.
 */
function poser(el: Element, prop: 'clientWidth' | 'scrollWidth', valeur: number) {
    Object.defineProperty(el, prop, { value: valeur, configurable: true })
}

let observes: Element[] = []

function Sujet({
    dispo,
    naturel,
    signature = 'x',
    selecteur,
    naturelInterne,
}: {
    dispo: number
    naturel: number
    signature?: unknown
    selecteur?: string
    naturelInterne?: number
}) {
    const ref = useRef<HTMLDivElement>(null)
    useFitToWidth(ref, signature, selecteur)
    return (
        <div data-testid="parent">
            <div
                data-testid="cadre"
                ref={node => {
                    ref.current = node
                    if (node) {
                        poser(node, 'clientWidth', dispo)
                        poser(node, 'scrollWidth', naturel)
                    }
                }}
            >
                <table
                    data-testid="interne"
                    ref={t => { if (t && naturelInterne !== undefined) poser(t, 'scrollWidth', naturelInterne) }}
                >
                    <tbody><tr><td>x</td></tr></tbody>
                </table>
            </div>
        </div>
    )
}

describe('useFitToWidth', () => {
    beforeEach(() => {
        observes = []
        vi.stubGlobal('ResizeObserver', class {
            constructor(_cb: ResizeObserverCallback) { void _cb }
            observe(el: Element) { observes.push(el) }
            unobserve() {}
            disconnect() {}
        })
    })

    afterEach(() => vi.unstubAllGlobals())

    it('reduit le contenu qui deborde', () => {
        const { getByTestId } = render(<Sujet dispo={300} naturel={400} />)

        expect((getByTestId('cadre') as HTMLElement).style.zoom).toBe('0.75')
    })

    it('ne reduit rien quand le contenu tient', () => {
        const { getByTestId } = render(<Sujet dispo={500} naturel={400} />)

        expect((getByTestId('cadre') as HTMLElement).style.zoom).toBe('1')
    })

    it('observe le parent et non le cadre', () => {
        /*
         * La mesure se fait sur le cadre, mais c'est le parent qu'on observe :
         * sa largeur ne depend pas du zoom pose sur le cadre, la mesure ne
         * peut donc pas se declencher elle-meme en boucle.
         */
        const { getByTestId } = render(<Sujet dispo={300} naturel={400} />)

        expect(observes).toHaveLength(1)
        expect(observes[0]).toBe(getByTestId('parent'))
    })

    it('remesure quand le contenu change', () => {
        const { getByTestId, rerender } = render(<Sujet dispo={300} naturel={400} signature="a" />)
        expect((getByTestId('cadre') as HTMLElement).style.zoom).toBe('0.75')

        rerender(<Sujet dispo={300} naturel={600} signature="b" />)

        expect((getByTestId('cadre') as HTMLElement).style.zoom).toBe('0.6')
    })

    it('mesure le contenu designe et non le conteneur', () => {
        /*
         * Le tableau shadcn pose son propre overflow-x-auto : il absorbe tout
         * le debordement, et le conteneur exterieur annonce alors une largeur
         * naturelle egale a sa largeur visible. Mesure faite sur lui, on ne
         * reduisait jamais rien. Verifie en navigateur avant ce correctif.
         */
        const { getByTestId } = render(
            <Sujet dispo={300} naturel={300} selecteur="table" naturelInterne={400} />,
        )

        // 0.75 et non 1 : la mesure vient bien du tableau, pas du conteneur.
        expect((getByTestId('cadre') as HTMLElement).style.zoom).toBe('0.75')
    })

    it('retombe sur le conteneur si le contenu designe est absent', () => {
        const { getByTestId } = render(
            <Sujet dispo={300} naturel={400} selecteur=".introuvable" />,
        )

        expect((getByTestId('cadre') as HTMLElement).style.zoom).toBe('0.75')
    })

    it('rend sa taille normale au demontage', () => {
        const { getByTestId, unmount } = render(<Sujet dispo={300} naturel={400} />)
        const cadre = getByTestId('cadre') as HTMLElement

        unmount()

        expect(cadre.style.zoom).toBe('')
    })
})
