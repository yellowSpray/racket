import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

/**
 * La page integree est lue sans connexion. Tout passe par un seul appel RPC :
 * ce hook ne doit jamais interroger `groups`, `matches` ni `profiles`, qui
 * sont fermees au role anonyme.
 */
const { mockSupabase, rpc, from } = vi.hoisted(() => {
    const rpc = vi.fn()
    const from = vi.fn()
    return { mockSupabase: { rpc, from }, rpc, from }
})

vi.mock('@/lib/supabaseClient', () => ({ supabase: mockSupabase }))

import { useEmbedDraws } from '../useEmbedDraws'

const TOKEN = '864bc9e6-0590-4770-8a36-3de2176bc5ef'

const PAYLOAD = {
    success: true,
    club_name: 'Squash Lyon',
    logo_url: null,
    event_name: 'Mixed',
    round: { round_number: 4, start_date: '2026-09-01', end_date: '2026-09-30', status: 'active' },
    groups: [{
        id: 'g1', round_id: 'r1', group_name: 'Box 1', max_players: 6,
        players: [
            { id: 'p1', first_name: 'Alice', last_name: 'Martin' },
            { id: 'p2', first_name: 'Bob', last_name: null },
        ],
    }],
    matches: [{ id: 'm1', group_id: 'g1', player1_id: 'p1', player2_id: 'p2', score: '3-1' }],
}

describe('useEmbedDraws', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        rpc.mockResolvedValue({ data: PAYLOAD, error: null })
    })

    it('n interroge aucune table, seulement le RPC', async () => {
        const { result } = renderHook(() => useEmbedDraws(TOKEN, null))

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(from).not.toHaveBeenCalled()
        expect(rpc).toHaveBeenCalledWith('get_draws_by_embed_token', {
            p_token: TOKEN,
            p_round_number: null,
        })
    })

    it('transmet la serie epinglee', async () => {
        const { result } = renderHook(() => useEmbedDraws(TOKEN, 2))

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(rpc).toHaveBeenCalledWith('get_draws_by_embed_token', {
            p_token: TOKEN,
            p_round_number: 2,
        })
    })

    it('rend les boxes et les matchs', async () => {
        const { result } = renderHook(() => useEmbedDraws(TOKEN, null))

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(result.current.draws?.event_name).toBe('Mixed')
        expect(result.current.draws?.round.round_number).toBe(4)
        expect(result.current.draws?.groups).toHaveLength(1)
        expect(result.current.draws?.groups[0].players).toHaveLength(2)
        expect(result.current.draws?.matches).toHaveLength(1)
    })

    it('comble les champs que la base ne renvoie pas', async () => {
        // `phone` et `power_ranking` ne sortent jamais de la base : le type
        // partage les exige, la page ne les affiche pas.
        const { result } = renderHook(() => useEmbedDraws(TOKEN, null))

        await waitFor(() => expect(result.current.loading).toBe(false))

        const joueur = result.current.draws!.groups[0].players![0]
        expect(joueur.phone).toBe('')
        expect(joueur.power_ranking).toBe(0)
    })

    it('remplace un nom absent par une chaine vide', async () => {
        const { result } = renderHook(() => useEmbedDraws(TOKEN, null))

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(result.current.draws!.groups[0].players![1].last_name).toBe('')
    })

    it('remonte le motif rendu par la base', async () => {
        rpc.mockResolvedValue({ data: { success: false, error: 'Lien invalide' }, error: null })

        const { result } = renderHook(() => useEmbedDraws(TOKEN, null))

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(result.current.error).toBe('Lien invalide')
        expect(result.current.draws).toBeNull()
    })

    it('reste sobre quand l appel lui-meme echoue', async () => {
        // Un message d'erreur technique n'a rien a faire sur le site d'un club.
        rpc.mockResolvedValue({ data: null, error: { message: 'network down' } })

        const { result } = renderHook(() => useEmbedDraws(TOKEN, null))

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(result.current.error).toBe('Tableaux indisponibles')
    })

    it('n appelle rien sans jeton', async () => {
        const { result } = renderHook(() => useEmbedDraws(undefined, null))

        await waitFor(() => expect(result.current.loading).toBe(false))

        expect(rpc).not.toHaveBeenCalled()
        expect(result.current.error).toBe('Lien invalide')
    })
})
