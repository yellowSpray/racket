import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { ChartIncreaseIcon } from "hugeicons-react"

interface EvolutionCardProps {
    className?: string
}

export function EvolutionCard({ className }: EvolutionCardProps) {
    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                    <ChartIncreaseIcon size={16} className="text-foreground" />
                    Évolution
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <ChartIncreaseIcon size={32} className="mb-3" />
                    <p className="text-sm text-center">Votre progression dans les tableaux au fil des séries</p>
                    <p className="text-xs mt-1">À venir</p>
                </div>
            </CardContent>
        </Card>
    )
}
