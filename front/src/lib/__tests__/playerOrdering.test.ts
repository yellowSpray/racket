import { describe, it, expect } from 'vitest'
import { buildPlacementContext, comparePlacement, placementCategory } from '../playerOrdering'
import { calculatePromotions } from '../promotionEngine'
import { buildProposedGroups } from '../buildProposedGroups'
import type { Group, GroupPlayer } from '@/types/draw'
import type { GroupStandings } from '@/types/ranking'

/**
 * Série 1 réelle du Castle Club : 6 tableaux, 2 montées et 2 descentes,
 * trois joueurs qui ne se réinscrivent pas (Geoffroy, Daniel, Michel).
 * Chaque entrée est [nom, points].
 */
const SERIE_1: [string, [string, number][]][] = [
    ['Box 1', [['Timothy', 25], ['Renaud', 23], ['Peter', 18], ['Cyrille', 16], ['Christopher', 8], ['Charles', 6]]],
    ['Box 2', [['NicolasD', 18], ['Fernando', 18], ['Vanzeune', 14], ['Vivien', 8], ['Evers', 6]]],
    ['Box 3', [['Gilles', 25], ['Serge', 17], ['Leigh', 17], ['Richard', 15], ['Ramiro', 13], ['Fred', 0]]],
    ['Box 4', [['Alexandra', 19], ['François', 18], ['Edwin', 13], ['Romain', 11], ['Geoffroy', 9]]],
    ['Box 5', [['Sacha', 18], ['Raphaël', 14], ['Mélany', 13], ['Stéphane', 13], ['Daniel', 0]]],
    ['Box 6', [['Michel', 21], ['Patrick', 16], ['Damry', 14], ['Patrice', 13], ['Florianne', 6]]],
]

const DEPARTED = new Set(['Geoffroy', 'Daniel', 'Michel'])

/** Classements de force volontairement contraires aux points, pour piéger un tri par power_ranking. */
const POWER_RANKING: Record<string, number> = {
    Leigh: 402, Richard: 416,   // Leigh est mieux classé aux points, moins bien en R
    Ramiro: 450, Fred: 500,     // Ramiro a 13 pts, Fred 0, mais Fred a un meilleur R
}

function player(name: string): GroupPlayer {
    return { id: name, first_name: name, last_name: '', phone: '', power_ranking: POWER_RANKING[name] ?? 300 } as GroupPlayer
}

function fixture() {
    const previousGroups: Group[] = SERIE_1.map(([name, rows], i) => ({
        id: `g${i}`, round_id: 'r1', group_name: name, max_players: 6, created_at: '',
        players: rows.map(([n]) => player(n)),
    } as Group))

    const previousStandings: GroupStandings[] = SERIE_1.map(([name, rows], i) => ({
        groupId: `g${i}`,
        groupName: name,
        standings: rows.map(([n, points], rank) => ({
            playerId: n, playerName: n, rank: rank + 1,
            played: 5, wins: 0, losses: 0, walkoversWon: 0, walkoversLost: 0, points,
        })),
    }))

    const promotionResult = calculatePromotions(
        previousStandings,
        { promoted_count: 2, relegated_count: 2 },
        previousGroups.map(g => g.id),
    )

    const registered = new Set(
        previousGroups.flatMap(g => (g.players ?? []).map(p => p.id)).filter(id => !DEPARTED.has(id))
    )

    return { previousGroups, previousStandings, promotionResult, registered }
}

function names(group: Group | undefined) {
    return (group?.players ?? []).map(p => p.id)
}

