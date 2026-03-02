import { EventSelector } from "@/components/admin/settings/EventSelector"
import Loading from "@/components/shared/Loading"
import { useEvent } from "@/contexts/EventContext"
import { useGroups } from "@/hooks/useGroups"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { Settings, SquarePen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DrawTable } from "@/components/admin/draws/DrawTable"
// import { CreateGroupsDialog } from "@/components/admin/draws/CreateGroupsDialog"
import { ManageGroupDialog } from "@/components/admin/draws/ManageGroupsDialog"

export function DrawAdmin () {

    const { currentEvent } = useEvent()
    const { groups, loading, fetchGroupsByEvent } = useGroups()
    const [selectedGroupId, setSelectedGroupsId] = useState<string | null>(null)
    // const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [manageDialogOpen, setManageDialogOpen] = useState(false)
    const navigate = useNavigate()

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
            <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <h3 className="text-lg font-semibold">Tableaux</h3>
                        <EventSelector />
                    </div>
                    <Button variant="outline" size="sm" disabled>
                        <Settings className="mr-2 h-4 w-4" />
                        Gérer les groupes
                    </Button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg">
                    <SquarePen className="h-12 w-12 text-gray-300" />
                    <h3 className="mt-4 text-lg font-semibold">Aucun tableau créé</h3>
                    <p className="text-gray-500 mt-3">
                        Créez un événement depuis les paramètres pour commencer
                    </p>
                    <Button className="mt-6" size="sm" variant="outline" onClick={() => navigate("/admin/settings")}>
                        <Settings className="mr-2 h-4 w-4" />
                        Aller aux paramètres
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold">Tableaux</h3>
                    <EventSelector />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setManageDialogOpen(true)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Gérer les groupes
                    </Button>
                    {/* <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Créer les tableaux
                    </Button> */}
                </div>
            </div>

            {/* Tableaux */}
            {groups.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <SquarePen className="mx-auto h-12 w-12 text-gray-300" />
                    <h3 className="mt-4 text-lg font-semibold">Aucun tableau créé</h3>
                    <p className="text-gray-500 mt-2">
                        Créez des tableaux depuis les paramètres de l'événement
                    </p>
                    <Button className="mt-4" variant="outline" onClick={() => navigate("/admin/settings")}>
                        <Settings className="mr-2 h-4 w-4" />
                        Aller aux paramètres
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
