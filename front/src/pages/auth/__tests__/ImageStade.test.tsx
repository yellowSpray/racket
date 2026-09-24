import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ImageStade } from '../ImageStade'

/*
 * L'image des ecrans d'acces pesait 8 Mo en PNG, chargee des la connexion, y
 * compris sur un telephone en 4G. Elle part en AVIF, WebP a defaut, en trois
 * largeurs, et le navigateur prend la plus petite qui suffit.
 */
describe('ImageStade', () => {
    function poser(sizes = '100vw') {
        const { container } = render(<ImageStade sizes={sizes} className="size-full" />)
        return container
    }

    it('propose l\'AVIF avant le WebP', () => {
        const sources = [...poser().querySelectorAll('picture source')]
        expect(sources.map(s => s.getAttribute('type'))).toEqual(['image/avif', 'image/webp'])
    })

    it('offre trois largeurs a chaque format', () => {
        for (const s of poser().querySelectorAll('picture source')) {
            const srcset = s.getAttribute('srcset')!
            for (const w of ['800w', '1400w', '2738w']) expect(srcset).toContain(w)
        }
    })

    it('transmet la taille affichee, pour que le navigateur choisisse', () => {
        const c = poser('(min-width: 1024px) 180vh, 1px')
        for (const s of c.querySelectorAll('picture source')) {
            expect(s.getAttribute('sizes')).toBe('(min-width: 1024px) 180vh, 1px')
        }
    })

    it('ne charge plus jamais le PNG', () => {
        expect(poser().innerHTML).not.toContain('.png')
    })

    // Decorative : le formulaire dit tout ce qu'il y a a dire.
    it('reste decorative', () => {
        const img = poser().querySelector('img')!
        expect(img).toHaveAttribute('alt', '')
        expect(img.getAttribute('src')).toMatch(/\.webp$/)
        expect(img.className).toContain('size-full')
    })
})
