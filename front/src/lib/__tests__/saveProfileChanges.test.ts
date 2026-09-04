import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { MockQueryBuilder } from '@/test/mocks/supabase'

/**
 * L'ecriture du profil echouait en production, et l'ecran n'en savait rien :
 * l'appel n'etait pas destructure, donc l'erreur rendue par Supabase etait
 * jetee, la boite de dialogue se fermait et l'ancien profil se rechargeait.
 * Ce module rend l'echec au lieu de l'avaler.
 */
const { mockSupabase, builder, updateUser } = vi.hoisted(() => {
    const qb = {} as MockQueryBuilder
    qb.select = vi.fn(() => qb); qb.insert = vi.fn(() => qb); qb.update = vi.fn(() => qb)
    qb.delete = vi.fn(() => qb); qb.upsert = vi.fn(() => qb); qb.eq = vi.fn(() => qb)
    qb.in = vi.fn(() => qb); qb.order = vi.fn(() => qb); qb.single = vi.fn(() => qb)
    qb.maybeSingle = vi.fn(() => qb); qb.limit = vi.fn(() => qb); qb.lt = vi.fn(() => qb)
    qb.neq = vi.fn(() => qb); qb.not = vi.fn(() => qb); qb.is = vi.fn(() => qb)
    qb.gte = vi.fn(() => qb); qb.or = vi.fn(() => qb); qb.then = vi.fn()
    qb._resolve = (d: unknown) => { const p = Promise.resolve({ data: d, error: null }); qb.then = p.then.bind(p); return qb }
    qb._reject = (e: string) => { const p = Promise.resolve({ data: null, error: { message: e } }); qb.then = p.then.bind(p); return qb }

    const updateUser = vi.fn<() => Promise<{ error: { message: string } | null }>>(
        () => Promise.resolve({ error: null }),
    )

    return {
        mockSupabase: { from: vi.fn(() => qb), auth: { updateUser } },
        builder: qb,
        updateUser,
    }
})

vi.mock('@/lib/supabaseClient', () => ({ supabase: mockSupabase }))

import { saveProfileChanges } from '../saveProfileChanges'

const EDITS = {
    first_name: 'Tim',
    last_name: 'Martin',
    email: 'tim@club.fr',
    phone: '0600000000',
    address: '1 rue du Squash',
}

describe('saveProfileChanges', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        builder._resolve(null)
        updateUser.mockResolvedValue({ error: null })
    })

    it('rend un succes quand l ecriture passe', async () => {
        const r = await saveProfileChanges('p1', EDITS)

        expect(r).toEqual({ ok: true, error: null })
        expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
        expect(builder.eq).toHaveBeenCalledWith('id', 'p1')
    })

    it('rend l erreur de la base au lieu de l avaler', async () => {
        // Le cas qui se produisait reellement : la policy refusait l'ecriture.
        builder._reject('infinite recursion detected in policy for relation "profiles"')

        const r = await saveProfileChanges('p1', EDITS)

        expect(r.ok).toBe(false)
        expect(r.error).toContain('infinite recursion')
    })

    it('ne touche pas au mot de passe si le profil n a pas pu etre ecrit', async () => {
        // Sinon on changerait le mot de passe d'un profil qu'on vient d'echouer
        // a modifier, en laissant l'utilisateur croire que tout est passe.
        builder._reject('permission denied for table profiles')

        const r = await saveProfileChanges('p1', EDITS, 'nouveau-mot-de-passe')

        expect(r.ok).toBe(false)
        expect(updateUser).not.toHaveBeenCalled()
    })

    it('change le mot de passe quand il est fourni et que le profil est ecrit', async () => {
        const r = await saveProfileChanges('p1', EDITS, 'nouveau-mot-de-passe')

        expect(r).toEqual({ ok: true, error: null })
        expect(updateUser).toHaveBeenCalledWith({ password: 'nouveau-mot-de-passe' })
    })

    it('rend l erreur du changement de mot de passe', async () => {
        updateUser.mockResolvedValue({ error: { message: 'mot de passe trop court' } })

        const r = await saveProfileChanges('p1', EDITS, 'court')

        expect(r.ok).toBe(false)
        expect(r.error).toBe('mot de passe trop court')
    })

    it('ne demande pas de changement de mot de passe sans mot de passe', async () => {
        await saveProfileChanges('p1', EDITS)

        expect(updateUser).not.toHaveBeenCalled()
    })
})
