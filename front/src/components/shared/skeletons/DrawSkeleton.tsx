import { Skeleton } from "@/components/ui/skeleton"

/**
 * Skeleton pour la page Tableaux : header (titre + event selector + boutons) + grille de DrawTables.
 */
export function DrawSkeleton() {
    return (
        <div role="status" aria-label="Loading" className="flex flex-col h-full min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-9 w-44 rounded-md" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-28 rounded-md" />
                </div>
            </div>

            {/* Grille de tableaux round-robin */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, groupIdx) => (
                    <div key={groupIdx} className="border rounded-md overflow-hidden">
                        {/* Header du groupe */}
                        <div className="px-4 py-3 bg-accent/30">
                            <Skeleton className="h-5 w-16" />
                        </div>
                        {/* Grille joueurs */}
                        <div className="p-2 space-y-2">
                            {Array.from({ length: 5 }).map((_, rowIdx) => (
                                <div key={rowIdx} className="flex gap-2">
                                    <Skeleton className="h-8 w-24" />
                                    {Array.from({ length: 4 }).map((_, colIdx) => (
                                        <Skeleton key={colIdx} className="h-8 w-12" />
                                    ))}
                                    <Skeleton className="h-8 w-10" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
