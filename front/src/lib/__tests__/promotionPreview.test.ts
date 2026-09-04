import { describe, it, expect } from 'vitest'
import { applyPromotionMoves } from '../promotionPreview'
import { calculatePromotions } from '../promotionEngine'
import { calculateGroupStandings } from '../rankingEngine'
import type { Group, GroupPlayer } from '@/types/draw'
import type { GroupStandings, PromotionResult } from '@/types/ranking'

function player(id: string): GroupPlayer {
    return { id, first_name: id, last_name: '', phone: '', power_ranking: 100 } as GroupPlayer
}

function group(id: string, name: string, ids: string[]): Group {
    return {
        id, round_id: 'r1', group_name: name, max_players: 5, created_at: '',
        players: ids.map(player),
    } as Group
}

/** Classement direct : l'ordre des lignes fait foi, les points sont décroissants. */
function standings(groupId: string, groupName: string, ids: string[]): GroupStandings {
    return {
        groupId,
        groupName,
        standings: ids.map((playerId, i) => ({
            playerId, playerName: playerId, rank: i + 1,
            played: 4, wins: 0, losses: 0, walkoversWon: 0, walkoversLost: 0,
            points: 100 - i,
        })),
    }
}

/**
 * Reproduit la situation signalée : 6 tableaux, 2 montées et 2 descentes.
 * Les tableaux 1 à 3 sont du remplissage ; seuls les 4, 5 et 6 nous intéressent.
 */
function realCase() {
    const rosters: [string, string, string[]][] = [
        ['g1', 'Box 1', ['a1', 'a2', 'a3', 'a4', 'a5']],
        ['g2', 'Box 2', ['b1', 'b2', 'b3', 'b4', 'b5']],
        ['g3', 'Box 3', ['c1', 'c2', 'c3', 'c4', 'c5']],
        ['g4', 'Box 4', ['Alexandra', 'François', 'Edwin', 'Romain', 'Geoffroy']],
        ['g5', 'Box 5', ['Sacha', 'Raphaël', 'Mélany', 'Stéphane', 'Daniel']],
        ['g6', 'Box 6', ['Michel', 'Patrick', 'Nicolas', 'Patrice', 'Florianne']],
    ]
    const previousGroups = rosters.map(([id, name, ids]) => group(id, name, ids))
    const previousStandings = rosters.map(([id, name, ids]) => standings(id, name, ids))
    const promotionResult = calculatePromotions(
        previousStandings,
        { promoted_count: 2, relegated_count: 2 },
        previousGroups.map(g => g.id),
    )
    return { previousGroups, promotionResult }
}

/** Nom du tableau où se trouve un joueur. */
function boxOf(groups: Group[], playerId: string): string | undefined {
    return groups.find(g => (g.players ?? []).some(p => p.id === playerId))?.group_name
}

describe('applyPromotionMoves — cas réel signalé', () => {
    it('descend Geoffroy du Box 4 au Box 5, même s\'il ne se réinscrit pas', () => {
        const { previousGroups, promotionResult } = realCase()
        const after = applyPromotionMoves(previousGroups, promotionResult)
        expect(boxOf(after, 'Geoffroy')).toBe('Box 5')
    })

    it('descend Daniel du Box 5 au Box 6', () => {
        const { previousGroups, promotionResult } = realCase()
        const after = applyPromotionMoves(previousGroups, promotionResult)
        expect(boxOf(after, 'Daniel')).toBe('Box 6')
    })

    it('fait monter Michel du Box 6 au Box 5 — il ne disparaît pas', () => {
        const { previousGroups, promotionResult } = realCase()
        const after = applyPromotionMoves(previousGroups, promotionResult)
        expect(boxOf(after, 'Michel')).toBe('Box 5')
    })

    it('ne perd aucun joueur', () => {
        const { previousGroups, promotionResult } = realCase()
        const after = applyPromotionMoves(previousGroups, promotionResult)

        const before = previousGroups.flatMap(g => (g.players ?? []).map(p => p.id)).sort()
        const now = after.flatMap(g => (g.players ?? []).map(p => p.id)).sort()
        expect(now).toEqual(before)
    })

    it('conserve le nombre de tableaux', () => {
        const { previousGroups, promotionResult } = realCase()
        expect(applyPromotionMoves(previousGroups, promotionResult)).toHaveLength(6)
    })
})

