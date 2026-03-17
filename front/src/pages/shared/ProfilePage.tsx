import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { UserAccountIcon, Mail01Icon, SmartPhone01Icon } from "hugeicons-react"
import { useClubs } from "@/hooks/useClub"
import { supabase } from "@/lib/supabaseClient"
import { useCallback, useEffect, useMemo, useState } from "react"

const roleLabels: Record<string, string> = {
    user: "Joueur",
    admin: "Administrateur",
    superadmin: "Super Admin",
}

export function ProfilePage() {
    const { profile } = useAuth()
    const { clubs } = useClubs()

    const [sports, setSports] = useState<string[]>([])

    const club = useMemo(() => {
        if (!profile?.club_id || !clubs.length) return null
        return clubs.find(c => c.id === profile.club_id) ?? null
    }, [clubs, profile?.club_id])

    const fetchSports = useCallback(async () => {
        if (!profile?.id) return
        const { data } = await supabase
            .from("profile_sports")
            .select("sports(sport_name)")
            .eq("profile_id", profile.id)
        if (data) {
            setSports(data.map((d: { sports: { sport_name: string } }) => d.sports.sport_name))
        }
    }, [profile?.id])

    useEffect(() => {
        fetchSports()
    }, [fetchSports])

    if (!profile) return null

    return (
        <div className="flex flex-col h-full min-h-0 gap-5">
            <h3 className="text-lg font-semibold">Mon profil</h3>

            <div className="flex-1 min-h-0 grid grid-cols-28 grid-rows-16 gap-5">
                {/* Info principale */}
                <Card className="col-start-1 col-span-28 row-start-1 row-span-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <UserAccountIcon size={16} className="text-foreground" />
                            Informations personnelles
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-start gap-6">
                            <Avatar className="w-20 h-20">
                                <AvatarImage
                                    src={profile.avatar_url || "https://github.com/shadcn.png"}
                                    alt={`${profile.first_name} ${profile.last_name}`}
                                />
                            </Avatar>
                            <div className="flex-1 space-y-4">
                                <div>
                                    <p className="text-xl font-bold">
                                        {profile.first_name} {profile.last_name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <Badge variant="member">
                                            {roleLabels[profile.role] ?? profile.role}
                                        </Badge>
                                        {club && (
                                            <Badge variant="default">{club.club_name}</Badge>
                                        )}
                                        {sports.map(sport => (
                                            <Badge key={sport} variant="visitor">{sport}</Badge>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2.5">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Mail01Icon size={14} className="text-muted-foreground shrink-0" />
                                        <span>{profile.email}</span>
                                    </div>
                                    {profile.phone && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <SmartPhone01Icon size={14} className="text-muted-foreground shrink-0" />
                                            <span>{profile.phone}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}
