import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Link04Icon, Tick02Icon } from "hugeicons-react"

interface EventInviteLinkProps {
    /** Lien d'inscription de l'evenement, vide si le club n'accueille pas de visiteurs. */
    inviteUrl: string
    eventName: string
    className?: string
}

/**
 * Lien d'invitation d'un evenement, sous forme de bouton qui copie.
 *
 * Il vivait dans la carte des valeurs par defaut du club, ou il n'avait rien a
 * faire : un lien d'invitation appartient a un evenement precis, pas aux
 * reglages du club. Sa place est sur la ligne de l'evenement qu'il ouvre, d'ou
 * une forme compacte plutot qu'un champ de saisie.
 */
export function EventInviteLink({ inviteUrl, eventName, className }: EventInviteLinkProps) {
    const [copied, setCopied] = useState(false)

    if (!inviteUrl) return null

    return (
        <Button
            variant="outline"
            size="sm"
            className={className}
            title={`Copier le lien d'invitation de ${eventName}`}
            aria-label={`Copier le lien d'invitation de ${eventName}`}
            onClick={async () => {
                await navigator.clipboard.writeText(inviteUrl)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
            }}
        >
            {copied ? (
                <><Tick02Icon size={14} className="text-green-600" /> Copié</>
            ) : (
                <><Link04Icon size={14} /> Lien d'invitation</>
            )}
        </Button>
    )
}
