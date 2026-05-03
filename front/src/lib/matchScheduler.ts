import type { Group } from "@/types/draw"
import type { MatchPairing, MatchAssignment, Match } from "@/types/match"

/**
 * Contraintes de disponibilité d'un joueur.
 * - arrival : heure d'arrivée (ex: "19:30"), vide = disponible dès le début
 * - departure : heure de départ (ex: "22:00"), vide = disponible jusqu'à la fin
 * - unavailable : dates d'absence (ex: ["2026-03-04"])
 */
export interface PlayerConstraints {
    arrival: string
    departure: string
    unavailable: string[]
}

interface RoundInfo {
    pairings: MatchPairing[]
    byePlayerId: string | null
}

export interface GroupRound {
    groupId: string
    groupName: string
    roundIndex: number
    pairings: MatchPairing[]
    byePlayerId: string | null
}

export interface DatePlan {
    date: string
    pairings: MatchPairing[]
}

/**
 * Génère les rounds round-robin structurés par groupe.
 * Chaque groupe produit un tableau de GroupRound, préservant la structure des rounds.
 */
export function generateGroupRounds(
    groups: Group[],
    dates?: string[],
    absences?: Map<string, string[]>
): GroupRound[][] {
    const result: GroupRound[][] = []

    for (const group of groups) {
        const players = group.players || []
        if (players.length < 2) {
            result.push([])
            continue
        }

        let rounds = generateCircleRounds(players, group.id, group.group_name)

        if (dates && absences && absences.size > 0) {
            rounds = optimizeRoundOrder(rounds, dates, absences)
        }

        const groupRounds: GroupRound[] = rounds.map((r, i) => ({
            groupId: group.id,
            groupName: group.group_name,
            roundIndex: i,
            pairings: r.pairings,
            byePlayerId: r.byePlayerId,
        }))

        result.push(groupRounds)
    }

    return result
}

/**
 * Template de planification : SCHEDULE_TEMPLATES[taille][posI][posJ] = index de date (0-based).
 * Définit sur quelle date les joueurs aux positions i et j jouent leur match.
 * La position correspond à l'index du joueur dans group.players.
 * -1 = diagonale (joueur contre lui-même, jamais utilisé).
 * Modifiez ces valeurs pour contrôler l'ordre des dates par taille de groupe.
 */
export const SCHEDULE_TEMPLATES: Record<number, number[][]> = {
    2: [
        [-1,  0],
        [ 0, -1],
    ],
    3: [
        [-1,  0,  1],
        [ 0, -1,  2],
        [ 1,  2, -1],
    ],
    4: [
        [-1,  0,  1,  2],
        [ 0, -1,  2,  1],
        [ 1,  2, -1,  0],
        [ 2,  1,  0, -1],
    ],
    5: [
        [-1,  0,  1,  2,  3],
        [ 0, -1,  4,  1,  2],
        [ 1,  4, -1,  3,  0],
        [ 2,  1,  3, -1,  4],
        [ 3,  2,  0,  4, -1],
    ],
    6: [
        [-1,  0,  1,  2,  3,  4],
        [ 0, -1,  4,  1,  2,  3],
        [ 1,  4, -1,  3,  0,  2],
        [ 2,  1,  3, -1,  4,  0],
        [ 3,  2,  0,  4, -1,  1],
        [ 4,  3,  2,  0,  1, -1],
    ],
}

/**
 * Mappe les rounds de chaque groupe sur des dates en utilisant SCHEDULE_TEMPLATES.
 * Pour chaque paire (i, j), la date est déterminée par SCHEDULE_TEMPLATES[n][i][j].
 * Fallback séquentiel (round N → date N) si le groupe n'a pas de template.
 */
