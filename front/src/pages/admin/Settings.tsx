import { EventsManager } from "@/components/admin/settings/EventsManager"
import { ClubConfigManager } from "@/components/admin/settings/ClubConfigManager"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function SettingsAdmin () {
    return (
        <div className="flex flex-col h-full min-h-0">
            <Tabs defaultValue="events" className="flex flex-col flex-1 min-h-0">
                <div className="flex flex-row items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">Paramètres</h3>
                    <TabsList>
                        <TabsTrigger value="events">Événements</TabsTrigger>
                        <TabsTrigger value="clubs">Mon club</TabsTrigger>
                        <TabsTrigger value="users">Utilisateurs</TabsTrigger>
                        <TabsTrigger value="general">Général</TabsTrigger>
                    </TabsList>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden rounded-md">
                    <TabsContent value="events" className="h-full">
                        <EventsManager />
                    </TabsContent>

                    <TabsContent value="clubs" className="h-full">
                        <ClubConfigManager />
                    </TabsContent>

                    <TabsContent value="users" className="h-full">
                        <div className="text-gray-500">Gestion des utilisateurs - À venir</div>
                    </TabsContent>

                    <TabsContent value="general" className="h-full">
                        <div className="text-gray-500">Paramètres généraux - À venir</div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    )
}