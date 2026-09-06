import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { MockQueryBuilder } from '@/test/mocks/supabase'

/**
 * `auth.updateUser({ email })` ne change rien avant que l'utilisateur ait
 * ouvert le lien de confirmation. Au retour, `auth.users` porte la nouvelle
 * adresse et `profiles.email` l'ancienne : quelque chose doit les realigner.
 * Ce module le fait au chargement du profil, ce qui repare du meme coup les
 * divergences deja en base.
 */
const { mockSupabase, builder } = vi.hoisted(() => {
    const qb = {} as MockQueryBuilder
    qb.select = vi.fn(() => qb); qb.insert = vi.fn(() => qb); qb.update = vi.fn(() => qb)
    qb.delete = vi.fn(() => qb); qb.upsert = vi.fn(() => qb); qb.eq = vi.fn(() => qb)
    qb.in = vi.fn(() => qb); qb.order = vi.fn(() => qb); qb.single = vi.fn(() => qb)
    qb.maybeSingle = vi.fn(() => qb); qb.limit = vi.fn(() => qb); qb.lt = vi.fn(() => qb)
    qb.neq = vi.fn(() => qb); qb.not = vi.fn(() => qb); qb.is = vi.fn(() => qb)
    qb.gte = vi.fn(() => qb); qb.or = vi.fn(() => qb); qb.then = vi.fn()
    qb._resolve = (d: unknown) => { const p = Promise.resolve({ data: d, error: null }); qb.then = p.then.bind(p); return qb }
    qb._reject = (e: string) => { const p = Promise.resolve({ data: null, error: { message: e } }); qb.then = p.then.bind(p); return qb }
    return { mockSupabase: { from: vi.fn(() => qb) }, builder: qb }
})

vi.mock('@/lib/supabaseClient', () => ({ supabase: mockSupabase }))

import { syncProfileEmail } from '../syncProfileEmail'

describe('syncProfileEmail', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        builder._resolve(null)
    })

    it('aligne le profil sur l adresse du compte', async () => {
        const r = await syncProfileEmail('p1', 'nouvelle@club.fr', 'ancienne@club.fr')

        expect(r.synced).toBe(true)
        expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
        expect(builder.update).toHaveBeenCalledWith({ email: 'nouvelle@club.fr' })
        expect(builder.eq).toHaveBeenCalledWith('id', 'p1')
    })

    it('n ecrit rien quand les deux concordent', async () => {
        const r = await syncProfileEmail('p1', 'tim@club.fr', 'tim@club.fr')

        expect(r.synced).toBe(false)
        expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('ignore la casse et les espaces', async () => {
        // Sans ca, on reecrirait la meme adresse a chaque chargement de page.
        const r = await syncProfileEmail('p1', 'Tim@Club.FR', ' tim@club.fr ')

        expect(r.synced).toBe(false)
        expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('remplit un profil dont l email est absent', async () => {
        const r = await syncProfileEmail('p1', 'tim@club.fr', null)

        expect(r.synced).toBe(true)
        expect(builder.update).toHaveBeenCalledWith({ email: 'tim@club.fr' })
    })

    it('n ecrit rien sans adresse de compte', async () => {
        // Profil importe, sans compte d'authentification : il n'y a rien a
        // aligner, et surtout rien qui autorise a effacer son email.
        const r = await syncProfileEmail('p1', null, 'importe@club.fr')

        expect(r.synced).toBe(false)
        expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('rend l erreur sans la jeter', async () => {
        /*
         * Cet alignement tourne au chargement du profil. S'il echoue, la page
         * doit continuer a s'afficher : une adresse desynchronisee est un
         * defaut, une page blanche est une panne.
         */
        builder._reject('permission denied for table profiles')

        const r = await syncProfileEmail('p1', 'nouvelle@club.fr', 'ancienne@club.fr')

        expect(r.synced).toBe(false)
        expect(r.error).toContain('permission denied')
    })
})