export function mapRoundsToDatesByTemplate(
    groupRounds: GroupRound[][],
    groups: Group[],
    dates: string[]
): DatePlan[] {
    const plans: DatePlan[] = dates.map(date => ({ date, pairings: [] }))

    for (let gi = 0; gi < groupRounds.length; gi++) {
        const rounds = groupRounds[gi]
        const players = groups[gi]?.players ?? []
        const template = SCHEDULE_TEMPLATES[players.length]

        for (let ri = 0; ri < rounds.length; ri++) {
            for (const pairing of rounds[ri].pairings) {
                let dateIdx: number
                if (template) {
                    const pos1 = players.findIndex(p => p.id === pairing.player1Id)
                    const pos2 = players.findIndex(p => p.id === pairing.player2Id)
                    dateIdx = pos1 >= 0 && pos2 >= 0 ? template[pos1][pos2] : ri
                } else {
                    dateIdx = ri
                }
                const safeDateIdx = dateIdx % dates.length
                if (safeDateIdx >= 0 && safeDateIdx < plans.length) {
                    plans[safeDateIdx].pairings.push(pairing)
                }
            }
        }
    }

    return plans
}

/**
 * Mappe les rounds de chaque groupe sur des dates.
 * Round N → Date N. Si plus de rounds que de dates, les surplus vont
 * sur les dates les moins chargées.
 */
export function mapRoundsToDates(
    groupRounds: GroupRound[][],
    dates: string[]
): DatePlan[] {
    const plans: DatePlan[] = dates.map(date => ({ date, pairings: [] }))

    for (const rounds of groupRounds) {
        for (let i = 0; i < rounds.length; i++) {
            if (i < dates.length) {
                plans[i].pairings.push(...rounds[i].pairings)
            } else {
                // Overflow : distribuer sur la date la moins chargée
                const leastLoaded = plans.reduce((min, p) =>
                    p.pairings.length < min.pairings.length ? p : min
                )
                leastLoaded.pairings.push(...rounds[i].pairings)
            }
        }
    }

    return plans
}

/**
 * Assigne les créneaux horaires et terrains pour chaque date.
 * La contrainte "1 match/joueur/jour" est garantie par mapRoundsToDates.
 * Seules les contraintes de créneau restent :
 * - Un joueur ne peut pas jouer 2 matchs au même créneau
 * - Un terrain ne peut accueillir qu'1 match par créneau
 * - Préférence pour les fenêtres de disponibilité
 */
export interface UnplacedMatch {
    pairing: MatchPairing
    date: string
    reason: string
}

export interface ScheduleResult {
    assignments: MatchAssignment[]
    unplaced: UnplacedMatch[]
}

export function assignTimeSlotsForDates(
    datePlans: DatePlan[],
    timeSlots: string[],
    numberOfCourts: number,
    constraints?: Map<string, PlayerConstraints>,
    durationMinutes?: number
): ScheduleResult {
    const allAssignments: MatchAssignment[] = []
    const unplaced: UnplacedMatch[] = []
    const playerConstraints = constraints || new Map<string, PlayerConstraints>()
    const matchDuration = durationMinutes || 30

    for (const plan of datePlans) {
        const occupied = new Map<string, Set<string>>() // "time" -> Set<playerId>
        const courtUsed = new Map<string, Set<string>>() // "time" -> Set<courtName>

        // Trier : les matchs avec la fenêtre de dispo la plus étroite en premier
        const sorted = sortByAvailabilityTightness(plan.pairings, plan.date, playerConstraints)

        for (const pairing of sorted) {
            const absentPlayerIds = getAbsentPlayers(pairing.player1Id, pairing.player2Id, plan.date, playerConstraints)

            const slot = findBestTimeSlot(
                pairing, plan.date, timeSlots, numberOfCourts,
                occupied, courtUsed, playerConstraints, matchDuration
            )

            if (!slot) {
                unplaced.push({
                    pairing,
                    date: plan.date,
                    reason: `Aucun créneau disponible le ${plan.date}`,
                })
                continue
            }

            allAssignments.push({
                ...pairing,
                matchDate: plan.date,
                matchTime: slot.time,
                courtNumber: slot.court,
                ...(absentPlayerIds.length > 0 ? { absentPlayerIds } : {}),
            })

            if (!occupied.has(slot.time)) occupied.set(slot.time, new Set())
            occupied.get(slot.time)!.add(pairing.player1Id)
            occupied.get(slot.time)!.add(pairing.player2Id)

            if (!courtUsed.has(slot.time)) courtUsed.set(slot.time, new Set())
            courtUsed.get(slot.time)!.add(slot.court)
        }
    }

    return { assignments: allAssignments, unplaced }
}

/**
 * Trouve le meilleur créneau (heure + terrain) pour un match sur une date fixe.
 */
