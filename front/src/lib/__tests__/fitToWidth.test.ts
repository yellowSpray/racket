import { describe, it, expect } from 'vitest'
import { computeZoom, MIN_ZOOM } from '../fitToWidth'

describe('computeZoom', () => {
    it('ne reduit rien quand le contenu tient deja', () => {
        expect(computeZoom(400, 360)).toBe(1)
        expect(computeZoom(360, 360)).toBe(1)
    })

    it('reduit juste ce qu il faut', () => {
        expect(computeZoom(320, 400)).toBeCloseTo(0.8, 5)
        expect(computeZoom(349, 359)).toBeCloseTo(0.972, 3)
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
