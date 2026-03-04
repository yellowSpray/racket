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

/**
 * Génère toutes les paires round-robin depuis les groupes en utilisant la méthode du cercle.
 * Les paires sont ordonnées par round : dans chaque round, aucun joueur ne joue 2 fois.
 * Les rounds de différents groupes sont interleaved pour étaler les matchs.
 *
 * Si des dates et absences sont fournies, les rounds sont réordonnés pour aligner
 * les byes avec les dates d'absence des joueurs (groupes impairs uniquement).
 */
export function generateRoundRobinPairings(
    groups: Group[],
    dates?: string[],
    absences?: Map<string, string[]>
): MatchPairing[] {
    const roundsByGroup: RoundInfo[][] = []

    for (const group of groups) {
        const players = group.players || []
        if (players.length < 2) {
            roundsByGroup.push([])
            continue
        }

        let rounds = generateCircleRounds(players, group.id, group.group_name)

        // Optimiser l'ordre des rounds pour aligner byes avec absences
        if (dates && absences && absences.size > 0) {
            rounds = optimizeRoundOrder(rounds, dates, absences)
        }

        roundsByGroup.push(rounds)
    }

    // Interleave par round : round 0 de chaque groupe, puis round 1, etc.
    const result: MatchPairing[] = []
    const maxRounds = Math.max(0, ...roundsByGroup.map(r => r.length))

    for (let round = 0; round < maxRounds; round++) {
        for (const groupRounds of roundsByGroup) {
            if (round < groupRounds.length) {
                result.push(...groupRounds[round].pairings)
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

    // Pour N impair, ajouter un index "bye" (-1)
    const indices: number[] = players.map((_, i) => i)
    if (isOdd) indices.push(-1) // -1 = bye

    const totalPositions = indices.length // always even
    const numRounds = totalPositions - 1
    const matchesPerRound = totalPositions / 2

    const rounds: RoundInfo[] = []

    // Position 0 est fixe, les positions 1..N-1 tournent
    const rotating = indices.slice(1) // positions qui tournent

    for (let round = 0; round < numRounds; round++) {
        const roundPairings: MatchPairing[] = []
        let byePlayerId: string | null = null

        // Construire l'arrangement courant
        const current = [indices[0], ...rotating]

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
    const departure1 = c1?.departure ? parseTimeToMinutes(c1.departure) : 24 * 60
    const departure2 = c2?.departure ? parseTimeToMinutes(c2.departure) : 24 * 60

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
 * Assigne les matchs aux créneaux (date, heure, terrain).
 * Contraintes dures :
 * - Un joueur ne peut pas jouer 2 matchs au même créneau
 * - Un joueur ne joue qu'1 match par jour
 * - Capacité des terrains respectée
 * Contraintes souples :
 * - Préférence pour les créneaux dans la fenêtre d'intersection des disponibilités
 * - Préférence pour les dates sans absence
 * - Si forcé de placer sur une date d'absence, le match est flaggé (absentPlayerIds)
 */
export function assignMatchesToSlots(
    pairings: MatchPairing[],
    dates: string[],
    timeSlots: string[],
    numberOfCourts: number,
    constraints?: Map<string, PlayerConstraints>,
    durationMinutes?: number
): MatchAssignment[] {
    const assignments: MatchAssignment[] = []
    const occupied = new Map<string, Set<string>>()
    const playerDayMap = new Map<string, Set<string>>()
    const playerConstraints = constraints || new Map()
    const matchDuration = durationMinutes || 30

    // Construire la liste ordonnée de tous les slots disponibles
    const allSlots: { date: string; time: string; court: string }[] = []
    for (const date of dates) {
        for (const time of timeSlots) {
            for (let c = 1; c <= numberOfCourts; c++) {
                allSlots.push({ date, time, court: `Terrain ${c}` })
            }
        }
    }

    for (const pairing of pairings) {
        // Collecter tous les créneaux libres (contraintes dures uniquement)
        const freeSlots: { date: string; time: string; court: string }[] = []
        let blockedByCourtTaken = 0
        let blockedByPlayerOccupied = 0
        let blockedByOncePerDay = 0

        for (const slot of allSlots) {
            const slotKey = `${slot.date}_${slot.time}`

            const isCourtTaken = assignments.some(
                a => a.matchDate === slot.date && a.matchTime === slot.time && a.courtNumber === slot.court
            )
            if (isCourtTaken) { blockedByCourtTaken++; continue }

            const occupiedPlayers = occupied.get(slotKey)
            if (occupiedPlayers) {
                if (occupiedPlayers.has(pairing.player1Id) || occupiedPlayers.has(pairing.player2Id)) {
                    blockedByPlayerOccupied++; continue
                }
            }

            const p1Days = playerDayMap.get(pairing.player1Id)
            const p2Days = playerDayMap.get(pairing.player2Id)
            if (p1Days?.has(slot.date) || p2Days?.has(slot.date)) { blockedByOncePerDay++; continue }

            freeSlots.push(slot)
        }

        if (freeSlots.length === 0) {
            console.warn(
                `[Scheduler] ❌ Match non placé : ${pairing.player1Name} vs ${pairing.player2Name} (${pairing.groupName})\n` +
                `  Raisons (sur ${allSlots.length} créneaux totaux) :\n` +
                `  - Terrains déjà pris : ${blockedByCourtTaken}\n` +
                `  - Joueur déjà occupé au même créneau : ${blockedByPlayerOccupied}\n` +
                `  - Joueur a déjà un match ce jour (1/jour) : ${blockedByOncePerDay}`
            )
            continue
        }

        // Séparer : sans absence > avec absence, puis dans chaque catégorie : in-window > out-window
        const noAbsence: typeof freeSlots = []
        const withAbsence: typeof freeSlots = []

        for (const slot of freeSlots) {
            const absent = getAbsentPlayers(pairing.player1Id, pairing.player2Id, slot.date, playerConstraints)
            if (absent.length === 0) {
                noAbsence.push(slot)
            } else {
                withAbsence.push(slot)
            }
        }

        // Chercher le meilleur slot : d'abord sans absence, puis avec absence
        const chosenSlot = pickBestSlot(noAbsence, pairing, playerConstraints, matchDuration)
            || pickBestSlot(withAbsence, pairing, playerConstraints, matchDuration)

        if (!chosenSlot) continue

        // Déterminer si des joueurs sont absents sur la date choisie
        const absentPlayerIds = getAbsentPlayers(pairing.player1Id, pairing.player2Id, chosenSlot.date, playerConstraints)

        // Assigner le match
        const slotKey = `${chosenSlot.date}_${chosenSlot.time}`
        assignments.push({
            ...pairing,
            matchDate: chosenSlot.date,
            matchTime: chosenSlot.time,
            courtNumber: chosenSlot.court,
            ...(absentPlayerIds.length > 0 ? { absentPlayerIds } : {}),
        })

        if (!occupied.has(slotKey)) {
            occupied.set(slotKey, new Set())
        }
        occupied.get(slotKey)!.add(pairing.player1Id)
        occupied.get(slotKey)!.add(pairing.player2Id)

        if (!playerDayMap.has(pairing.player1Id)) {
            playerDayMap.set(pairing.player1Id, new Set())
        }
        if (!playerDayMap.has(pairing.player2Id)) {
            playerDayMap.set(pairing.player2Id, new Set())
        }
        playerDayMap.get(pairing.player1Id)!.add(chosenSlot.date)
        playerDayMap.get(pairing.player2Id)!.add(chosenSlot.date)
    }

    return assignments
}

/**
 * Choisit le meilleur slot parmi les candidats : préfère in-window, sinon nearest.
 */
function pickBestSlot(
    candidates: { date: string; time: string; court: string }[],
    pairing: MatchPairing,
    constraints: Map<string, PlayerConstraints>,
    matchDuration: number
): { date: string; time: string; court: string } | null {
    if (candidates.length === 0) return null

    const inWindow: typeof candidates = []
    const outWindow: typeof candidates = []

    for (const slot of candidates) {
        const window = getAvailabilityWindow(pairing.player1Id, pairing.player2Id, slot.date, constraints)
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
            const bestDist = distanceToWindow(best, pairing, constraints, matchDuration)
            const slotDist = distanceToWindow(slot, pairing, constraints, matchDuration)
            return slotDist < bestDist ? slot : best
        })
    }

    return null
}

/**
 * Calcule la distance en minutes entre un créneau et la fenêtre de disponibilité idéale.
 * 0 = dans la fenêtre, sinon = nombre de minutes d'écart.
 *
 * Quand les fenêtres ne s'intersectent pas (start > end), on cible l'heure
 * d'arrivée du joueur le plus tardif (window.start) pour placer le match
 * au plus proche de quand les deux joueurs pourraient se retrouver.
 */
function distanceToWindow(
    slot: { date: string; time: string },
    pairing: MatchPairing,
    constraints: Map<string, PlayerConstraints>,
    durationMinutes: number
): number {
    const window = getAvailabilityWindow(pairing.player1Id, pairing.player2Id, slot.date, constraints)

    const slotStart = parseTimeToMinutes(slot.time)
    const slotEnd = slotStart + durationMinutes

    // Pas d'intersection : cibler l'arrivée du joueur le plus tardif
    if (window.start > window.end) {
        return Math.abs(slotStart - window.start)
    }

    // Dans la fenêtre
    if (slotStart >= window.start && slotEnd <= window.end) return 0

    // Distance from start boundary (slot is too early)
    const distFromStart = window.start > slotStart ? window.start - slotStart : 0
    // Distance from end boundary (slot ends too late)
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
