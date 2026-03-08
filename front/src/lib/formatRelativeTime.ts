const MINUTE = 60
const HOUR = 3600
const DAY = 86400

export function formatRelativeTime(dateString: string): string {
    const now = Date.now()
    const then = new Date(dateString).getTime()
    const diffSec = Math.floor((now - then) / 1000)

    if (diffSec < 0) return "à l'instant"
    if (diffSec < MINUTE) return "à l'instant"
    if (diffSec < HOUR) {
        const mins = Math.floor(diffSec / MINUTE)
        return `il y a ${mins} min`
    }
    if (diffSec < DAY) {
        const hours = Math.floor(diffSec / HOUR)
        return `il y a ${hours}h`
    }
    if (diffSec < DAY * 2) return "hier"
    if (diffSec < DAY * 7) {
        const days = Math.floor(diffSec / DAY)
        return `il y a ${days}j`
    }

    return new Date(dateString).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
    })
}
