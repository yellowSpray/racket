import { useState } from "react"
import { EventsManager } from "@/components/admin/settings/EventsManager"
import { SettingsManager } from "@/components/admin/settings/SettingsManager"
import { UsersManager } from "@/components/admin/settings/UsersManager"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { UserAdd01Icon } from "hugeicons-react"
import { useHeaderSlot, useHeaderActions } from "@/contexts/HeaderSlotContext"
import { useRechercheDeLaPage } from "@/contexts/RechercheContext"

export function AdminSettings () {
    const [activeTab, setActiveTab] = useState("manage")
    /*
     * La recherche du header filtre l'onglet affiche : les evenements sous
     * Gestion, les membres sous Utilisateurs. Les utilisateurs avaient leur
     * propre champ dans la ligne de titre, soit deux recherches a l'ecran.
     */
    const recherche = useRechercheDeLaPage()
    const [usersInviteOpen, setUsersInviteOpen] = useState(false)

    const headerPortal = useHeaderSlot(
        <>
            {/*
              * Le titre ne redit pas le nom du club : le fil d'Ariane
              * l'affiche a quelques pixels de la, dans son premier segment.
              */}
            <h3 className="text-lg font-semibold">Paramètres</h3>
        </>
    )

    const actionsPortal = useHeaderActions(
        <>
            {activeTab === "users" && (
                <Button variant="default" size="lg" onClick={() => setUsersInviteOpen(true)}>
                    <UserAdd01Icon size={20} strokeWidth={2} />
                    Ajouter
                </Button>
            )}
            <TabsList className="h-10 rounded-full">
                <TabsTrigger value="manage">Gestion</TabsTrigger>
                <TabsTrigger value="settings">Paramètres</TabsTrigger>
                <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            </TabsList>
        </>
    )

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0 h-full">
            {/* Portals rendus ici pour avoir accès au contexte Tabs */}
            {headerPortal}
            {actionsPortal}
            <div className="flex-1 min-h-0 overflow-hidden rounded-md">
                <TabsContent value="manage" className="h-full">
                    <EventsManager recherche={recherche} />
                </TabsContent>
                {/* Les onglets Evenements et Mon club ne contenaient que des
                    reglages de club : ils sont reunis ici. */}
                <TabsContent value="settings" className="h-full">
                    <SettingsManager />
                </TabsContent>
                <TabsContent value="users" className="h-full">
                    <UsersManager
                        globalFilter={recherche}
                        inviteOpen={usersInviteOpen}
                        onInviteOpenChange={setUsersInviteOpen}
                    />
                </TabsContent>
            </div>
        </Tabs>
    )
}
