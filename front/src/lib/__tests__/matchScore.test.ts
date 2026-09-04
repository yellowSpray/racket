import { describe, it, expect } from 'vitest'
import {
    normalizeScoreForDb,
    computeWinnerId,
    orientScore,
    summarizeHeadToHead,
} from '../matchScore'
import type { Match } from '@/types/match'

describe('normalizeScoreForDb', () => {
    it('laisse le score tel quel vu du joueur 1', () => {
        expect(normalizeScoreForDb('3-1', true)).toBe('3-1')
    })

    it('inverse le score vu du joueur 2', () => {
        expect(normalizeScoreForDb('3-1', false)).toBe('1-3')
    })

    it('place l\'absence du bon cote', () => {
        expect(normalizeScoreForDb('ABS', true)).toBe('ABS-0')
        expect(normalizeScoreForDb('ABS', false)).toBe('0-ABS')
    })

    it('ne touche pas a une valeur non reconnue', () => {
        expect(normalizeScoreForDb('WO', true)).toBe('WO')
    })
})

describe('computeWinnerId', () => {
    it('designe le joueur 1 quand il marque plus', () => {
        expect(computeWinnerId('3-1', 'p1', 'p2')).toBe('p1')
    })

    it('designe le joueur 2 quand il marque plus', () => {
        expect(computeWinnerId('1-3', 'p1', 'p2')).toBe('p2')
    })

    it('donne la victoire a l\'adversaire du joueur absent', () => {
        expect(computeWinnerId('ABS-0', 'p1', 'p2')).toBe('p2')
        expect(computeWinnerId('0-ABS', 'p1', 'p2')).toBe('p1')
    })

    it('ne designe personne sur un score illisible', () => {
        expect(computeWinnerId('WO', 'p1', 'p2')).toBeNull()
    })
})

describe('orientScore', () => {
    const match = { id: 'm', player1_id: 'p1', player2_id: 'p2', score: '3-1' } as Match

    it('affiche le score du point de vue du joueur demande', () => {
        expect(orientScore(match, 'p1')).toBe('3-1')
        expect(orientScore(match, 'p2')).toBe('1-3')
    })

    it('renvoie une chaine vide sans score', () => {
        expect(orientScore({ ...match, score: null }, 'p1')).toBe('')
    })
})

describe('summarizeHeadToHead', () => {
    function match(id: string, p1: string, p2: string, winner: string | null, score: string | null): Match {
        return { id, player1_id: p1, player2_id: p2, winner_id: winner, score } as Match
    }

    it('compte les victoires de chaque cote', () => {
        const history = [
            match('1', 'a', 'b', 'a', '3-1'),
            match('2', 'b', 'a', 'a', '1-3'),
            match('3', 'a', 'b', 'b', '2-3'),
        ]
        expect(summarizeHeadToHead(history, 'a')).toEqual({ played: 3, wins: 2, losses: 1 })
    })

    it('ignore les matchs sans resultat', () => {
        const history = [
            match('1', 'a', 'b', 'a', '3-0'),
            match('2', 'a', 'b', null, null),
        ]
        expect(summarizeHeadToHead(history, 'a')).toEqual({ played: 1, wins: 1, losses: 0 })
    })

    it('compte une absence comme une defaite pour l\'absent', () => {
        const history = [match('1', 'a', 'b', 'b', 'ABS-0')]
        expect(summarizeHeadToHead(history, 'a')).toEqual({ played: 1, wins: 0, losses: 1 })
    })

    it('renvoie un bilan vide sans historique', () => {
        expect(summarizeHeadToHead([], 'a')).toEqual({ played: 0, wins: 0, losses: 0 })
    })
})