function findBestTimeSlot(
    pairing: MatchPairing,
    date: string,
    timeSlots: string[],
    numberOfCourts: number,
    occupied: Map<string, Set<string>>,
    courtUsed: Map<string, Set<string>>,
    constraints: Map<string, PlayerConstraints>,
    matchDuration: number
): { time: string; court: string } | null {
    const candidates: { time: string; court: string }[] = []

    for (const time of timeSlots) {
        const occ = occupied.get(time)
        if (occ && (occ.has(pairing.player1Id) || occ.has(pairing.player2Id))) continue

        const used = courtUsed.get(time) || new Set()
        for (let c = 1; c <= numberOfCourts; c++) {
            const court = `Terrain ${c}`
            if (!used.has(court)) {
                candidates.push({ time, court })
                break
            }
        }
    }

    if (candidates.length === 0) return null

    return pickBestTimeSlot(candidates, pairing, date, constraints, matchDuration)
}

/**
 * Choisit le meilleur créneau parmi les candidats : préfère in-window, sinon le plus proche.
 */
function pickBestTimeSlot(
    candidates: { time: string; court: string }[],
    pairing: MatchPairing,
    date: string,
    constraints: Map<string, PlayerConstraints>,
    matchDuration: number
): { time: string; court: string } | null {
    if (candidates.length === 0) return null

    const inWindow: typeof candidates = []
    const outWindow: typeof candidates = []

    for (const slot of candidates) {
        const window = getAvailabilityWindow(pairing.player1Id, pairing.player2Id, date, constraints)
        const slotStart = parseTimeToMinutes(slot.time)
        const slotEnd = slotStart + matchDuration

        if (slotStart >= window.start && slotEnd <= window.end) {
            inWindow.push(slot)
        } else {
            outWindow.push(slot)
        }
    }

    if (inWindow.length > 0) return inWindow[0]

    if (outWindow.length > 0) {
        return outWindow.reduce((best, slot) => {
            const bestDist = distanceToWindowForDate(best, pairing, date, constraints, matchDuration)
            const slotDist = distanceToWindowForDate(slot, pairing, date, constraints, matchDuration)
            return slotDist < bestDist ? slot : best
        })
    }

    return null
}

/**
 * Trie les matchs par fenêtre de dispo la plus étroite en premier.
 */
function sortByAvailabilityTightness(
    pairings: MatchPairing[],
    date: string,
    constraints: Map<string, PlayerConstraints>,
): MatchPairing[] {
    return [...pairings].sort((a, b) => {
        const windowA = getAvailabilityWindow(a.player1Id, a.player2Id, date, constraints)
        const windowB = getAvailabilityWindow(b.player1Id, b.player2Id, date, constraints)
        const widthA = Math.max(0, windowA.end - windowA.start)
        const widthB = Math.max(0, windowB.end - windowB.start)
        return widthA - widthB
    })
}

/**
 * Génère toutes les paires round-robin depuis les groupes.
 * Wrapper pour compatibilité — utilise generateGroupRounds en interne.
 */
export function generateRoundRobinPairings(
    groups: Group[],
    dates?: string[],
    absences?: Map<string, string[]>
): MatchPairing[] {
    const groupRounds = generateGroupRounds(groups, dates, absences)

    const result: MatchPairing[] = []
    const maxRounds = Math.max(0, ...groupRounds.map(r => r.length))

    for (let round = 0; round < maxRounds; round++) {
        for (const rounds of groupRounds) {
            if (round < rounds.length) {
                result.push(...rounds[round].pairings)
            }
        }
    }

    return result
}

/**
 * Réordonne les rounds pour aligner les byes avec les dates d'absence.
 * Pour chaque joueur absent à une date donnée, si un round a ce joueur en bye,
 * on le place à la position correspondant à cette date.
 */
