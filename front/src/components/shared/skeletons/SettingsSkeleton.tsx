import { Skeleton } from "@/components/ui/skeleton"

/**
 * Skeleton pour la page Paramètres — onglet événements : header + tableau d'événements.
 */
export function EventsSkeleton() {
    return (
        <div role="status" aria-label="Loading" className="flex flex-col h-full min-h-0">
            {/* Tableau d'événements */}
            <div className="border rounded-lg">
                {/* Header du tableau */}
                <div className="flex border-b px-4 py-3 gap-4">
                    {Array.from({ length: 9 }).map((_, i) => (
                        <Skeleton key={i} className="h-4 flex-1" />
                    ))}
                </div>
                {/* Lignes */}
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center px-4 py-3 gap-4 border-b last:border-0">
                        {Array.from({ length: 7 }).map((_, j) => (
                            <Skeleton key={j} className="h-4 flex-1" />
                        ))}
                        <Skeleton className="h-6 w-16 rounded-full" />
                        <div className="flex gap-1">
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

/**
 * Skeleton pour la page Paramètres — onglet club : 3 cartes en grille.
 */
export function ClubConfigSkeleton() {
    return (
        <div role="status" aria-label="Loading" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="border rounded-xl p-6 space-y-4">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-48" />
                        <div className="space-y-2 pt-2">
                            {Array.from({ length: 4 }).map((_, j) => (
                                <div key={j} className="flex justify-between">
                                    <Skeleton className="h-4 w-12" />
                                    <Skeleton className="h-4 w-8" />
                                    <Skeleton className="h-4 w-8" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

/**
 * Skeleton pour le composant CourtsManager : carte avec tableau de terrains.
 */
export function CourtsSkeleton() {
    return (
        <div role="status" aria-label="Loading" className="border rounded-xl">
            <div className="p-6 space-y-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-72" />
            </div>
            <div className="px-6 pb-6">
                <div className="border rounded-lg">
                    <div className="flex border-b px-4 py-3 gap-4">
                        {["w-24", "w-16", "w-16", "w-16", "w-16"].map((w, i) => (
                            <Skeleton key={i} className={`h-4 ${w}`} />
                        ))}
                    </div>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center px-4 py-3 gap-4 border-b last:border-0">
                            <Skeleton className="h-9 w-40 rounded-md" />
                            <Skeleton className="h-9 w-28 rounded-md" />
                            <Skeleton className="h-9 w-28 rounded-md" />
                            <Skeleton className="h-4 w-8" />
                            <Skeleton className="h-8 w-8" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
