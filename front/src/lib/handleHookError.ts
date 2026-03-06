/**
 * Centralise le traitement des erreurs dans les hooks Supabase.
 * Extrait le message d'erreur depuis différentes sources (Error, Supabase error, string, unknown).
 */
export function extractErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message
    if (typeof err === "object" && err !== null && "message" in err) {
        return (err as { message: string }).message
    }
    if (typeof err === "string") return err
    return "Erreur inconnue"
}

/**
 * Handler centralisé pour les erreurs dans les hooks.
 * Log l'erreur en console et appelle setError avec le message extrait.
 */
export function handleHookError(
    err: unknown,
    setError: (msg: string) => void,
    context?: string
): void {
    const message = extractErrorMessage(err)
    if (context) {
        console.error(`[${context}]`, message, err)
    }
    setError(message)
}