function optimizeRoundOrder(
    rounds: RoundInfo[],
    dates: string[],
    absences: Map<string, string[]>
): RoundInfo[] {
    // Si pas de byes (groupe pair), rien à optimiser
    if (rounds.every(r => r.byePlayerId === null)) return rounds

    const result = new Array<RoundInfo | null>(rounds.length).fill(null)
    const usedRounds = new Set<number>()

    // Pour chaque date, chercher un round dont le bye correspond à un joueur absent
    for (let dateIdx = 0; dateIdx < dates.length && dateIdx < rounds.length; dateIdx++) {
        const date = dates[dateIdx]

        for (let roundIdx = 0; roundIdx < rounds.length; roundIdx++) {
            if (usedRounds.has(roundIdx)) continue

            const round = rounds[roundIdx]
            if (!round.byePlayerId) continue

            const playerAbsences = absences.get(round.byePlayerId)
            if (playerAbsences?.includes(date)) {
                result[dateIdx] = round
                usedRounds.add(roundIdx)
                break
            }
        }
    }

    // Remplir les positions restantes avec les rounds non assignés (ordre original)
    let nextFreePos = 0
    for (let roundIdx = 0; roundIdx < rounds.length; roundIdx++) {
        if (usedRounds.has(roundIdx)) continue

        while (nextFreePos < result.length && result[nextFreePos] !== null) {
            nextFreePos++
        }
        if (nextFreePos < result.length) {
            result[nextFreePos] = rounds[roundIdx]
            nextFreePos++
        }
    }

    return result.filter((r): r is RoundInfo => r !== null)
}

/**
 * Génère les rounds round-robin pour un groupe via la méthode du cercle.
 * Retourne les pairings ET le joueur en bye pour chaque round.
 */
function generateCircleRounds(
    players: { id: string; first_name: string; last_name: string }[],
    groupId: string,
    groupName: string
): RoundInfo[] {
    const n = players.length
    const isOdd = n % 2 !== 0

    const totalPositions = isOdd ? n + 1 : n // always even
    const numRounds = totalPositions - 1
    const matchesPerRound = totalPositions / 2

    const rounds: RoundInfo[] = []

    // Player A (index 0) est fixe.
    // Les autres tournent en ordre inversé pour que A joue B en R1, C en R2, etc.
    const fixed = 0
    const rest = players.slice(1).map((_, i) => i + 1).reverse() // [n-1, n-2, ..., 1]
    const rotating = isOdd ? [-1, ...rest] : [...rest]

    for (let round = 0; round < numRounds; round++) {
        const roundPairings: MatchPairing[] = []
        let byePlayerId: string | null = null

        // Construire l'arrangement courant
        const current = [fixed, ...rotating]

        for (let m = 0; m < matchesPerRound; m++) {
            const i = current[m]
            const j = current[totalPositions - 1 - m]

            // Capturer le joueur bye
            if (i === -1) {
                byePlayerId = players[j].id
                continue
            }
            if (j === -1) {
                byePlayerId = players[i].id
                continue
            }

            const p1 = players[i]
            const p2 = players[j]

            roundPairings.push({
                groupId,
                groupName,
                player1Id: p1.id,
                player2Id: p2.id,
                player1Name: `${p1.first_name} ${p1.last_name}`,
                player2Name: `${p2.first_name} ${p2.last_name}`,
            })
        }

        rounds.push({ pairings: roundPairings, byePlayerId })

        // Rotation : dernier élément va en première position
        rotating.unshift(rotating.pop()!)
    }

    return rounds
}

/**
 * Calcule les créneaux horaires entre startTime et endTime.
 * Retourne des strings "HH:MM".
 */
export function calculateTimeSlots(startTime: string, endTime: string, durationMinutes: number): string[] {
    const parseTime = (t: string): number => {
        const match = t.match(/(\d{1,2}):(\d{2})/)
        if (!match) return 0
        return parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
    }

    const startMin = parseTime(startTime)
    const endMin = parseTime(endTime)
    const slots: string[] = []

    for (let m = startMin; m + durationMinutes <= endMin; m += durationMinutes) {
        const h = Math.floor(m / 60).toString().padStart(2, '0')
        const min = (m % 60).toString().padStart(2, '0')
        slots.push(`${h}:${min}`)
    }

    return slots
}

/**
 * Retourne les dates de jeu pour un événement.
 * Si playingDates est fourni (dates exactes sélectionnées), les utilise directement.
 * Sinon, génère toutes les dates entre startDate et endDate (inclusif).
 */
export function calculateDates(startDate: string, endDate: string, playingDates?: string[] | null): string[] {
    if (playingDates && playingDates.length > 0) {
        return [...playingDates].sort()
    }

    const dates: string[] = []
    const current = new Date(startDate)
    const end = new Date(endDate)

    while (current <= end) {
        dates.push(current.toISOString().split('T')[0])
        current.setDate(current.getDate() + 1)
    }

    return dates
}

