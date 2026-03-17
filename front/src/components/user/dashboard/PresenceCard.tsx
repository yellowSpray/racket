import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserGroupIcon } from "hugeicons-react"

interface PresenceCardProps {
    className?: string
}

export function PresenceCard({ className }: PresenceCardProps) {
    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                    <UserGroupIcon size={16} className="text-foreground" />
                    Présence
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <UserGroupIcon size={32} className="mb-3" />
                    <p className="text-sm text-center">Qui joue en même temps que vous ce soir</p>
                    <p className="text-xs mt-1">À venir</p>
                </div>
            </CardContent>
        </Card>
    )
}
