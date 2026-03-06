import { Skeleton } from "@/components/ui/skeleton"

/**
 * Skeleton pour la page Joueurs : header (titre + event selector + boutons) + tableau.
 */
export function PlayersSkeleton() {
    return (
        <div role="status" aria-label="Loading" className="flex flex-col h-full min-h-0">
            {/* Header : titre + selector + boutons */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-9 w-44 rounded-md" />
                    <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex items-center gap-4">
                    <Skeleton className="h-9 w-40 rounded-md" />
                    <Skeleton className="h-9 w-32 rounded-md" />
                    <Skeleton className="h-9 w-[180px] rounded-md" />
                </div>
            </div>

            {/* Tableau */}
            <div className="flex-1 min-h-0 border rounded-md">
                {/* Header du tableau */}
                <div className="flex border-b px-4 py-3 gap-4">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <Skeleton key={i} className="h-4 flex-1" />
                    ))}
                </div>
                {/* Lignes */}
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex px-4 py-3 gap-4 border-b last:border-0">
                        {Array.from({ length: 7 }).map((_, j) => (
                            <Skeleton key={j} className="h-4 flex-1" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}
