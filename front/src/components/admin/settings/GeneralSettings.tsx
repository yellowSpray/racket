import { useState } from "react"
import { useEvent } from "@/contexts/EventContext"
import { useInviteLink } from "@/hooks/useInviteLink"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Link04Icon, Tick02Icon } from "hugeicons-react"

export function GeneralSettings() {
    const { currentEvent } = useEvent()
    const { getInviteUrl } = useInviteLink()
    const [copied, setCopied] = useState(false)

    const inviteUrl = currentEvent?.invite_token ? getInviteUrl(currentEvent.invite_token) : ""

    const handleCopy = async () => {
        await navigator.clipboard.writeText(inviteUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="flex flex-col gap-6 h-full overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Link04Icon size={16} className="text-foreground" />
                            Lien d'invitation
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4 pt-4">
                        {inviteUrl ? (
                            <div className="flex flex-col gap-2">
                                <Label className="flex items-center gap-1.5 text-sm">
                                    {currentEvent?.event_name}
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
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                Sélectionnez un événement pour afficher le lien d'invitation.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
