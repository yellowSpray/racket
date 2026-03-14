import { useEffect, useMemo, useState } from "react"
import { EventsManager } from "@/components/admin/settings/EventsManager"
import { ClubConfigManager } from "@/components/admin/settings/ClubConfigManager"
import { UsersManager } from "@/components/admin/settings/UsersManager"
import { GeneralSettings } from "@/components/admin/settings/GeneralSettings"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { UserAdd01Icon, Search01Icon } from "hugeicons-react"
import { useAuth } from "@/contexts/AuthContext"
import { useClubConfig } from "@/hooks/useClubConfig"
import type { ClubDefaults } from "@/components/admin/settings/EventDialog"

/** Normalize Supabase time "19:00:00+00" → "19:00" */
function formatTime(time: string | undefined): string | undefined {
    if (!time) return undefined
    return time.replace(/([+-]\d{2})$/, "").slice(0, 5)
}

export function AdminSettings () {
    const { profile } = useAuth()
    const { clubConfig, fetchClubConfig } = useClubConfig()
    const [activeTab, setActiveTab] = useState("events")
    const [usersSearch, setUsersSearch] = useState("")
    const [usersInviteOpen, setUsersInviteOpen] = useState(false)

    const clubDefaults = useMemo<ClubDefaults | undefined>(() => {
        if (!clubConfig) return undefined
        return {
            startTime: formatTime(clubConfig.default_start_time) ?? "19:00",
            endTime: formatTime(clubConfig.default_end_time) ?? "23:00",
            numberOfCourts: clubConfig.default_number_of_courts,
            matchDuration: clubConfig.default_match_duration,
        }
    }, [clubConfig])

    useEffect(() => {
        fetchClubConfig(profile?.club_id ?? null)
    }, [profile?.club_id, fetchClubConfig])

    return (
        <div className="flex flex-col h-full min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
                <div className="flex flex-row items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-3 shrink-0">
                        <h3 className="text-lg font-semibold">Paramètres</h3>
                        {clubConfig && (
                            <span className="text-sm text-muted-foreground">- {clubConfig.club_name}</span>
                        )}
                    </div>
                    {activeTab === "users" && (
                        <div className="relative flex-1 max-w-sm">
                            <Search01Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={usersSearch}
                                onChange={(e) => setUsersSearch(e.target.value)}
                                placeholder="Rechercher par nom ou email..."
                                className="pl-9 rounded-full h-10"
                            />
                        </div>
                    )}
                    <div className="flex items-center gap-3 shrink-0">
                        {activeTab === "users" && (
                            <Button variant="default" size="lg" onClick={() => setUsersInviteOpen(true)}>
                                <UserAdd01Icon size={20} strokeWidth={2} />
                                Ajouter
                            </Button>
                        )}
                        <TabsList className="h-10 rounded-full">
                            <TabsTrigger value="general">Général</TabsTrigger>
                            <TabsTrigger value="events">Événements</TabsTrigger>
                            <TabsTrigger value="clubs">Mon club</TabsTrigger>
                            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
                        </TabsList>
                    </div>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden rounded-md">
                    <TabsContent value="events" className="h-full">
                        <EventsManager clubDefaults={clubDefaults} />
                    </TabsContent>

                    <TabsContent value="clubs" className="h-full">
                        <ClubConfigManager />
                    </TabsContent>

                    <TabsContent value="users" className="h-full">
                        <UsersManager
                            globalFilter={usersSearch}
                            onGlobalFilterChange={setUsersSearch}
                            inviteOpen={usersInviteOpen}
                            onInviteOpenChange={setUsersInviteOpen}
                        />
                    </TabsContent>

                    <TabsContent value="general" className="h-full">
                        <GeneralSettings />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    )
}
