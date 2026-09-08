import { describe, it, expect } from 'vitest'
import {
    normalizeScoreForDb,
    computeWinnerId,
    orientScore,
    summarizeHeadToHead,
    isMatchUnplayed,
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

/**
 * Un match dont l'heure est passee et dont personne n'a saisi le score.
 *
 * Le tableau le signalait comme n'importe quel match a venir, une date et une
 * heure, alors que c'est la seule case qui demande une action. Un joueur
 * regardant le tableau publie ne pouvait pas distinguer « ca se joue jeudi »
 * de « ca devait se jouer jeudi dernier et personne n'a rien dit ».
 *
 * Le delai de 1h30 apres l'heure prevue laisse le temps de jouer le match et
 * de saisir le resultat avant que la case ne change d'aspect.
 */
describe('isMatchUnplayed', () => {
    const match = (score: string | null, date: string, time: string) =>
        ({ score, match_date: date, match_time: time }) as Pick<
            Match, 'score' | 'match_date' | 'match_time'
        >

    // Le match du 7 septembre a 19h30 : le delai expire a 21h00.
    const LE_MATCH = match(null, '2026-09-07', '19:30:00+00')

    it('reste a venir avant l heure du match', () => {
        expect(isMatchUnplayed(LE_MATCH, new Date('2026-09-07T18:00'))).toBe(false)
    })

    it('reste a venir pendant le delai de saisie', () => {
        expect(isMatchUnplayed(LE_MATCH, new Date('2026-09-07T20:59'))).toBe(false)
    })

    it('bascule une fois le delai passe', () => {
        expect(isMatchUnplayed(LE_MATCH, new Date('2026-09-07T21:01'))).toBe(true)
    })

    it('ne bascule jamais si le score est saisi', () => {
        const joue = match('3-1', '2026-09-07', '19:30:00+00')
        expect(isMatchUnplayed(joue, new Date('2026-09-30T12:00'))).toBe(false)
    })

    it('traite un forfait comme un match joue', () => {
        // « ABS » est un resultat, pas une absence de resultat.
        const forfait = match('ABS-0', '2026-09-07', '19:30:00+00')
        expect(isMatchUnplayed(forfait, new Date('2026-09-30T12:00'))).toBe(false)
    })

    it('lit l heure murale et ignore le decalage stocke', () => {
        // La base rend « 19:30:00+00 », mais toute l'application traite cette
        // valeur comme une heure locale : formatTimeForInput coupe le decalage
        // et affiche 19:30. La bascule doit suivre la meme lecture, sans quoi
        // elle se produirait a une heure differente de celle affichee.
        expect(isMatchUnplayed(match(null, '2026-09-07', '19:30:00+02'),
                               new Date('2026-09-07T20:59'))).toBe(false)
        expect(isMatchUnplayed(match(null, '2026-09-07', '19:30:00+02'),
                               new Date('2026-09-07T21:01'))).toBe(true)
    })

    it('ne bascule pas sur une date ou une heure illisible', () => {
        // Mieux vaut afficher un match a venir qu'alarmer a tort.
        expect(isMatchUnplayed(match(null, '', '19:30:00+00'), new Date('2026-09-30T12:00'))).toBe(false)
        expect(isMatchUnplayed(match(null, '2026-09-07', ''), new Date('2026-09-30T12:00'))).toBe(false)
    })
})
