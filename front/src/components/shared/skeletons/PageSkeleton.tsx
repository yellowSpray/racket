import { Skeleton } from "@/components/ui/skeleton"

/**
 * Skeleton plein écran imitant le layout admin (header + sidebar + contenu).
 * Utilisé par AuthContext, ProtectedRoute, RedirectByRole, Suspense.
 */
export function PageSkeleton() {
    return (
        <section className="w-full h-lvh flex flex-col" role="status" aria-label="Loading">
            {/* Header */}
            <div className="h-16 border-b border-border flex items-center justify-between px-6">
                <Skeleton className="h-6 w-32" />
                <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
            </div>

            <div className="flex-1 grid grid-cols-12">
                {/* Sidebar */}
                <div className="col-span-2 border-r border-border p-6 flex flex-col gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                            <Skeleton className="h-4 w-4" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    ))}
                </div>

                {/* Content */}
                <div className="col-span-10 p-10 flex flex-col gap-6">
                    <Skeleton className="h-8 w-56" />
                    <div className="flex gap-4">
                        <Skeleton className="h-10 w-36" />
                        <Skeleton className="h-10 w-36" />
                    </div>
                    <div className="space-y-3">
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-5/6" />
                    </div>
                </div>
            </div>
        </section>
    )
}
