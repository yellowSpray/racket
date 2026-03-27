import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { CreditCardIcon } from "hugeicons-react"
import { useUnpaidPayments } from "@/hooks/useUnpaidPayments"
import type { GroupedUnpaidPayment } from "@/hooks/useUnpaidPayments"

interface UnpaidPaymentsCardProps {
    clubId: string | null
    className?: string
}

export function UnpaidPaymentsCard({ clubId, className }: UnpaidPaymentsCardProps) {
    const { grouped, loading } = useUnpaidPayments(clubId)

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                    <CreditCardIcon size={16} className="text-foreground" />
                    Paiements
                    {grouped.length > 0 && (
                        <Badge
                            variant="unpaid"
                            className="ml-auto text-xs px-2 py-0.5"
                        >
                            {grouped.length}
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
                <UnpaidPaymentsFeed grouped={grouped} loading={loading} />
            </CardContent>
        </Card>
    )
}

function UnpaidPaymentsFeed({ grouped, loading }: { grouped: GroupedUnpaidPayment[]; loading: boolean }) {
    if (loading) {
        return (
            <div className="h-full flex items-center justify-center text-gray-400">
                <p className="text-sm">Chargement...</p>
            </div>
        )
    }

    if (grouped.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <CreditCardIcon size={28} className="mb-3" />
                <p className="text-sm">Tous les paiements sont à jour</p>
            </div>
        )
    }

    return (
        <ScrollArea className="h-full max-h-48" type="auto">
            <Table>
                <TableBody>
                    {grouped.map((p) => (
                        <TableRow key={p.profileId}>
                            <TableCell className="text-sm truncate py-1.5">
                                {p.firstName} {p.lastName}
                            </TableCell>
                            <TableCell className="text-right py-1.5">
                                <div className="flex flex-wrap justify-end gap-1">
                                    {p.events.map((eventName) => (
                                        <Badge
                                            key={eventName}
                                            variant="unpaid"
                                            className="text-[10px] px-1.5 py-0"
                                        >
                                            {eventName}
                                        </Badge>
                                    ))}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </ScrollArea>
    )
}
