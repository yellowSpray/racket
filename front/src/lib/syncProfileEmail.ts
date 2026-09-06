import { supabase } from "@/lib/supabaseClient"

export interface SyncProfileEmailResult {
    /** Vrai quand `profiles.email` vient d'etre reecrit. */
    synced: boolean
    error: string | null
}

/**
 * Aligne `profiles.email` sur l'adresse du compte.
 *
 * Pour un compte lie, `auth.users.email` fait foi : c'est avec elle qu'on se
 * connecte, et elle ne change qu'apres confirmation par email.
 * `profiles.email` n'en est qu'un reflet, garde a part pour les joueurs
 * importes qui n'ont pas de compte du tout.
 *
 * Sans cet alignement, l'ecart ouvert par un changement d'adresse ne se
 * refermerait jamais : au retour du lien de confirmation, `auth.users` porte
 * la nouvelle adresse et `profiles` l'ancienne, et plus rien ne les rapproche.
 *
 * Effet de bord voulu : les divergences deja en base se reparent a la
 * prochaine connexion du joueur concerne.
 *
 * @param profileId - profil a aligner
 * @param authEmail - adresse de la session, `null` hors compte lie
 * @param profileEmail - adresse actuellement dans `profiles`
 */
export async function syncProfileEmail(
    profileId: string,
    authEmail: string | null | undefined,
    profileEmail: string | null | undefined,
): Promise<SyncProfileEmailResult> {
    const compte = (authEmail ?? "").trim()

    // Aucun compte lie : il n'y a rien a aligner, et rien qui autorise a
    // effacer l'email d'un joueur importe.
    if (compte === "") return { synced: false, error: null }

    if (compte.toLowerCase() === (profileEmail ?? "").trim().toLowerCase()) {
        return { synced: false, error: null }
    }

    const { error } = await supabase
        .from("profiles")
        .update({ email: compte })
        .eq("id", profileId)

    // On rend l'echec sans le jeter : cet alignement tourne au chargement du
    // profil, une adresse desynchronisee est un defaut, une page blanche est
    // une panne.
    if (error) return { synced: false, error: error.message }

    return { synced: true, error: null }
}
