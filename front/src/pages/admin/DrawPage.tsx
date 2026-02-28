import { EventSelector } from "@/components/admin/settings/EventSelector"
import Loading from "@/components/shared/Loading"
import { useEvent } from "@/contexts/EventContext"
import { useGroups } from "@/hooks/useGroups"
import { useEffect, useState } from "react"
import { Plus, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DrawTable } from "@/components/admin/draws/DrawTable"
import { CreateGroupsDialog } from "@/components/admin/draws/CreateGroupsDialog"
import { ManageGroupDialog } from "@/components/admin/draws/ManageGroupsDialog"

export function DrawAdmin () {

    const { currentEvent } = useEvent()
    const { groups, loading, fetchGroupsByEvent } = useGroups()
    const [selectedGroupId, setSelectedGroupsId] = useState<string | null>(null)
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [manageDialogOpen, setManageDialogOpen] = useState(false)

    // charger les groups quand l'event change
    useEffect(() => {
        if(currentEvent) {
            fetchGroupsByEvent(currentEvent.id)
        }
    }, [currentEvent])

    // selectionner le premier groupe par default
    useEffect(() => {
        if(groups.length > 0 && !selectedGroupId) {
            setSelectedGroupsId(groups[0].id)
        }
    }, [groups, selectedGroupId])

    if(loading) {
        return <Loading />
    }

    if(!currentEvent) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Tableaux</h2>
                    <EventSelector />
                </div>
                <p className="text-gray-500">Sélectionnez un événement pour voir les tableaux</p>
            </div>
        )
    }

    return (
        <>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold">Tableaux - {currentEvent.event_name}</h2>
                    <EventSelector />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setManageDialogOpen(true)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Gérer les groupes
                    </Button>
                    <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Créer les tableaux
                    </Button>
                </div>
            </div>

            {/* Tableaux */}
            {groups.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <h3 className="mt-4 text-lg font-semibold">Aucun tableau créé</h3>
                    <p className="text-gray-500 mt-2">
                        Créez des tableaux pour organiser les matchs en round-robin
                    </p>
                    <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Créer les tableaux
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {groups.map(group => (
                        <div key={group.id}>
                            <DrawTable group={group} />
                        </div>
                    ))}
                </div>
            )}

            {/* dialog de creation */}
            <CreateGroupsDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
            />

            {/* dialog de gestion */}
            <ManageGroupDialog
                open={manageDialogOpen}
                onOpenChange={setManageDialogOpen}
                groups={groups}
                onRefresh={() => currentEvent && fetchGroupsByEvent(currentEvent.id)}
            />
        </>
    )
}