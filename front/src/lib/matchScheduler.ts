import type { Group } from "@/types/draw"
import type { MatchPairing, MatchAssignment } from "@/types/match"

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

/**
 * Génère toutes les paires round-robin depuis les groupes.
 * Interleave les paires de différents groupes pour étaler les matchs.
 */
export function generateRoundRobinPairings(groups: Group[]): MatchPairing[] {
    const pairingsByGroup: MatchPairing[][] = []

    for (const group of groups) {
        const players = group.players || []
        const groupPairings: MatchPairing[] = []

        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                groupPairings.push({
                    groupId: group.id,
                    groupName: group.group_name,
                    player1Id: players[i].id,
                    player2Id: players[j].id,
                    player1Name: `${players[i].first_name} ${players[i].last_name}`,
                    player2Name: `${players[j].first_name} ${players[j].last_name}`,
                })
            }
        }
        pairingsByGroup.push(groupPairings)
    }

    // Interleave : prendre une paire de chaque groupe en alternance
    const result: MatchPairing[] = []
    const indices = pairingsByGroup.map(() => 0)
    let remaining = true

    while (remaining) {
        remaining = false
        for (let g = 0; g < pairingsByGroup.length; g++) {
            if (indices[g] < pairingsByGroup[g].length) {
                result.push(pairingsByGroup[g][indices[g]])
                indices[g]++
                remaining = true
            }
        }
    }

    return result
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

/**
 * Vérifie si un joueur est disponible à un créneau donné.
 * Prend en compte : absences (date), arrivée et départ (heure).
 */
function isPlayerAvailable(
    playerId: string,
    date: string,
    time: string,
    durationMinutes: number,
    constraints: Map<string, PlayerConstraints>
): boolean {
    const c = constraints.get(playerId)
    if (!c) return true // pas de contraintes connues = disponible

    // Vérifier absence à cette date
    if (c.unavailable.includes(date)) return false

    // Vérifier heure d'arrivée : le joueur doit être arrivé avant le début du match
    if (c.arrival) {
        const arrivalMin = parseTimeToMinutes(c.arrival)
        const slotMin = parseTimeToMinutes(time)
        if (slotMin < arrivalMin) return false
    }

    // Vérifier heure de départ : le match doit finir avant le départ
    if (c.departure) {
        const departureMin = parseTimeToMinutes(c.departure)
        const slotEndMin = parseTimeToMinutes(time) + durationMinutes
        if (slotEndMin > departureMin) return false
    }

    return true
}

function parseTimeToMinutes(t: string): number {
    const match = t.match(/(\d{1,2}):(\d{2})/)
    if (!match) return 0
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
}

/**
 * Assigne les matchs aux créneaux (date, heure, terrain).
 * Contraintes :
 * - Un joueur ne peut pas jouer 2 matchs au même créneau
 * - Un joueur absent à une date est exclu ce jour-là
 * - Un joueur n'est pas planifié avant son arrivée ou après son départ
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
    const playerDayMap = new Map<string, Set<string>>() // playerId -> Set<date> : 1 match par jour
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
        let assigned = false

        for (const slot of allSlots) {
            const slotKey = `${slot.date}_${slot.time}`

            // Vérifier que ce slot (date+heure+terrain) n'est pas déjà pris
            const isCourtTaken = assignments.some(
                a => a.matchDate === slot.date && a.matchTime === slot.time && a.courtNumber === slot.court
            )
            if (isCourtTaken) continue

            // Vérifier que ni player1 ni player2 ne joue déjà à ce créneau
            const occupiedPlayers = occupied.get(slotKey)
            if (occupiedPlayers) {
                if (occupiedPlayers.has(pairing.player1Id) || occupiedPlayers.has(pairing.player2Id)) {
                    continue
                }
            }

            // Vérifier qu'aucun des deux joueurs n'a déjà un match ce jour-là (1 match par jour)
            const p1Days = playerDayMap.get(pairing.player1Id)
            const p2Days = playerDayMap.get(pairing.player2Id)
            if (p1Days?.has(slot.date) || p2Days?.has(slot.date)) continue

            // Vérifier les contraintes de disponibilité des deux joueurs
            if (!isPlayerAvailable(pairing.player1Id, slot.date, slot.time, matchDuration, playerConstraints)) continue
            if (!isPlayerAvailable(pairing.player2Id, slot.date, slot.time, matchDuration, playerConstraints)) continue

            // Assigner le match
            assignments.push({
                ...pairing,
                matchDate: slot.date,
                matchTime: slot.time,
                courtNumber: slot.court,
            })

            // Marquer les joueurs comme occupés au créneau
            if (!occupied.has(slotKey)) {
                occupied.set(slotKey, new Set())
            }
            occupied.get(slotKey)!.add(pairing.player1Id)
            occupied.get(slotKey)!.add(pairing.player2Id)

            // Marquer les joueurs comme ayant joué ce jour
            if (!playerDayMap.has(pairing.player1Id)) {
                playerDayMap.set(pairing.player1Id, new Set())
            }
            if (!playerDayMap.has(pairing.player2Id)) {
                playerDayMap.set(pairing.player2Id, new Set())
            }
            playerDayMap.get(pairing.player1Id)!.add(slot.date)
            playerDayMap.get(pairing.player2Id)!.add(slot.date)

            assigned = true
            break
        }

        if (!assigned) {
            // Plus de créneaux disponibles pour cette paire, on continue les autres
            continue
        }
    }

    return assignments
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