describe('applyPromotionMoves', () => {
    const previousGroups = [
        group('g1', 'Box 1', ['alice', 'bob']),
        group('g2', 'Box 2', ['carol', 'dave']),
    ]
    const promotionResult: PromotionResult = {
        moves: [
            { playerId: 'bob', playerName: 'bob', fromGroupId: 'g1', fromGroupName: 'Box 1', toGroupId: 'g2', toGroupName: 'Box 2', type: 'relegation' },
            { playerId: 'carol', playerName: 'carol', fromGroupId: 'g2', fromGroupName: 'Box 2', toGroupId: 'g1', toGroupName: 'Box 1', type: 'promotion' },
        ],
        stayingPlayers: [
            { playerId: 'alice', groupId: 'g1' },
            { playerId: 'dave', groupId: 'g2' },
        ],
    }

    it('place chaque joueur dans son tableau cible', () => {
        const after = applyPromotionMoves(previousGroups, promotionResult)
        expect((after[0].players ?? []).map(p => p.id)).toContain('carol')
        expect((after[1].players ?? []).map(p => p.id)).toContain('bob')
    })

    it('ordonne : arrivées d\'en haut, puis maintenus, puis arrivées d\'en bas', () => {
        const groups = [
            group('g1', 'Box 1', ['top1', 'top2']),
            group('g2', 'Box 2', ['mid']),
            group('g3', 'Box 3', ['low1', 'low2']),
        ]
        const result: PromotionResult = {
            moves: [
                { playerId: 'top2', playerName: '', fromGroupId: 'g1', fromGroupName: '', toGroupId: 'g2', toGroupName: '', type: 'relegation' },
                { playerId: 'low1', playerName: '', fromGroupId: 'g3', fromGroupName: '', toGroupId: 'g2', toGroupName: '', type: 'promotion' },
            ],
            stayingPlayers: [
                { playerId: 'top1', groupId: 'g1' },
                { playerId: 'mid', groupId: 'g2' },
                { playerId: 'low2', groupId: 'g3' },
            ],
        }

        const box2 = applyPromotionMoves(groups, result)[1]
        expect((box2.players ?? []).map(p => p.id)).toEqual(['top2', 'mid', 'low1'])
    })

    it('laisse en place un joueur dont le moteur ne dit rien', () => {
        const after = applyPromotionMoves(previousGroups, { moves: [], stayingPlayers: [] })
        expect((after[0].players ?? []).map(p => p.id)).toEqual(['alice', 'bob'])
        expect((after[1].players ?? []).map(p => p.id)).toEqual(['carol', 'dave'])
    })

    it('renvoie une liste vide sans tableau precedent', () => {
        expect(applyPromotionMoves([], { moves: [], stayingPlayers: [] })).toEqual([])
    })

    it('n\'altere pas les tableaux recus', () => {
        const after = applyPromotionMoves(previousGroups, promotionResult)
        expect((previousGroups[0].players ?? []).map(p => p.id)).toEqual(['alice', 'bob'])
        expect(after[0]).not.toBe(previousGroups[0])
    })
})

describe('coherence avec le moteur de classement', () => {
    it('les deux derniers du classement descendent, meme s\'ils quittent le club', () => {
        // Aucun match joué : rankingEngine classe alors par ordre alphabétique
        const groups = [group('g1', 'Box 1', ['x1', 'x2', 'x3']), group('g2', 'Box 2', ['y1', 'y2', 'y3'])]
        const gs = groups.map(g => calculateGroupStandings(
            [], g.id, g.group_name,
            (g.players ?? []).map(p => ({ id: p.id, first_name: p.first_name, last_name: p.last_name })),
            { score_points: [] },
        ))
        const result = calculatePromotions(gs, { promoted_count: 1, relegated_count: 1 }, ['g1', 'g2'])
        const after = applyPromotionMoves(groups, result)

        const lastOfBox1 = gs[0].standings[gs[0].standings.length - 1].playerId
        expect(boxOf(after, lastOfBox1)).toBe('Box 2')
    })
})
