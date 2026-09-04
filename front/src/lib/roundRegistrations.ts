/** D'où vient l'ensemble des inscrits affiché pour une série. */
export type RegistrationSource = "round" | "groups" | "previous" | "event"

export interface RegistrationSources {
    /** Lignes `event_players` rattachées à cette série (round_id = série). */
    roundRegistrations: string[]
    /** Joueurs déjà placés dans les tableaux de cette série. */
    ownGroupMembers: string[]
    /** Joueurs des tableaux de la série précédente du même événement. */
    previousGroupMembers: string[]
    /** Lignes `event_players` au niveau événement (round_id null). */
    eventRegistrations: string[]
    /** Faux uniquement pour la première série d'un événement. */
    hasPreviousRound: boolean
}

export interface ResolvedRegistrations {
    ids: Set<string>
    source: RegistrationSource
    /**
     * Vrai quand l'ensemble affiché n'existe pas encore comme lignes rattachées
     * à la série. Il faut alors l'écrire, sinon retirer un joueur ne
     * supprimerait rien et il reviendrait au rechargement.
     */
    needsMaterialization: boolean
}

/**
 * Qui est inscrit à une série, par ordre de préférence des sources.
 *
 * 1. Les inscriptions rattachées à la série. C'est la seule liste que l'admin a
 *    composée explicitement pour elle.
 * 2. Les tableaux de la série, s'ils existent déjà. Cas des séries composées
 *    avant que les inscriptions ne soient rattachées à une série.
 * 3. Les tableaux de la série précédente du même événement. C'est le
 *    pré-remplissage attendu : la série repart de ceux qui viennent de jouer.
 * 4. Les inscriptions au niveau de l'événement, et **seulement** pour la
 *    première série. C'est cette source qui mélangeait les événements : dès la
 *    deuxième série, elle n'est plus consultée.
 */
export function resolveRegisteredIds(sources: RegistrationSources): ResolvedRegistrations {
    const pick = (): { ids: string[]; source: RegistrationSource } => {
        if (sources.roundRegistrations.length > 0) {
            return { ids: sources.roundRegistrations, source: "round" }
        }
        if (sources.ownGroupMembers.length > 0) {
            return { ids: sources.ownGroupMembers, source: "groups" }
        }
        if (sources.hasPreviousRound) {
            return { ids: sources.previousGroupMembers, source: "previous" }
        }
        return { ids: sources.eventRegistrations, source: "event" }
    }

    const { ids, source } = pick()
    const unique = new Set(ids)

    return {
        ids: unique,
        source,
        needsMaterialization: source !== "round" && unique.size > 0,
    }
}
