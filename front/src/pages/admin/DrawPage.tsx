import { EventSelector } from "@/components/admin/settings/EventSelector"
import Loading from "@/components/shared/Loading"
import { useEvent } from "@/contexts/EventContext"
import { useGroups } from "@/hooks/useGroups"
import { useEffect, useState } from "react"
import { Plus, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DrawTable } from "@/components/admin/draws/DrawTable"

export function DrawAdmin () {

    const { currentEvent } = useEvent()
    const { groups, loading, fetchGroupsByEvents } = useGroups()
    const [selectedGroupId, setSelectedGroupsId] = useState<string | null>(null)

    // charger les groups quand l'event change
    useEffect(() => {
        if(currentEvent) {
            fetchGroupsByEvents(currentEvent.id)
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
                    <Button variant="outline" size="sm">
                        <Settings className="mr-2 h-4 w-4" />
                        Gérer les groupes
                    </Button>
                    <Button size="sm">
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
                    <Button className="mt-4">
                        <Plus className="mr-2 h-4 w-4" />
                        Créer les tableaux
                    </Button>
                </div>
            ) : (
                <Tabs value={selectedGroupId || groups[0]?.id} onValueChange={setSelectedGroupsId}>
                    <TabsList>
                        {groups.map(group => (
                            <TabsTrigger key={group.id} value={group.id}>
                                {group.group_name} ({group.players?.length || 0}/{group.max_players})
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {groups.map(group => (
                        <TabsContent key={group.id} value={group.id} className="mt-6">
                            <DrawTable group={group} />
                        </TabsContent>
                    ))}
                </Tabs>
            )}
        </>
    )
}