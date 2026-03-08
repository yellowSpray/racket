import type { UnpaidPayment } from "@/hooks/useUnpaidPayments"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { CreditCardIcon } from "hugeicons-react"

interface UnpaidPaymentsFeedProps {
    payments: UnpaidPayment[]
    loading: boolean
}

export function UnpaidPaymentsFeed({ payments, loading }: UnpaidPaymentsFeedProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-8 text-gray-400">
                <p className="text-sm">Chargement...</p>
            </div>
        )
    }

    if (payments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                <CreditCardIcon size={28} className="mb-3" />
                <p className="text-sm">Tous les paiements sont à jour</p>
            </div>
        )
    }

    return (
        <ScrollArea className="h-full max-h-48" type="auto">
            <Table>
                <TableBody>
                    {payments.map((p) => (
                        <TableRow key={p.id}>
                            <TableCell className="text-sm truncate py-1.5">
                                {p.firstName} {p.lastName}
                            </TableCell>
                            <TableCell className="text-right py-1.5">
                                <Badge
                                    variant="unpaid"
                                    className="text-[10px] px-1.5 py-0"
                                >
                                    {p.eventName}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </ScrollArea>
    )
}
