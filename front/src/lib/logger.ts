/**
 * Utilitaire de logging avec mesure de performance.
 * Utilisé dans les hooks et contextes pour tracer les temps de chargement.
 *
 * Usage:
 *   const end = logger.start("useGroups.fetch")
 *   // ... opération async
 *   end()  // log automatique avec durée
 *
 *   logger.warn("useMatches", "Aucun match trouvé")
 *   logger.error("AuthContext", "Session expirée", error)
 */

const COLORS = {
    start: "color: #888",
    success: "color: #4ade80; font-weight: bold",
    slow: "color: #facc15; font-weight: bold",
    error: "color: #f87171; font-weight: bold",
    stall: "color: #f97316; font-weight: bold; font-size: 13px",
    info: "color: #60a5fa",
    warn: "color: #facc15",
}

// Seuil en ms au-delà duquel un chargement est considéré lent
const SLOW_THRESHOLD_MS = 1500
// Seuil en ms au-delà duquel on alerte qu'une requête est probablement bloquée
const STALL_THRESHOLD_MS = 8000

export const logger = {
    /**
     * Démarre un chrono pour une opération.
     * Retourne une fonction `end()` à appeler quand l'opération est terminée.
     * `end()` accepte un objet optionnel `{ error }` si l'opération a échoué.
     *
     * Si `end()` n'est pas appelé dans les 8s, un avertissement STALL est logué
     * automatiquement dans la console.
     */
    start(context: string): (result?: { error?: string }) => number {
        const t0 = performance.now()
        let completed = false

        console.log(`%c⏳ [${context}] Début du chargement...`, COLORS.start)

        // Détection de stall : alerte si la requête ne se termine pas
        const stallTimer = setTimeout(() => {
            if (!completed) {
                const elapsed = Math.round(performance.now() - t0)
                console.log(
                    `%c🚨 [${context}] STALL — requête bloquée depuis ${elapsed}ms. Connexion Supabase perdue ?`,
                    COLORS.stall
                )
            }
        }, STALL_THRESHOLD_MS)

        return (result?: { error?: string }) => {
            completed = true
            clearTimeout(stallTimer)
            const duration = Math.round(performance.now() - t0)

            if (result?.error) {
                console.log(
                    `%c✗ [${context}] Erreur après ${duration}ms — ${result.error}`,
                    COLORS.error
                )
            } else if (duration > SLOW_THRESHOLD_MS) {
                console.log(
                    `%c⚠ [${context}] Terminé en ${duration}ms (LENT > ${SLOW_THRESHOLD_MS}ms)`,
                    COLORS.slow
                )
            } else {
                console.log(
                    `%c✓ [${context}] Terminé en ${duration}ms`,
                    COLORS.success
                )
            }

            return duration
        }
    },

    error(context: string, message: string, err?: unknown) {
        console.log(`%c✗ [${context}] ${message}`, COLORS.error, err ?? "")
    },

    warn(context: string, message: string) {
        console.log(`%c⚠ [${context}] ${message}`, COLORS.warn)
    },

    info(context: string, message: string) {
        console.log(`%c● [${context}] ${message}`, COLORS.info)
    },
}
