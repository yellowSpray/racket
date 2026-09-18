import { describe, it, expect } from 'vitest'
import { computeZoom, MARGE, MIN_ZOOM } from '../fitToWidth'

describe('computeZoom', () => {
    it('ne reduit rien quand le contenu tient deja', () => {
        expect(computeZoom(400, 360)).toBe(1)
        expect(computeZoom(360, 360)).toBe(1)
    })

    /*
     * Le facteur garde deux pixels sous le pied. Au facteur exact, le contenu
     * reduit fait la largeur de sa boite au centieme pres : mesure a 375 px, le
     * tableau tombait a 0.03 px du bord. Le moindre arrondi de densite d'ecran
     * ou d'echelle du systeme le fait deborder, et une barre de defilement
     * apparait pour rien.
     */
    it('reduit juste ce qu il faut, deux pixels de marge compris', () => {
        expect(computeZoom(320, 400)).toBeCloseTo((320 - MARGE) / 400, 5)
        expect(computeZoom(349, 359)).toBeCloseTo((349 - MARGE) / 359, 5)
    })

    it('laisse le contenu reduit plus etroit que sa boite', () => {
        for (const [dispo, naturel] of [[320, 400], [331, 466], [354, 465], [456, 463]]) {
            expect(naturel * computeZoom(dispo, naturel)).toBeLessThan(dispo)
        }
    })

    it('s arrete a la limite de lisibilite', () => {
        // Au dela, mieux vaut la barre de defilement qu'un texte illisible.
        expect(computeZoom(100, 1000)).toBe(MIN_ZOOM)
    })

    it('ne reduit pas sur une mesure absente', () => {
        // Premier rendu, element detache du document : les deux valent zero.
        expect(computeZoom(0, 0)).toBe(1)
        expect(computeZoom(0, 400)).toBe(1)
        expect(computeZoom(400, 0)).toBe(1)
    })

    it('ne reduit pas sur une mesure aberrante', () => {
        expect(computeZoom(-100, 400)).toBe(1)
        expect(computeZoom(NaN, 400)).toBe(1)
        expect(computeZoom(400, Infinity)).toBe(1)
    })
})
