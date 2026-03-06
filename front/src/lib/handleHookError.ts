import { logger } from "./logger"

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
 * Log l'erreur via le logger et appelle setError avec le message extrait.
 */
export function handleHookError(
    err: unknown,
    setError: (msg: string) => void,
    context?: string
): void {
    const message = extractErrorMessage(err)
    logger.error(context ?? "Hook", message, err)
    setError(message)
}

/**
 * Timeout en ms pour les requêtes Supabase.
 */
const REQUEST_TIMEOUT_MS = 15000

/**
 * Enveloppe une Promise avec un timeout.
 * Si la promise ne résout/rejette pas dans le délai, rejette avec une erreur explicite.
 */
export function withTimeout<T>(promise: Promise<T>, context: string, ms = REQUEST_TIMEOUT_MS): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(
                () => reject(new Error(`Timeout après ${ms / 1000}s — la requête [${context}] ne répond pas. Vérifiez votre connexion.`)),
                ms
            )
        ),
    ])
}
