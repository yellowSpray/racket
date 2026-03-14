import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useEvent } from "@/contexts/EventContext"
import { useClubConfig } from "@/hooks/useClubConfig"
import { useInviteLink } from "@/hooks/useInviteLink"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Link04Icon, Tick02Icon, Globe02Icon } from "hugeicons-react"

export function GeneralSettings() {
    const { profile } = useAuth()
    const { currentEvent } = useEvent()
    const { clubConfig, fetchClubConfig, updateClubDefaults } = useClubConfig()
    const { getInviteUrl } = useInviteLink()
    const [saving, setSaving] = useState(false)
    const [copied, setCopied] = useState(false)

    const clubId = profile?.club_id ?? null

    useEffect(() => {
        fetchClubConfig(clubId)
    }, [clubId, fetchClubConfig])

    const isOpen = clubConfig?.open_to_visitors ?? false
    const inviteUrl = currentEvent?.invite_token ? getInviteUrl(currentEvent.invite_token) : ""

    const handleToggleVisitors = async (checked: boolean) => {
        if (!clubId) return

        setSaving(true)
        await updateClubDefaults(clubId, { open_to_visitors: checked })
        setSaving(false)
        fetchClubConfig(clubId)
    }

    const handleCopy = async () => {
        await navigator.clipboard.writeText(inviteUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="flex flex-col gap-6 h-full overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Card : Accès visiteurs */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe02Icon size={16} className="text-foreground" />
                            Accès visiteurs
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <Checkbox
                                id="open-to-visitors"
                                checked={isOpen}
                                onCheckedChange={handleToggleVisitors}
                                disabled={saving}
                                aria-label="Ouvert aux visiteurs"
                            />
                            <Label htmlFor="open-to-visitors" className="cursor-pointer">
                                Ouvert aux visiteurs externes
                            </Label>
                        </div>
                        <p className="text-xs text-gray-500">
                            Permet aux joueurs d'autres clubs de découvrir les événements de votre club et demander à y participer. Si désactivé, aucun événement ne sera visible par les visiteurs.
                        </p>

                        {isOpen && inviteUrl && (
                            <div className="flex flex-col gap-2 mt-2">
                                <Label className="flex items-center gap-1.5 text-sm">
                                    <Link04Icon size={14} />
                                    Lien d'invitation ({currentEvent?.event_name})
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        readOnly
                                        value={inviteUrl}
                                        className="text-sm text-gray-600 bg-muted/50"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCopy}
                                        aria-label="Copier le lien"
                                    >
                                        {copied ? (
                                            <><Tick02Icon size={14} className="text-green-600" /> Copié</>
                                        ) : (
                                            "Copier"
                                        )}
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-400">
                                    Partagez ce lien pour inviter des joueurs d'autres clubs.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
