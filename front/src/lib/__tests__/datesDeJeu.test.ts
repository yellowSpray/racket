import { describe, it, expect } from 'vitest'
import { datesDeJeu, dateParDefaut, dateVoisine, aujourdhuiLocal } from '../datesDeJeu'
import type { Match } from '@/types/match'

function match(date: string, id = date): Match {
  return {
    id, group_id: 'g', player1_id: 'p1', player2_id: 'p2',
    match_date: date, match_time: '19:00:00', court_number: 'Terrain 1',
    winner_id: null, score: null,
  }
}

describe('datesDeJeu', () => {
  it('rend les dates distinctes, triees', () => {
    const m = [match('2026-09-22', 'a'), match('2026-09-21', 'b'), match('2026-09-22', 'c')]
    expect(datesDeJeu(m)).toEqual(['2026-09-21', '2026-09-22'])
  })

  it('rend une liste vide sans match', () => {
    expect(datesDeJeu([])).toEqual([])
  })
})

/*
 * La date ouverte par defaut est la prochaine journee de jeu, pas la premiere
 * de la serie : on ouvre cet ecran pour le match de ce soir, pas pour celui
 * d'il y a trois semaines.
 */
describe('dateParDefaut', () => {
  const dates = ['2026-09-21', '2026-09-22', '2026-09-28']

  it('prend le jour meme quand il est une journee de jeu', () => {
    expect(dateParDefaut(dates, '2026-09-22')).toBe('2026-09-22')
  })

  it('prend la prochaine journee de jeu', () => {
    expect(dateParDefaut(dates, '2026-09-23')).toBe('2026-09-28')
  })

  it('prend la premiere quand la serie n\'a pas commence', () => {
    expect(dateParDefaut(dates, '2026-09-01')).toBe('2026-09-21')
  })

  /* Serie terminee : la derniere journee, celle dont on saisit les scores. */
  it('prend la derniere quand tout est passe', () => {
    expect(dateParDefaut(dates, '2026-10-05')).toBe('2026-09-28')
  })

  it('rend null sans date', () => {
    expect(dateParDefaut([], '2026-09-22')).toBeNull()
  })
})

describe('dateVoisine', () => {
  const dates = ['2026-09-21', '2026-09-22', '2026-09-28']

  it('avance et recule d\'une journee de jeu', () => {
    expect(dateVoisine(dates, '2026-09-22', 1)).toBe('2026-09-28')
    expect(dateVoisine(dates, '2026-09-22', -1)).toBe('2026-09-21')
  })

  /*
   * Aux deux bouts il n'y a rien : c'est ce `null` qui desactive la fleche,
   * plutot qu'une fleche qui tourne en rond et ramene au debut.
   */
  it('rend null aux deux bouts', () => {
    expect(dateVoisine(dates, '2026-09-21', -1)).toBeNull()
    expect(dateVoisine(dates, '2026-09-28', 1)).toBeNull()
  })

  it('rend null sur une date inconnue', () => {
    expect(dateVoisine(dates, '2026-09-25', 1)).toBeNull()
  })
})

describe('aujourdhuiLocal', () => {
  it('rend la date au format ISO', () => {
    expect(aujourdhuiLocal(new Date('2026-09-24T12:00:00'))).toBe('2026-09-24')
  })

  /*
   * Le piege : `toISOString` aurait rendu la veille pour une heure du matin a
   * Bruxelles, et l'ecran se serait ouvert sur la mauvaise journee.
   */
  it('lit l\'heure locale et non UTC', () => {
    const minuitPasse = new Date('2026-09-24T00:30:00')
    expect(aujourdhuiLocal(minuitPasse)).toBe('2026-09-24')
  })
})
