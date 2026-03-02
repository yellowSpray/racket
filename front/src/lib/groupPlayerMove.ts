import type { Group } from "@/types/draw"

export function movePlayerBetweenGroups(
    groups: Group[],
    playerId: string,
    fromGroupId: string,
    toGroupId: string
): Group[] {
    if (fromGroupId === toGroupId) return groups

    const fromGroup = groups.find(g => g.id === fromGroupId)
    const player = fromGroup?.players?.find(p => p.id === playerId)
    if (!player) return groups

    return groups.map(g => {
        if (g.id === fromGroupId) {
            return { ...g, players: (g.players || []).filter(p => p.id !== playerId) }
        }
        if (g.id === toGroupId) {
            return { ...g, players: [...(g.players || []), player] }
        }
        return g
    })
}

export function validateGroups(groups: Group[]): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    for (const group of groups) {
        const count = (group.players || []).length
        if (count === 0) {
            errors.push(`${group.group_name} est vide`)
        }
        if (count > group.max_players) {
            errors.push(`${group.group_name} dépasse la capacité (${count}/${group.max_players})`)
        }
    }

    return { valid: errors.length === 0, errors }
}
