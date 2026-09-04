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
}

/**
 * Ecrit les modifications d'un profil, et rend l'echec au lieu de l'avaler.
 *
 * L'ecran de profil appelait Supabase sans destructurer le resultat. Or
 * supabase-js ne leve pas d'exception, il rend l'erreur dans l'objet : elle
 * etait donc perdue, la boite de dialogue se fermait et l'ancien profil se
 * rechargeait. L'utilisateur croyait avoir enregistre.
 *
 * Le mot de passe n'est change qu'apres une ecriture reussie du profil : le
 * modifier apres un echec laisserait un compte a moitie mis a jour, sans que
 * personne le sache.
 */
export async function saveProfileChanges(
    profileId: string,
    edits: ProfileEdits,
    newPassword?: string,
): Promise<SaveProfileResult> {
    const { error } = await supabase
        .from("profiles")
        .update({
            first_name: edits.first_name,
            last_name: edits.last_name,
            email: edits.email,
            phone: edits.phone,
            address: edits.address,
        })
        .eq("id", profileId)

    if (error) return { ok: false, error: error.message }

    if (newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword })
        if (passwordError) return { ok: false, error: passwordError.message }
    }

    return { ok: true, error: null }
}
