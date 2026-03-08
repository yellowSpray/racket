export function formatDateLabel(dateStr: string, isToday: boolean): string {
    const d = new Date(dateStr + "T00:00:00")
    const formatted = d.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
    })
    return isToday ? `${formatted}` : `${formatted}`
}
