import type { Match } from "@/types/match"

export function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
        weekday: "long", day: "numeric", month: "long"
    })
}

export function formatDateShort(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
        weekday: "short", day: "numeric", month: "short"
    })
}

export function getOpponentName(match: Match, myId: string): string {
    if (match.player1_id === myId) {
        return match.player2
            ? `${match.player2.first_name} ${match.player2.last_name}`
            : "Adversaire"
    }
    return match.player1
        ? `${match.player1.first_name} ${match.player1.last_name}`
        : "Adversaire"
}

export function getMatchResult(match: Match, myId: string): { label: string; variant: "active" | "inactive" | "pending" } | null {
    if (!match.winner_id) return null
    if (match.score?.includes("ABS")) {
        const isAbsent = (match.score.startsWith("ABS") && match.player1_id === myId) ||
            (match.score.endsWith("ABS") && match.player2_id === myId)
        if (isAbsent) return { label: "Absent", variant: "pending" }
    }
    if (match.winner_id === myId) return { label: "Victoire", variant: "active" }
    return { label: "Défaite", variant: "inactive" }
}

export function getMyScore(match: Match, myId: string): string | null {
    if (!match.score) return null
    const parts = match.score.split("-")
    if (parts.length !== 2) return match.score
    return match.player1_id === myId ? `${parts[0]}-${parts[1]}` : `${parts[1]}-${parts[0]}`
}
