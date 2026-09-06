import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { MockQueryBuilder } from '@/test/mocks/supabase'

/**
 * Deux defauts successifs sur cet ecran.
 *
 * Le premier : l'ecriture du profil echouait en production et l'ecran n'en
 * savait rien, l'appel n'etant pas destructure. Ce module rend l'echec.
 *
 * Le second : l'email etait ecrit dans `profiles` et nulle part ailleurs.
 * L'adresse de connexion vit dans `auth.users`, que seule l'API
 * d'authentification met a jour. L'utilisateur croyait changer son
 * identifiant, il ne changeait qu'un affichage.
 */
const { mockSupabase, builder, updateUser, getUser } = vi.hoisted(() => {
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
    const getUser = vi.fn<() => Promise<{ data: { user: { email: string } | null } }>>(
        () => Promise.resolve({ data: { user: { email: 'tim@club.fr' } } }),
    )

    return {
        mockSupabase: { from: vi.fn(() => qb), auth: { updateUser, getUser } },
        builder: qb,
        updateUser,
        getUser,
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

/** Ce qui a reellement ete envoye a `profiles.update`. */
function champsEcrits() {
    const appels = (builder.update as unknown as { mock: { calls: [Record<string, unknown>][] } }).mock.calls
    return appels[0][0]
}

describe('saveProfileChanges', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        builder._resolve(null)
        updateUser.mockResolvedValue({ error: null })
        getUser.mockResolvedValue({ data: { user: { email: 'tim@club.fr' } } })
    })

    it('rend un succes quand l ecriture passe', async () => {
        const r = await saveProfileChanges('p1', EDITS)

        expect(r).toEqual({ ok: true, error: null, emailConfirmationSent: false })
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

    it('n ecrit pas l email dans profiles', async () => {
        /*
         * `profiles.email` reflete l'adresse du compte, il ne la definit pas.
         * L'ecrire ici recreerait la divergence qu'on repare : l'ecran
         * afficherait une adresse avec laquelle personne ne peut se connecter.
         */
        await saveProfileChanges('p1', EDITS)

        expect(champsEcrits()).toMatchObject({
            first_name: 'Tim', last_name: 'Martin', phone: '0600000000',
        })
        expect(champsEcrits()).not.toHaveProperty('email')
    })

    it('demande le changement d adresse a l authentification', async () => {
        getUser.mockResolvedValue({ data: { user: { email: 'ancienne@club.fr' } } })

        const r = await saveProfileChanges('p1', EDITS)

        expect(updateUser).toHaveBeenCalledWith({ email: 'tim@club.fr' })
        expect(r.ok).toBe(true)
        expect(r.emailConfirmationSent).toBe(true)
    })

    it('ne demande rien quand l adresse est la meme a la casse et aux espaces pres', async () => {
        getUser.mockResolvedValue({ data: { user: { email: 'Tim@Club.FR' } } })

        const r = await saveProfileChanges('p1', { ...EDITS, email: '  tim@club.fr ' })

        expect(updateUser).not.toHaveBeenCalled()
        expect(r.emailConfirmationSent).toBe(false)
    })

    it('ne demande rien sur une adresse vide', async () => {
        // L'ecran peut envoyer une chaine vide : ce n'est pas une demande de
        // changement, c'est un champ que l'utilisateur n'a pas rempli.
        getUser.mockResolvedValue({ data: { user: { email: 'ancienne@club.fr' } } })

        const r = await saveProfileChanges('p1', { ...EDITS, email: '   ' })

        expect(updateUser).not.toHaveBeenCalled()
        expect(r.emailConfirmationSent).toBe(false)
    })

    it('rend l erreur quand l adresse est deja prise', async () => {
        getUser.mockResolvedValue({ data: { user: { email: 'ancienne@club.fr' } } })
        updateUser.mockResolvedValue({
            error: { message: 'A user with this email address has already been registered' },
        })

        const r = await saveProfileChanges('p1', EDITS)

        expect(r.ok).toBe(false)
        expect(r.error).toContain('already been registered')
        expect(r.emailConfirmationSent).toBe(false)
    })

    it('ne touche a rien si le profil n a pas pu etre ecrit', async () => {
        // Sinon on changerait l'adresse ou le mot de passe d'un profil qu'on
        // vient d'echouer a modifier, en laissant l'utilisateur croire que
        // tout est passe.
        builder._reject('permission denied for table profiles')
        getUser.mockResolvedValue({ data: { user: { email: 'ancienne@club.fr' } } })

        const r = await saveProfileChanges('p1', EDITS, 'nouveau-mot-de-passe')

        expect(r.ok).toBe(false)
        expect(updateUser).not.toHaveBeenCalled()
    })

    it('change le mot de passe quand il est fourni et que le profil est ecrit', async () => {
        const r = await saveProfileChanges('p1', EDITS, 'nouveau-mot-de-passe')

        expect(r).toEqual({ ok: true, error: null, emailConfirmationSent: false })
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

    it('ne change pas le mot de passe si l adresse a ete refusee', async () => {
        getUser.mockResolvedValue({ data: { user: { email: 'ancienne@club.fr' } } })
        updateUser.mockResolvedValue({ error: { message: 'adresse invalide' } })

        const r = await saveProfileChanges('p1', EDITS, 'nouveau-mot-de-passe')

        expect(r.ok).toBe(false)
        expect(updateUser).toHaveBeenCalledTimes(1)
        expect(updateUser).toHaveBeenCalledWith({ email: 'tim@club.fr' })
    })
})
