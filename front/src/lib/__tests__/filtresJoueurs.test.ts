import { describe, it, expect } from 'vitest'
import { compterParFiltre, FILTRES_JOUEURS, repondAuFiltre } from '../filtresJoueurs'
import type { PlayerType } from '@/types/player'

function joueur(p: Partial<PlayerType>): PlayerType {
    return {
        id: 'j', first_name: 'Jean', last_name: 'Dupont', full_name: 'Jean Dupont',
        email: '', phone: '', arrival: '', departure: '', unavailable: [],
        status: [], payments: [], power_ranking: 0, box: '', ...p,
    } as PlayerType
}

describe('les filtres de la liste des joueurs', () => {
    it('laisse tout passer sur « Tous »', () => {
        expect(repondAuFiltre(joueur({ status: [] }), 'all')).toBe(true)
    })

    it('lit les statuts du joueur', () => {
        const actif = joueur({ status: ['active', 'member'] })
        expect(repondAuFiltre(actif, 'active')).toBe(true)
        expect(repondAuFiltre(actif, 'member')).toBe(true)
        expect(repondAuFiltre(actif, 'inactive')).toBe(false)
    })

    /*
     * Un joueur peut porter plusieurs statuts, actif et membre par exemple :
     * les filtres ne sont donc pas exclusifs et leurs comptes ne s'additionnent
     * pas jusqu'au total. C'est voulu, et c'est pourquoi « Tous » porte son
     * propre compte plutot que la somme des autres.
     */
    it('ne cloisonne pas les statuts entre eux', () => {
        const joueurs = [joueur({ id: 'a', status: ['active', 'member'] })]
        const comptes = compterParFiltre(joueurs)
        expect(comptes.active).toBe(1)
        expect(comptes.member).toBe(1)
        expect(comptes.all).toBe(1)
    })

    // Le paiement n'est pas un statut de joueur, il vit dans sa propre colonne.
    it('prend les impayes sur le statut de paiement, pas sur les statuts', () => {
        const mauvaisPayeur = joueur({ status: ['active'], payment_status: 'unpaid' })
        expect(repondAuFiltre(mauvaisPayeur, 'unpaid')).toBe(true)
        expect(repondAuFiltre(joueur({ payment_status: 'paid' }), 'unpaid')).toBe(false)
        // Un joueur sans paiement connu n'est pas un impaye.
        expect(repondAuFiltre(joueur({}), 'unpaid')).toBe(false)
    })

    it('supporte un joueur sans statut du tout', () => {
        expect(repondAuFiltre(joueur({ status: undefined as never }), 'active')).toBe(false)
    })

    it('compte les six filtres en une passe', () => {
        const joueurs = [
            joueur({ id: 'a', status: ['active', 'member'] }),
            joueur({ id: 'b', status: ['inactive', 'member'], payment_status: 'unpaid' }),
            joueur({ id: 'c', status: ['active', 'visitor'] }),
        ]
        expect(compterParFiltre(joueurs)).toEqual({
            all: 3, active: 2, inactive: 1, member: 2, visitor: 1, unpaid: 1,
        })
    })

    it('garde l\'ordre des filtres, « Tous » en tete', () => {
        expect(FILTRES_JOUEURS.map(f => f.cle))
            .toEqual(['all', 'active', 'inactive', 'member', 'visitor', 'unpaid'])
    })
})
