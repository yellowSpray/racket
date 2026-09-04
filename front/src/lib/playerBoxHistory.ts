/** Un passage d'un joueur dans un tableau, tel que renvoyé par la base. */
export interface PlayerHistoryRow {
    group_name: string
    round_number: number
    start_date: string
    event_name: string
}

export type HistoryMovement = "first" | "up" | "down" | "same" | "unknown"

export interface PlayerHistoryEntry {
    eventName: string
    roundNumber: number
    startDate: string
    groupName: string
    boxNumber: number | null
    /** Mouvement par rapport au dernier tableau **connu**, pas au précédent passage. */
    movement: HistoryMovement
}

/**
 * Numéro d'un tableau à partir de son nom (« Box 3 » → 3).
 *
 * Rend `null` sur tout autre libellé : rien n'empêche un admin de renommer un
 * tableau, et mieux vaut n'afficher aucun mouvement qu'en inventer un.
 */
export function boxNumber(groupName: string): number | null {
    const match = groupName.trim().match(/^box\s+(\d+)$/i)
    return match ? parseInt(match[1], 10) : null
}

/**
 * Parcours d'un joueur, du plus ancien au plus récent, avec le mouvement
 * accompli à chaque étape.
 *
 * L'ordre vient de la date de début de la série, pas de son numéro : un joueur
 * passe d'un événement à un autre, et la série 1 d'un nouvel événement suit la
 * série 3 du précédent.
 *
 * Le box 1 étant le plus fort, monter d'un niveau fait *baisser* le numéro.
 */
export function buildPlayerHistory(rows: PlayerHistoryRow[]): PlayerHistoryEntry[] {
    const sorted = [...rows].sort((a, b) => a.start_date.localeCompare(b.start_date))

    let lastKnownBox: number | null = null

    return sorted.map(r => {
        const box = boxNumber(r.group_name)

        let movement: HistoryMovement
        if (box === null) {
            movement = "unknown"
        } else if (lastKnownBox === null) {
            movement = "first"
        } else if (box < lastKnownBox) {
            movement = "up"
        } else if (box > lastKnownBox) {
            movement = "down"
        } else {
            movement = "same"
        }

        if (box !== null) lastKnownBox = box

        return {
            eventName: r.event_name,
            roundNumber: r.round_number,
            startDate: r.start_date,
            groupName: r.group_name,
            boxNumber: box,
            movement,
        }
    })
}
