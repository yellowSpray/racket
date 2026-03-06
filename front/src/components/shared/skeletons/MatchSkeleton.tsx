import { Skeleton } from "@/components/ui/skeleton"

/**
 * Skeleton pour la page Matchs : header (titre + event selector + boutons) + grille de matchs.
 */
export function MatchSkeleton() {
    return (
        <div role="status" aria-label="Loading" className="flex flex-col h-full min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-9 w-44 rounded-md" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                </div>
            </div>

            {/* Grille de matchs (imite MatchScheduleGrid) */}
            <div className="flex-1 min-h-0 space-y-4">
                {Array.from({ length: 3 }).map((_, dateIdx) => (
                    <div key={dateIdx} className="space-y-2">
                        {/* Date header */}
                        <Skeleton className="h-5 w-40" />
                        {/* Lignes créneau */}
                        <div className="border rounded-md">
                            {Array.from({ length: 3 }).map((_, slotIdx) => (
                                <div key={slotIdx} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
                                    <Skeleton className="h-4 w-12" />
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-4 flex-1" />
                                    <Skeleton className="h-4 w-16" />
                                    <Skeleton className="h-4 flex-1" />
                                    <Skeleton className="h-6 w-16 rounded-full" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
