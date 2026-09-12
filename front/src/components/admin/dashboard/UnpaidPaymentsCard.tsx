import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CreditCardIcon } from "hugeicons-react"
import { useUnpaidPayments } from "@/hooks/useUnpaidPayments"
import type { GroupedUnpaidPayment } from "@/hooks/useUnpaidPayments"

interface UnpaidPaymentsCardProps {
    clubId: string | null
    className?: string
    /**
     * Relance des joueurs qui n'ont pas payé. Optionnel : le bouton s'affiche
     * dès qu'il reste un impayé, et ne fait rien tant que le chemin d'envoi
     * n'existe pas. Voir `AdminEmail`, encore un talon.
     */
    onRelancer?: () => void
}

/**
 * Les impayés du club, un joueur par ligne.
 *
 * Deux rouges, deux rôles, et c'est la seule chose à ne pas défaire ici. Le
 * compte de l'en-tête est un rouge plein : c'est l'alerte, le chiffre qu'on
 * vient chercher. Les badges de série sont un rouge pâle : ils qualifient la
 * ligne, ils n'alertent pas. Poser le rouge plein sur les deux ferait crier la
 * carte entière, et le compte se perdrait dans sa propre liste.
 */
export function UnpaidPaymentsCard({ clubId, className, onRelancer }: UnpaidPaymentsCardProps) {
    const { grouped, loading } = useUnpaidPayments(clubId)

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                    <CreditCardIcon size={16} className="text-foreground" />
                    Paiements
                    {grouped.length > 0 && (
                        // Un disque et non une pastille : un compte est un
                        // nombre, pas une étiquette.
                        <Badge variant="unpaid" className="size-5 p-0 text-[11px] leading-none">
                            {grouped.length}
                        </Badge>
                    )}

                    {grouped.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="ml-auto border text-xs"
                            onClick={onRelancer}
                        >
                            Relancer
                        </Button>
                    )}
                </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 min-h-0 px-6 pt-1">
                <UnpaidPaymentsFeed grouped={grouped} loading={loading} />
            </CardContent>
        </Card>
    )
}

function UnpaidPaymentsFeed({ grouped, loading }: { grouped: GroupedUnpaidPayment[]; loading: boolean }) {
    if (loading) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                <p className="text-sm">Chargement...</p>
            </div>
        )
    }

    if (grouped.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <CreditCardIcon size={28} className="mb-3" />
                <p className="text-sm">Tous les paiements sont à jour</p>
            </div>
        )
    }

    return (
        <ScrollArea className="h-full" type="auto">
            <ul>
                {grouped.map((p, i) => (
                    <li
                        key={p.profileId}
                        data-ligne-impaye
                        className={`flex h-8 items-center gap-2 rounded-md px-4 ${
                            i % 2 === 0 ? "bg-muted/40" : ""
                        }`}
                    >
                        <span className="min-w-0 flex-1 truncate text-sm">
                            {p.firstName} {p.lastName}
                        </span>

                        <span className="flex shrink-0 items-center gap-1">
                            {p.rounds.length > 2 && (
                                <Badge className="text-[10px] px-1.5 py-0">
                                    +{p.rounds.length - 2}
                                </Badge>
                            )}
                            {p.rounds.slice(-2).map((round) => (
                                <Badge
                                    key={round.paymentId}
                                    variant="unpaidSoft"
                                    title={`${round.eventName}, série ${round.roundNumber}`}
                                    className="text-[11px] font-semibold px-2 py-0"
                                >
                                    Série {round.roundNumber}
                                </Badge>
                            ))}
                        </span>
                    </li>
                ))}
            </ul>
        </ScrollArea>
    )
}