function parseTimeToMinutes(t: string): number {
    const match = t.match(/(\d{1,2}):(\d{2})/)
    if (!match) return 0
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
}

/** "00:00" ou vide = pas de contrainte de départ = fin de journée (1440 min) */
function parseDepartureMinutes(departure: string | undefined): number {
    if (!departure || departure === "00:00") return 24 * 60
    return parseTimeToMinutes(departure)
}

/**
 * Calcule la fenêtre de disponibilité commune (intersection) pour deux joueurs sur une date.
 * Ne vérifie PAS les absences (gérées comme contrainte souple ailleurs).
 */
function getAvailabilityWindow(
    player1Id: string,
    player2Id: string,
    _date: string,
    constraints: Map<string, PlayerConstraints>
): { start: number; end: number } {
    const c1 = constraints.get(player1Id)
    const c2 = constraints.get(player2Id)

    const arrival1 = c1?.arrival ? parseTimeToMinutes(c1.arrival) : 0
    const arrival2 = c2?.arrival ? parseTimeToMinutes(c2.arrival) : 0
    const departure1 = parseDepartureMinutes(c1?.departure)
    const departure2 = parseDepartureMinutes(c2?.departure)

    return {
        start: Math.max(arrival1, arrival2),
        end: Math.min(departure1, departure2),
    }
}

/**
 * Retourne les IDs des joueurs absents à une date donnée.
 */
function getAbsentPlayers(
    player1Id: string,
    player2Id: string,
    date: string,
    constraints: Map<string, PlayerConstraints>
): string[] {
    const absent: string[] = []
    const c1 = constraints.get(player1Id)
    const c2 = constraints.get(player2Id)
    if (c1?.unavailable.includes(date)) absent.push(player1Id)
    if (c2?.unavailable.includes(date)) absent.push(player2Id)
    return absent
}

/**
 * Valide si un créneau est compatible avec les contraintes des deux joueurs.
 * - arrival/departure sont des contraintes dures (valid = false)
 * - absences sont des contraintes souples (valid = true, mais warning)
 */
export function validateMatchSlot(
    player1Id: string,
    player2Id: string,
    date: string,
    time: string,
    constraints: Map<string, PlayerConstraints>,
    durationMinutes: number,
    playerNames?: { player1Name: string; player2Name: string }
): { valid: boolean; warnings: string[] } {
    const warnings: string[] = []
    const slotStart = parseTimeToMinutes(time)
    const slotEnd = slotStart + durationMinutes

    const name1 = playerNames?.player1Name ?? player1Id
    const name2 = playerNames?.player2Name ?? player2Id

    const c1 = constraints.get(player1Id)
    const c2 = constraints.get(player2Id)

    // Hard constraints: arrival / departure
    const arrival1 = c1?.arrival ? parseTimeToMinutes(c1.arrival) : 0
    const arrival2 = c2?.arrival ? parseTimeToMinutes(c2.arrival) : 0
    const departure1 = parseDepartureMinutes(c1?.departure)
    const departure2 = parseDepartureMinutes(c2?.departure)

    let valid = true

    if (slotStart < arrival1) {
        warnings.push(`${name1} n'arrive qu'à ${c1!.arrival}`)
        valid = false
    }
    if (slotStart < arrival2) {
        warnings.push(`${name2} n'arrive qu'à ${c2!.arrival}`)
        valid = false
    }
    if (slotEnd > departure1) {
        warnings.push(`${name1} part à ${c1!.departure}`)
        valid = false
    }
    if (slotEnd > departure2) {
        warnings.push(`${name2} part à ${c2!.departure}`)
        valid = false
    }

    // Soft constraints: absences
    if (c1?.unavailable.includes(date)) {
        warnings.push(`${name1} est absent le ${date}`)
    }
    if (c2?.unavailable.includes(date)) {
        warnings.push(`${name2} est absent le ${date}`)
    }

    return { valid, warnings }
}

/**
 * Calcule la distance en minutes entre un créneau et la fenêtre de disponibilité idéale.
 */
