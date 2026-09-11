import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Link04Icon, Tick02Icon } from "hugeicons-react"

interface EventInviteLinkProps {
    /** Lien d'inscription de l'evenement, vide si le club n'accueille pas de visiteurs. */
    inviteUrl: string
    eventName: string
    className?: string
    /**
     * Pastille ronde sans libelle, pour la barre du haut. Le geste est le meme,
     * seul l'habillage change : d'ou ce mode ici plutot qu'un second composant
     * qui dupliquerait la copie et sa confirmation.
     */
    iconOnly?: boolean
}

/**
 * Lien d'invitation d'un evenement, sous forme de bouton qui copie.
 *
 * Il vivait dans la carte des valeurs par defaut du club, ou il n'avait rien a
 * faire : un lien d'invitation appartient a un evenement precis, pas aux
 * reglages du club. Sa place est sur la ligne de l'evenement qu'il ouvre, d'ou
 * une forme compacte plutot qu'un champ de saisie.
 */
export function EventInviteLink({ inviteUrl, eventName, className, iconOnly }: EventInviteLinkProps) {
    const [copied, setCopied] = useState(false)

    if (!inviteUrl) return null

    const copier = async () => {
        await navigator.clipboard.writeText(inviteUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (iconOnly) {
        const libelle = copied
            ? `Lien d'invitation de ${eventName} copié`
            : `Copier le lien d'invitation de ${eventName}`
        return (
            <Button
                variant="icon"
                size="iconSm"
                // Filet de 1 px : a 32 px de cote, un trait double ecrase le pictogramme.
                className={cn("border", className)}
                title={libelle}
                aria-label={libelle}
                onClick={copier}
            >
                {copied
                    ? <Tick02Icon size={16} strokeWidth={2} className="text-green-600" />
                    : <Link04Icon size={16} strokeWidth={2} />}
            </Button>
        )
    }

    return (
        <Button
            variant="outline"
            size="sm"
            className={className}
            title={`Copier le lien d'invitation de ${eventName}`}
            aria-label={`Copier le lien d'invitation de ${eventName}`}
            onClick={copier}
        >
            {copied ? (
                <><Tick02Icon size={14} className="text-green-600" /> Copié</>
            ) : (
                <><Link04Icon size={14} /> Lien d'invitation</>
            )}
        </Button>
    )
}
