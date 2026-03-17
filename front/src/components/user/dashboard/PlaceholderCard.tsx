import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { MoreHorizontalIcon } from "hugeicons-react"

interface PlaceholderCardProps {
    className?: string
}

export function PlaceholderCard({ className }: PlaceholderCardProps) {
    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                    <MoreHorizontalIcon size={16} className="text-foreground" />
                    À définir
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <MoreHorizontalIcon size={32} className="mb-3" />
                    <p className="text-sm text-center">Espace réservé</p>
                    <p className="text-xs mt-1">À venir</p>
                </div>
            </CardContent>
        </Card>
    )
}