function distanceToWindowForDate(
    slot: { time: string },
    pairing: MatchPairing,
    date: string,
    constraints: Map<string, PlayerConstraints>,
    durationMinutes: number
): number {
    const window = getAvailabilityWindow(pairing.player1Id, pairing.player2Id, date, constraints)

    const slotStart = parseTimeToMinutes(slot.time)
    const slotEnd = slotStart + durationMinutes

    if (window.start > window.end) {
        return Math.abs(slotStart - window.start)
    }

    if (slotStart >= window.start && slotEnd <= window.end) return 0

    const distFromStart = window.start > slotStart ? window.start - slotStart : 0
    const distFromEnd = slotEnd > window.end ? slotEnd - window.end : 0

    return Math.max(distFromStart, distFromEnd)
}

/**
 * Trie les joueurs d'un groupe pour que celui avec les dates de matchs
 * les plus précoces soit en position A (index 0).
 *
 * Pour chaque joueur, on collecte ses dates de matchs triées par ordre croissant,
 * puis on compare lexicographiquement : d'abord la 1ère date, puis la 2e, etc.
 * Le joueur avec les dates les plus tôt est placé en premier.
 *
 * Retourne une copie du groupe avec les joueurs réordonnés.
 */
export function sortPlayersByEarliestDates(
    group: Group,
    assignments: MatchAssignment[] | Match[]
): Group {
    const players = group.players || []
    if (players.length < 2) return { ...group }

    // Normaliser les matchs (MatchAssignment ou Match DB) en {p1, p2, date}
    const groupPlayerIds = new Set(players.map(p => p.id))
    const normalized = assignments.map(a => {
        const p1 = "player1Id" in a ? a.player1Id : a.player1_id
        const p2 = "player2Id" in a ? a.player2Id : a.player2_id
        const date = "matchDate" in a ? a.matchDate : a.match_date
        return { p1, p2, date }
    }).filter(a => groupPlayerIds.has(a.p1) && groupPlayerIds.has(a.p2))

    if (normalized.length === 0) return { ...group, players: [...players] }

    // Pour chaque joueur, collecter ses dates triées
    const playerDatesMap = new Map<string, string[]>()
    for (const player of players) {
        const dates = normalized
            .filter(a => a.p1 === player.id || a.p2 === player.id)
            .map(a => a.date)
            .sort()
        playerDatesMap.set(player.id, dates)
    }

    // Étape 1 : identifier le joueur A (dates globales les plus précoces, tri lexicographique)
    const sortedByGlobalDates = [...players].sort((a, b) => {
        const datesA = playerDatesMap.get(a.id) || []
        const datesB = playerDatesMap.get(b.id) || []
        const maxLen = Math.max(datesA.length, datesB.length)

        for (let i = 0; i < maxLen; i++) {
            const dateA = datesA[i] || ""
            const dateB = datesB[i] || ""
            const cmp = dateA.localeCompare(dateB)
            if (cmp !== 0) return cmp
        }
        return 0
    })

    const playerA = sortedByGlobalDates[0]

    // Étape 2 : construire un index date du match contre A pour chaque adversaire
    const dateVsA = new Map<string, string>()
    for (const match of normalized) {
        if (match.p1 === playerA.id) {
            dateVsA.set(match.p2, match.date)
        } else if (match.p2 === playerA.id) {
            dateVsA.set(match.p1, match.date)
        }
    }

    // Étape 3 : trier les adversaires par date de leur match contre A
    const others = sortedByGlobalDates.slice(1).sort((a, b) => {
        const dateA = dateVsA.get(a.id) || ""
        const dateB = dateVsA.get(b.id) || ""
        return dateA.localeCompare(dateB)
    })

    return { ...group, players: [playerA, ...others] }
}

/**
 * Calcule le nombre total de matchs round-robin pour un ensemble de groupes.
 */
export function totalMatchCount(groups: Group[]): number {
    return groups.reduce((total, group) => {
        const n = (group.players || []).length
        return total + (n * (n - 1)) / 2
    }, 0)
}

/**
 * Calcule le nombre total de créneaux disponibles.
 */
export function totalSlotCount(
    datesCount: number,
    timeSlotsCount: number,
    numberOfCourts: number
): number {
    return datesCount * timeSlotsCount * numberOfCourts
}
