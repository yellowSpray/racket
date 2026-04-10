/**
 * Utilitaires de parsing de fichiers Excel pour l'import de joueurs.
 * Supporte les fichiers .xlsx et .csv avec reconnaissance floue des colonnes.
 */

export interface ColumnMapping {
    first_name?: number
    last_name?: number
    phone?: number
    email?: number
    arrival?: number
    status?: number
    active?: number
    member?: number
}

export interface RawPlayer {
    first_name: string
    last_name: string
    phone?: string
    email?: string
    arrival?: string
    status: string[]
    power_ranking: number
}

/** Définition d'un champ cible avec ses mots-clés de reconnaissance */
const FIELD_KEYWORDS: Record<keyof ColumnMapping, string[]> = {
    first_name: ["prenom", "firstname", "first", "prénom"],
    last_name: ["nom", "lastname", "last", "surname"],
    phone: ["tel", "phone", "portable", "gsm", "mobile", "telephone"],
    email: ["email", "mail", "courriel"],
    arrival: ["heure", "arrival", "arrivee", "debut", "time"],
    status: ["statut", "etat", "role", "type"],
    active: ["actif", "active"],
    member: ["membre", "member", "cotisant"],
}

/**
 * Normalise une chaîne pour la comparaison : lowercase, trim, suppression des accents.
 */
function normalize(str: string): string {
    return str
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
}

/**
 * Convertit une valeur de statut texte en tableau de statuts système.
 * Accepte les valeurs françaises et anglaises, séparées par virgule.
 * Ex: "actif" → ["active"], "membre,actif" → ["member", "active"]
 * Défaut si vide ou non reconnu : ["active"]
 */
export function parseStatus(raw: string): string[] {
    const normalized = normalize(raw)
    if (!normalized) return ["active"]

    const parts = normalized.split(/[,;/]/).map((s) => s.trim()).filter(Boolean)
    const result: string[] = []

    for (const part of parts) {
        if (part === "actif" || part === "active") result.push("active")
        else if (part === "membre" || part === "member") result.push("member")
        else if (part === "inactif" || part === "inactive") result.push("inactive")
        else if (part === "visiteur" || part === "visitor") result.push("visitor")
    }

    return result.length > 0 ? result : ["active"]
}

/**
 * Interprète une cellule Excel comme un booléen.
 * Truthy : boolean true, nombre non-nul, ou texte non-vide et non-négatif.
 * Falsy : boolean false, 0, chaîne vide, "no", "non", "false", "0", "-", "inactive", "inactif".
 */
export function parseBooleanCell(value: unknown): boolean {
    if (typeof value === "boolean") return value
    if (typeof value === "number") return value !== 0
    if (typeof value === "string") {
        const v = normalize(value)
        return (
            v.length > 0 &&
            !["non", "no", "false", "0", "n", "-", "inactive", "inactif"].includes(v)
        )
    }
    return false
}

/**
 * Convertit un décimal Excel (fraction de journée) en chaîne "HH:mm".
 * Ex: 0.8541666... → "20:30"
 */
export function excelTimeToHHMM(decimal: number): string {
    const totalMinutes = Math.round(decimal * 24 * 60)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

/**
 * Trouve l'index de la ligne de headers dans les données brutes.
 * Retourne l'index de la première ligne avec ≥ 3 cellules non-vides.
 * Retourne -1 si aucune ligne valide trouvée.
 */
export function findHeaderRow(data: unknown[][]): number {
    for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const nonEmptyCells = row.filter(
            (cell) => cell !== "" && cell !== null && cell !== undefined
        )
        if (nonEmptyCells.length >= 3) {
            return i
        }
    }
    return -1
}

/**
 * Associe les headers d'un fichier aux champs système par matching flou.
 * Normalise chaque header et cherche des correspondances dans les mots-clés.
 */
export function fuzzyMatchColumns(headers: string[]): ColumnMapping {
    const mapping: ColumnMapping = {}

    for (let colIndex = 0; colIndex < headers.length; colIndex++) {
        const header = normalize(String(headers[colIndex]))
        if (!header) continue

        for (const [field, keywords] of Object.entries(FIELD_KEYWORDS) as [
            keyof ColumnMapping,
            string[],
        ][]) {
            if (mapping[field] !== undefined) continue

            const matched = keywords.some(
                (keyword) => header.includes(normalize(keyword)) || normalize(keyword).includes(header)
            )
            if (matched) {
                mapping[field] = colIndex
                break
            }
        }
    }

    return mapping
}

/**
 * Extrait les joueurs depuis les données brutes d'un sheet Excel.
 * Filtre les lignes vides et applique le mapping de colonnes.
 * Le power_ranking est mis à 5 par défaut, le statut à ["active"] si absent.
 */
export function parsePlayersFromSheet(
    data: unknown[][],
    mapping: ColumnMapping
): RawPlayer[] {
    const players: RawPlayer[] = []

    for (const row of data) {
        const hasContent = row.some(
            (cell) => cell !== "" && cell !== null && cell !== undefined
        )
        if (!hasContent) continue

        const firstName = mapping.first_name !== undefined
            ? String(row[mapping.first_name] ?? "").trim()
            : ""
        const lastName = mapping.last_name !== undefined
            ? String(row[mapping.last_name] ?? "").trim()
            : ""

        if (!firstName && !lastName) continue

        const phone = mapping.phone !== undefined
            ? String(row[mapping.phone] ?? "").trim() || undefined
            : undefined

        const email = mapping.email !== undefined
            ? String(row[mapping.email] ?? "").trim() || undefined
            : undefined

        let arrival: string | undefined
        if (mapping.arrival !== undefined) {
            const rawArrival = row[mapping.arrival]
            if (typeof rawArrival === "number" && rawArrival > 0 && rawArrival < 1) {
                arrival = excelTimeToHHMM(rawArrival)
            }
        }

        let status: string[]
        if (mapping.active !== undefined || mapping.member !== undefined) {
            const result: string[] = []
            if (mapping.active !== undefined && parseBooleanCell(row[mapping.active])) {
                result.push("active")
            }
            if (mapping.member !== undefined && parseBooleanCell(row[mapping.member])) {
                result.push("member")
            }
            status = result.length > 0 ? result : ["active"]
        } else if (mapping.status !== undefined) {
            status = parseStatus(String(row[mapping.status] ?? ""))
        } else {
            status = ["active"]
        }

        players.push({
            first_name: firstName,
            last_name: lastName,
            phone,
            email,
            arrival,
            status,
            power_ranking: 5,
        })
    }

    return players
}
