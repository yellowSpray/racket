import { EventsManager } from "@/components/admin/settings/EventsManager"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function SettingsAdmin () {
    return (
        <>
            <Tabs defaultValue="events">
                <div className="flex flex-row items-center justify-between mb-4">
                    <h2>Paramètres</h2>
                    <TabsList>
                        <TabsTrigger value="events">Événements</TabsTrigger>
                        <TabsTrigger value="clubs">Clubs</TabsTrigger>
                        <TabsTrigger value="users">Utilisateurs</TabsTrigger>
                        <TabsTrigger value="general">Général</TabsTrigger>
                    </TabsList>
                </div>
                <div className="overflow-hidden rounded-md">
                    <TabsContent value="events">
                        <EventsManager />
                    </TabsContent>

                    <TabsContent value="clubs">
                        <div className="text-gray-500">Gestion des clubs - À venir</div>
                    </TabsContent>

                    <TabsContent value="users">
                        <div className="text-gray-500">Gestion des utilisateurs - À venir</div>
                    </TabsContent>

                    <TabsContent value="general">
                        <div className="text-gray-500">Paramètres généraux - À venir</div>
                    </TabsContent>
                </div>
            </Tabs>
        </>
    )
}