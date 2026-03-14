import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircleIcon } from "hugeicons-react"

interface AlertsCardProps {
    className?: string
}

export function AlertsCard({ className }: AlertsCardProps) {
    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                    <AlertCircleIcon size={16} className="text-foreground" />
                    Alertes
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center text-gray-400">
                    <AlertCircleIcon size={24} className="mb-2" />
                    <p className="text-xs text-center">Matchs sans résultat, conflits de planning, absences signalées</p>
                    <p className="text-xs mt-1">À venir</p>
                </div>
            </CardContent>
        </Card>
    )
}
