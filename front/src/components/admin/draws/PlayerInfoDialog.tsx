import { useEffect } from "react"
import type { GroupPlayer } from "@/types/draw"
import type { PlayerType, PlayerStatus } from "@/types/player"
import type { HistoryMovement } from "@/lib/playerBoxHistory"
import { usePlayerBoxHistory } from "@/hooks/usePlayerBoxHistory"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
    Mail01Icon,
    SmartPhone01Icon,
    ChartIncreaseIcon,
    ChartDecreaseIcon,
    StarIcon,
} from "hugeicons-react"

interface PlayerInfoDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Joueur tel qu'il apparaît dans le tableau. */
    player: GroupPlayer | null
    /**
     * Fiche complète issue du contexte des joueurs. Peut manquer : un joueur
     * retiré de la série reste affiché dans un tableau archivé.
     */
    details: PlayerType | null
}

const STATUS_LABELS: Record<PlayerStatus, string> = {
    member: "Membre",
    visitor: "Visiteur",
    active: "Actif",
    inactive: "Inactif",
}

/** Repère visuel du mouvement d'une série à l'autre. */
const MOVEMENT_STYLES: Record<HistoryMovement, { className: string; icon: React.ReactNode; label: string }> = {
    up:      { className: "text-emerald-600", icon: <ChartIncreaseIcon className="h-3.5 w-3.5" />, label: "Monté" },
    down:    { className: "text-red-500",     icon: <ChartDecreaseIcon className="h-3.5 w-3.5" />, label: "Descendu" },
    same:    { className: "text-gray-400",    icon: <span className="text-[10px] font-bold leading-none">=</span>, label: "Maintenu" },
    first:   { className: "text-blue-500",    icon: <StarIcon className="h-3.5 w-3.5" />, label: "Première série" },
    unknown: { className: "text-gray-300",    icon: <span className="text-[10px] leading-none">?</span>, label: "Tableau hors barème" },
}

function formatDate(date: string) {
    if (!date) return ""
    return new Date(date).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })
}

/**
 * Fiche d'un joueur, ouverte depuis son nom dans un tableau.
 *
 * Le contact et le statut viennent du contexte des joueurs, déjà chargé par la
 * page : aucun appel réseau pour cette partie. Seul le parcours en tableaux est
 * requêté, à l'ouverture.
 */
export function PlayerInfoDialog({ open, onOpenChange, player, details }: PlayerInfoDialogProps) {
    const { history, loading, fetchHistory } = usePlayerBoxHistory()

    const playerId = player?.id

    useEffect(() => {
        if (!open || !playerId) return
        fetchHistory(playerId)
    }, [open, playerId, fetchHistory])

    if (!player) return null

    const fullName = `${player.first_name} ${player.last_name}`
    const phone = details?.phone || player.phone
    const elo = details?.power_ranking ?? player.power_ranking

    // Du plus récent au plus ancien : c'est la série en cours qu'on regarde.
    const recentFirst = [...history].reverse()

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px] bg-white">
                <DialogHeader>
                    <DialogTitle>{fullName}</DialogTitle>
                    <DialogDescription>
                        {details?.box ? `Actuellement en ${details.box}` : "Fiche du joueur"}
                    </DialogDescription>
                </DialogHeader>

                {/* Contact */}
                <div className="flex flex-col gap-1.5 text-sm">
                    {details?.email && (
                        <span className="inline-flex items-center gap-2">
                            <Mail01Icon className="h-4 w-4 text-muted-foreground" />
                            {details.email}
                        </span>
                    )}
                    {phone && (
                        <span className="inline-flex items-center gap-2">
                            <SmartPhone01Icon className="h-4 w-4 text-muted-foreground" />
                            {phone}
                        </span>
                    )}
                </div>

                {/* Statut, paiement, classement */}
                <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                    {(details?.status ?? []).map(s => (
                        <Badge key={s} variant={s}>{STATUS_LABELS[s]}</Badge>
                    ))}
                    {details?.payment_status && (
                        <Badge variant={details.payment_status}>
                            {details.payment_status === "paid" ? "Payé" : "Non payé"}
                        </Badge>
                    )}
                    <span className="ml-auto text-sm text-muted-foreground">
                        Classement <span className="font-semibold text-foreground">{elo}</span>
                    </span>
                </div>

                {/* Parcours en tableaux */}
                <div className="border-t pt-3">
                    <h4 className="text-sm font-semibold mb-2">Parcours</h4>

                    {loading ? (
                        <p className="text-sm text-muted-foreground">Chargement...</p>
                    ) : recentFirst.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">
                            Première série de ce joueur.
                        </p>
                    ) : (
                        <ul className="max-h-56 overflow-y-auto space-y-1">
                            {recentFirst.map(entry => {
                                const style = MOVEMENT_STYLES[entry.movement]
                                return (
                                    <li
                                        key={`${entry.eventName}-${entry.roundNumber}-${entry.startDate}`}
                                        data-testid="history-entry"
                                        className="flex items-center gap-3 text-sm px-2 py-1.5 rounded border border-gray-200"
                                    >
                                        <span
                                            data-testid={`history-movement-${entry.movement}`}
                                            aria-label={style.label}
                                            title={style.label}
                                            className={`inline-flex items-center shrink-0 ${style.className}`}
                                        >
                                            {style.icon}
                                        </span>
                                        <span className="font-semibold w-16 shrink-0">{entry.groupName}</span>
                                        <span className="text-muted-foreground truncate flex-1">
                                            {entry.eventName}, série {entry.roundNumber}
                                        </span>
                                        <span className="text-muted-foreground shrink-0">
                                            {formatDate(entry.startDate)}
                                        </span>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
