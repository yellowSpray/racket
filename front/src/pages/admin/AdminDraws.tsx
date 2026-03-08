import { EventSelector } from "@/components/admin/settings/EventSelector"
import { DrawSkeleton } from "@/components/shared/skeletons/DrawSkeleton"
import { useEvent } from "@/contexts/EventContext"
import { useAuth } from "@/contexts/AuthContext"
import { useGroups } from "@/hooks/useGroups"
import { useMatches } from "@/hooks/useMatches"
import { useClubConfig } from "@/hooks/useClubConfig"
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { Settings01Icon, PencilEdit02Icon, HashtagIcon, StarIcon, Download04Icon, SquareLock01Icon } from "hugeicons-react"
import { Button } from "@/components/ui/button"
import { DrawTable } from "@/components/admin/draws/DrawTable"
// import { CreateGroupsDialog } from "@/components/admin/draws/CreateGroupsDialog"
import { ManageGroupDialog } from "@/components/admin/draws/ManageGroupsDialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { sortPlayersByEarliestDates } from "@/lib/matchScheduler"
import { exportTablesToPdf } from "@/lib/exportPdf"

export function AdminDraws () {

    const { currentEvent, fetchEvents } = useEvent()
    const { profile } = useAuth()
    const { groups, loading, fetchGroupsByEvent } = useGroups()
    const { matches, fetchMatchesByEvent, closeEvent, error: matchError } = useMatches()
    const { scoringRules, fetchClubConfig } = useClubConfig()
    const [selectedGroupId, setSelectedGroupsId] = useState<string | null>(null)
    // const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [manageDialogOpen, setManageDialogOpen] = useState(false)
    const [displayMode, setDisplayMode] = useState<"score" | "points">("score")
    const [closing, setClosing] = useState(false)
    const navigate = useNavigate()
    const tablesRef = useRef<HTMLDivElement>(null)

    const handleExportPdf = async () => {
        if (!tablesRef.current) return
        try {
            await exportTablesToPdf(tablesRef.current, "tableaux.pdf")
        } catch (err) {
            console.error("Export PDF error:", err)
        }
    }

    const handleCloseEvent = async () => {
        if (!currentEvent) return
        setClosing(true)
        const result = await closeEvent(currentEvent.id)
        setClosing(false)
        if (result.success) {
            fetchEvents()
        }
    }

    const isCompleted = currentEvent?.status === "completed"

    const clubId = profile?.club_id ?? null

    // charger les groups, matchs et config club quand l'event change
    useEffect(() => {
        if(currentEvent) {
            fetchGroupsByEvent(currentEvent.id)
            fetchMatchesByEvent(currentEvent.id)
        }
    }, [currentEvent, fetchGroupsByEvent, fetchMatchesByEvent])

    useEffect(() => {
        fetchClubConfig(clubId)
    }, [clubId, fetchClubConfig])

    // selectionner le premier groupe par default
    useEffect(() => {
        if(groups.length > 0 && !selectedGroupId) {
            setSelectedGroupsId(groups[0].id)
        }
    }, [groups, selectedGroupId])

    if(loading) {
        return <DrawSkeleton />
    }

    if(!currentEvent) {
        return (
            <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <h3 className="text-lg font-semibold">Tableaux</h3>
                        <EventSelector />
                    </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg">
                    <PencilEdit02Icon className="h-12 w-12 text-gray-300" />
                    <h3 className="mt-4 text-lg font-semibold">Aucun tableau créé</h3>
                    <p className="text-gray-500 mt-3">
                        Créez un événement depuis les paramètres pour commencer
                    </p>
                    <Button className="mt-6" size="sm" variant="outline" onClick={() => navigate("/admin/settings")}>
                        <Settings01Icon className="mr-2 h-4 w-4" />
                        Aller aux paramètres
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold">Tableaux</h3>
                    <EventSelector />
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDisplayMode(prev => prev === "score" ? "points" : "score")}
                    >
                        {displayMode === "score" ? (
                            <StarIcon className="h-4 w-4" />
                        ) : (
                            <HashtagIcon className="h-4 w-4" />
                        )}
                    </Button>
                    {groups.length > 0 && (
                        <>
                            <Button size="sm" variant="outline" onClick={handleExportPdf}>
                                <Download04Icon className="mr-1 h-4 w-4" />
                                Export pdf
                            </Button>
                            {!isCompleted && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button size="sm" disabled={closing}>
                                            <SquareLock01Icon className="mr-1 h-4 w-4" />
                                            {closing ? "Clôture..." : "Clôturer"}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Clôturer l'événement ?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Cette action va calculer les classements Elo de tous les joueurs et marquer l'événement comme terminé. Assurez-vous que tous les résultats sont saisis.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleCloseEvent}>
                                                Confirmer la clôture
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                            {isCompleted && (
                                <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                                    <SquareLock01Icon className="h-3.5 w-3.5" />
                                    Clôturé
                                </span>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Erreur cloture */}
            {matchError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                    {matchError}
                </div>
            )}

            {/* Tableaux */}
            {groups.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <PencilEdit02Icon className="mx-auto h-12 w-12 text-gray-300" />
                    <h3 className="mt-4 text-lg font-semibold">Aucun tableau créé</h3>
                    <p className="text-gray-500 mt-2">
                        Créez des tableaux depuis les paramètres de l'événement
                    </p>
                    <Button className="mt-4" variant="outline" onClick={() => navigate("/admin/settings")}>
                        <Settings01Icon className="mr-2 h-4 w-4" />
                        Aller aux paramètres
                    </Button>
                </div>
            ) : (
                <ScrollArea className="flex-1 min-h-0" type="auto">
                    <div ref={tablesRef} className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {groups.map(group => {
                            const groupMatches = matches.filter(m => m.group_id === group.id)
                            const sortedGroup = sortPlayersByEarliestDates(group, groupMatches)
                            return (
                                <div key={group.id}>
                                    <DrawTable group={sortedGroup} matches={groupMatches} scoringRules={scoringRules ?? undefined} displayMode={displayMode} />
                                </div>
                            )
                        })}
                    </div>
                </ScrollArea>
            )}

            {/* dialog de gestion */}
            <ManageGroupDialog
                open={manageDialogOpen}
                onOpenChange={setManageDialogOpen}
                groups={groups}
                onRefresh={() => currentEvent && fetchGroupsByEvent(currentEvent.id)}
            />
        </div>
    )
}
