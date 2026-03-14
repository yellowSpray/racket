import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TaskEdit01Icon } from "hugeicons-react"

interface PendingScoresCardProps {
    className?: string
}

export function PendingScoresCard({ className }: PendingScoresCardProps) {
    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                    <TaskEdit01Icon size={16} className="text-foreground" />
                    Scores en attente
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center text-gray-400">
                    <TaskEdit01Icon size={28} className="mb-2" />
                    <p className="text-xs text-center">Résultats à saisir</p>
                    <p className="text-xs mt-1">À venir</p>
                </div>
            </CardContent>
        </Card>
    )
}