describe('placementCategory', () => {
    it('classe dans l\'ordre : arrivée d\'en haut, resté qui devait monter, maintenu, resté qui devait descendre, arrivée d\'en bas', () => {
        const ctx = {
            previousBoxIndexOf: new Map([['haut', 0], ['montant', 1], ['maintenu', 1], ['descendant', 1], ['bas', 2]]),
            targetBoxIndexOf: new Map([['haut', 1], ['montant', 0], ['maintenu', 1], ['descendant', 2], ['bas', 1]]),
            rankOf: new Map<string, number>(),
        }
        expect(placementCategory('haut', 1, ctx)).toBeLessThan(placementCategory('montant', 1, ctx))
        expect(placementCategory('montant', 1, ctx)).toBeLessThan(placementCategory('maintenu', 1, ctx))
        expect(placementCategory('maintenu', 1, ctx)).toBeLessThan(placementCategory('descendant', 1, ctx))
        expect(placementCategory('descendant', 1, ctx)).toBeLessThan(placementCategory('bas', 1, ctx))
    })

    it('renvoie un joueur inconnu en dernier', () => {
        const ctx = { previousBoxIndexOf: new Map(), targetBoxIndexOf: new Map(), rankOf: new Map() }
        expect(placementCategory('nouveau', 0, ctx)).toBeGreaterThan(placementCategory('nouveau', 0, {
            ...ctx, previousBoxIndexOf: new Map([['nouveau', 0]]), targetBoxIndexOf: new Map([['nouveau', 0]]),
        }))
    })
})

describe('Série 1 → Série 2, placements attendus', () => {
    function nextSeries() {
        const { previousGroups, previousStandings, promotionResult, registered } = fixture()
        const built = buildProposedGroups(previousGroups, previousStandings, promotionResult, registered, [], 6)
        const ctx = buildPlacementContext(previousGroups, previousStandings, promotionResult)
        // Ordre d'affichage appliqué comme dans la colonne « Départs »
        return built.map((group, index) => ({
            ...group,
            players: [...(group.players ?? [])].sort((a, b) => comparePlacement(a.id, b.id, index, ctx)),
        }))
    }

    it('Box 1 — inchangé : les quatre maintenus puis les deux montants', () => {
        expect(names(nextSeries()[0])).toEqual(['Timothy', 'Renaud', 'Peter', 'Cyrille', 'NicolasD', 'Fernando'])
    })

    it('Box 2 — Vivien reste faute de place, sous les maintenus et au-dessus des montants', () => {
        expect(names(nextSeries()[1])).toEqual(['Christopher', 'Charles', 'Vanzeune', 'Vivien', 'Gilles', 'Serge'])
    })

    it('Box 3 — Leigh passe devant Richard, conformement au classement de la serie precedente', () => {
        const box3 = names(nextSeries()[2])
        expect(box3.indexOf('Leigh')).toBeLessThan(box3.indexOf('Richard'))
    })

    it('Box 3 — Ramiro y reste, pas Fred : 13 points contre 0', () => {
        const next = nextSeries()
        expect(names(next[2])).toContain('Ramiro')
        expect(names(next[2])).not.toContain('Fred')
        expect(names(next[3])).toContain('Fred')
    })

    it('ne perd aucun joueur reinscrit', () => {
        const placed = nextSeries().flatMap(g => names(g)).sort()
        const expected = SERIE_1
            .flatMap(([, rows]) => rows.map(([n]) => n))
            .filter(n => !DEPARTED.has(n))
            .sort()
        expect(placed).toEqual(expected)
    })

    it('sort deja ordonne de buildProposedGroups, sans retri exterieur', () => {
        // La colonne Proposition consomme directement ce resultat : s'il fallait le
        // retrier, tout appelant qui l'oublie afficherait un ordre faux.
        const { previousGroups, previousStandings, promotionResult, registered } = fixture()
        const built = buildProposedGroups(previousGroups, previousStandings, promotionResult, registered, [], 6)

        expect(names(built[1])).toEqual(['Christopher', 'Charles', 'Vanzeune', 'Vivien', 'Gilles', 'Serge'])

        const box3 = names(built[2])
        expect(box3.indexOf('Leigh')).toBeLessThan(box3.indexOf('Richard'))
        expect(box3.indexOf('Vanzeune')).toBe(-1)
        expect(box3.indexOf('Ramiro')).toBeGreaterThan(box3.indexOf('Richard'))
    })
})
