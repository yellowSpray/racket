import { describe, it, expect } from 'vitest'
import { computePlayerMovements, describeMovement, movementLabel } from '../playerMovement'
import type { Group, GroupPlayer } from '@/types/draw'
import type { GroupStandings, PromotionResult } from '@/types/ranking'

function player(id: string, powerRanking = 1000): GroupPlayer {
    return {
        id,
        first_name: id.toUpperCase(),
        last_name: 'Test',
        phone: '',
        power_ranking: powerRanking,
    } as GroupPlayer
}

function group(id: string, name: string, players: GroupPlayer[]): Group {
    return {
        id,
        round_id: 'r1',
        group_name: name,
        max_players: 4,
        created_at: '',
        players,
    } as Group
}

function standings(groupId: string, groupName: string, rows: [string, number, number][]): GroupStandings {
    return {
        groupId,
        groupName,
        standings: rows.map(([playerId, rank, points]) => ({
            playerId,
            playerName: playerId,
            rank,
            played: 3,
            wins: 0,
            losses: 0,
            walkoversWon: 0,
            walkoversLost: 0,
            points,
        })),
    }
}

/**
 * Série précédente : Box 1 (alice, bob) — Box 2 (carol, dave).
 * Règles : 1 promu, 1 relégué → bob descend, carol monte.
 */
