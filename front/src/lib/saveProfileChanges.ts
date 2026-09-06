import { supabase } from "@/lib/supabaseClient"

/** Champs qu'un utilisateur peut modifier sur son propre profil. */
export interface ProfileEdits {
    first_name: string
    last_name: string
    email: string
    phone: string
    address: string
}

export interface SaveProfileResult {
    ok: boolean
    /** Message rendu par la base ou par l'authentification, null si tout est passe. */
    error: string | null
    /**
     * Vrai quand un email de confirmation vient de partir vers la nouvelle
     * adresse. L'ecran doit le dire : tant que le lien n'est pas ouvert,
     * l'utilisateur se connecte toujours avec l'ancienne.
     */
    emailConfirmationSent: boolean
}

/** Deux adresses sont la meme si seuls la casse ou les espaces different. */
function memeAdresse(a: string | null | undefined, b: string | null | undefined): boolean {
    return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase()
}

/**
 * Ecrit les modifications d'un profil, et rend l'echec au lieu de l'avaler.
 *
 * Deux defauts corriges ici, dans cet ordre.
 *
 * L'ecran de profil appelait Supabase sans destructurer le resultat. Or
 * supabase-js ne leve pas d'exception, il rend l'erreur dans l'objet : elle
 * etait donc perdue, la boite de dialogue se fermait et l'ancien profil se
 * rechargeait. L'utilisateur croyait avoir enregistre.
 *
 * L'email etait ensuite ecrit dans `public.profiles` et nulle part ailleurs.
 * L'adresse qui sert a se connecter vit dans `auth.users`, et son double dans
 * `auth.identities` : seule l'API d'authentification les met a jour ensemble.
 * L'utilisateur changeait donc son adresse affichee tout en continuant a se
 * connecter avec l'ancienne, sans que rien ne le lui dise.
 *
 * `profiles.email` n'est plus ecrit ici du tout. Il reflete l'adresse du
 * compte, il ne la definit pas, et `auth.updateUser` ne change rien avant que
 * l'utilisateur ait ouvert le lien de confirmation : l'ecrire tout de suite
 * afficherait une adresse avec laquelle personne ne peut encore se connecter.
 * C'est `syncProfileEmail`, au chargement du profil, qui aligne les deux une
 * fois la confirmation faite.
 *
 * L'ordre des trois ecritures n'est pas indifferent : ni l'adresse ni le mot
 * de passe ne sont touches si le profil n'a pas pu etre ecrit, et le mot de
 * passe ne l'est pas si l'adresse a ete refusee. Un compte a moitie modifie
 * est pire qu'un compte inchange.
 */
export async function saveProfileChanges(
    profileId: string,
    edits: ProfileEdits,
    newPassword?: string,
): Promise<SaveProfileResult> {
    const echec = (message: string): SaveProfileResult => ({
        ok: false, error: message, emailConfirmationSent: false,
    })

    const { error } = await supabase
        .from("profiles")
        .update({
            first_name: edits.first_name,
            last_name: edits.last_name,
            phone: edits.phone,
            address: edits.address,
        })
        .eq("id", profileId)

    if (error) return echec(error.message)

    // Une adresse laissee vide n'est pas une demande de changement.
    const voulue = (edits.email ?? "").trim()
    const { data } = await supabase.auth.getUser()
    const actuelle = data?.user?.email ?? null

    let emailConfirmationSent = false

    if (voulue !== "" && !memeAdresse(voulue, actuelle)) {
        const { error: emailError } = await supabase.auth.updateUser({ email: voulue })
        if (emailError) return echec(emailError.message)
        emailConfirmationSent = true
    }

    if (newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword })
        if (passwordError) return echec(passwordError.message)
    }

    return { ok: true, error: null, emailConfirmationSent }
}