function fixture() {
    const previousGroups = [
        group('g1', 'Box 1', [player('alice'), player('bob')]),
        group('g2', 'Box 2', [player('carol'), player('dave')]),
    ]
    const previousStandings = [
        standings('g1', 'Box 1', [['alice', 1, 20], ['bob', 2, 8]]),
        standings('g2', 'Box 2', [['carol', 1, 22], ['dave', 2, 6]]),
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
    return { previousGroups, previousStandings, promotionResult }
}

describe('computePlayerMovements', () => {
    it('reconnait une promotion et compte les tableaux gagnes', () => {
        const { previousGroups, previousStandings, promotionResult } = fixture()
        const currentGroups = [
            group('n1', 'Box 1', [player('alice'), player('carol')]),
            group('n2', 'Box 2', [player('bob'), player('dave')]),
        ]

        const moves = computePlayerMovements({ currentGroups, previousGroups, previousStandings, promotionResult })
        const carol = moves.get('carol')!

        expect(carol.type).toBe('promotion')
        expect(carol.fromGroupName).toBe('Box 2')
        expect(carol.toGroupName).toBe('Box 1')
        expect(carol.tierDelta).toBe(1)
        expect(carol.rank).toBe(1)
        expect(carol.points).toBe(22)
    })

    it('reconnait une relegation', () => {
        const { previousGroups, previousStandings, promotionResult } = fixture()
        const currentGroups = [
            group('n1', 'Box 1', [player('alice'), player('carol')]),
            group('n2', 'Box 2', [player('bob'), player('dave')]),
        ]

        const bob = computePlayerMovements({ currentGroups, previousGroups, previousStandings, promotionResult }).get('bob')!

        expect(bob.type).toBe('relegation')
        expect(bob.tierDelta).toBe(-1)
        expect(bob.fromGroupName).toBe('Box 1')
        expect(bob.toGroupName).toBe('Box 2')
    })

    it('reconnait un maintien', () => {
        const { previousGroups, previousStandings, promotionResult } = fixture()
        const currentGroups = [
            group('n1', 'Box 1', [player('alice'), player('carol')]),
            group('n2', 'Box 2', [player('bob'), player('dave')]),
        ]

        const alice = computePlayerMovements({ currentGroups, previousGroups, previousStandings, promotionResult }).get('alice')!

        expect(alice.type).toBe('stay')
        expect(alice.tierDelta).toBe(0)
        expect(alice.expectedGroupName).toBeNull()
    })

    it('reconnait un nouveau joueur', () => {
        const { previousGroups, previousStandings, promotionResult } = fixture()
        const currentGroups = [
            group('n1', 'Box 1', [player('alice'), player('carol')]),
            group('n2', 'Box 2', [player('bob'), player('dave'), player('erin')]),
        ]

        const erin = computePlayerMovements({ currentGroups, previousGroups, previousStandings, promotionResult }).get('erin')!

        expect(erin.type).toBe('new')
        expect(erin.fromGroupName).toBeNull()
        expect(erin.fromTier).toBeNull()
        expect(erin.tierDelta).toBeNull()
    })

    it('distingue un joueur de retour d\'un vrai nouveau', () => {
        const { previousGroups, previousStandings, promotionResult } = fixture()
        const currentGroups = [
            group('n1', 'Box 1', [player('alice')]),
            group('n2', 'Box 2', [player('frank')]),
        ]

        const moves = computePlayerMovements({
            currentGroups, previousGroups, previousStandings, promotionResult,
            knownPlayerIds: new Set(['frank']),
        })

        expect(moves.get('frank')!.type).toBe('returning')
    })

    it('signale un placement qui ne suit pas les regles, avec le tableau attendu', () => {
        const { previousGroups, previousStandings, promotionResult } = fixture()
        // carol devait monter au Box 1, l'admin l'a laissee au Box 2
        const currentGroups = [
            group('n1', 'Box 1', [player('alice')]),
            group('n2', 'Box 2', [player('carol'), player('bob'), player('dave')]),
        ]

        const carol = computePlayerMovements({ currentGroups, previousGroups, previousStandings, promotionResult }).get('carol')!

        expect(carol.type).toBe('adjusted')
        expect(carol.expectedGroupName).toBe('Box 1')
        expect(carol.toGroupName).toBe('Box 2')
        expect(carol.tierDelta).toBe(0)
    })

    it('couvre tous les joueurs de la serie courante', () => {
        const { previousGroups, previousStandings, promotionResult } = fixture()
        const currentGroups = [
            group('n1', 'Box 1', [player('alice'), player('carol')]),
            group('n2', 'Box 2', [player('bob'), player('dave')]),
        ]

        const moves = computePlayerMovements({ currentGroups, previousGroups, previousStandings, promotionResult })

        expect([...moves.keys()].sort()).toEqual(['alice', 'bob', 'carol', 'dave'])
    })

    it('ne renvoie rien quand il n\'y a pas de serie precedente', () => {
        const currentGroups = [group('n1', 'Box 1', [player('alice')])]

        const moves = computePlayerMovements({
            currentGroups,
            previousGroups: [],
            previousStandings: [],
            promotionResult: { moves: [], stayingPlayers: [] },
        })

        expect(moves.get('alice')!.type).toBe('new')
    })

    it('gere un tableau supprime : le joueur descend de deux crans', () => {
        const previousGroups = [
            group('g1', 'Box 1', [player('alice')]),
            group('g2', 'Box 2', [player('bob')]),
            group('g3', 'Box 3', [player('carol')]),
        ]
        const previousStandings = [
            standings('g1', 'Box 1', [['alice', 1, 20]]),
            standings('g2', 'Box 2', [['bob', 1, 15]]),
            standings('g3', 'Box 3', [['carol', 1, 10]]),
        ]
        const promotionResult: PromotionResult = {
            moves: [],
            stayingPlayers: [
                { playerId: 'alice', groupId: 'g1' },
                { playerId: 'bob', groupId: 'g2' },
                { playerId: 'carol', groupId: 'g3' },
            ],
        }
        // Il ne reste que deux tableaux : alice se retrouve au Box 2
        const currentGroups = [
            group('n1', 'Box 1', [player('bob')]),
            group('n2', 'Box 2', [player('alice'), player('carol')]),
        ]

        const alice = computePlayerMovements({ currentGroups, previousGroups, previousStandings, promotionResult }).get('alice')!

        expect(alice.type).toBe('adjusted')
        expect(alice.tierDelta).toBe(-1)
        expect(alice.expectedGroupName).toBe('Box 1')
    })
})

describe('describeMovement', () => {
    const base = {
        playerId: 'p', toGroupName: 'Box 2', toTier: 1,
        fromGroupName: 'Box 3', fromTier: 2, tierDelta: 1,
        rank: 1, points: 24, expectedGroupName: null,
    }

    it('explique une promotion avec le rang et les points', () => {
        expect(describeMovement({ ...base, type: 'promotion' }))
            .toBe('1er du Box 3 avec 24 pts → promu au Box 2')
    })

    it('accorde le rang au-dela du premier', () => {
        expect(describeMovement({ ...base, type: 'relegation', rank: 5, fromGroupName: 'Box 1', points: 6 }))
            .toBe('5e du Box 1 avec 6 pts → relégué au Box 2')
    })

    it('explique un maintien', () => {
        expect(describeMovement({ ...base, type: 'stay' }))
            .toContain('se maintient au Box 2')
    })

    it('explique un joueur absent de la serie precedente par son classement', () => {
        expect(describeMovement({ ...base, type: 'new', fromGroupName: null, rank: null, points: null }))
            .toBe('Absent de la série précédente → placé au Box 2 selon son classement')
    })

    it('nomme le tableau attendu quand le placement en devie', () => {
        expect(describeMovement({ ...base, type: 'adjusted', expectedGroupName: 'Box 1' }))
            .toContain('attendu au Box 1, placé au Box 2')
    })
})

describe('movementLabel', () => {
    it('donne un libelle court par type', () => {
        const base = {
            playerId: 'p', toGroupName: 'Box 1', toTier: 0,
            fromGroupName: null, fromTier: null, tierDelta: null,
            rank: null, points: null, expectedGroupName: null,
        }
        expect(movementLabel({ ...base, type: 'promotion' })).toBe('Monte')
        expect(movementLabel({ ...base, type: 'relegation' })).toBe('Descend')
        expect(movementLabel({ ...base, type: 'stay' })).toBe('Maintenu')
        expect(movementLabel({ ...base, type: 'new' })).toBe('Nouveau')
        expect(movementLabel({ ...base, type: 'returning' })).toBe('De retour')
        expect(movementLabel({ ...base, type: 'adjusted' })).toBe('Ajusté')
    })
})
