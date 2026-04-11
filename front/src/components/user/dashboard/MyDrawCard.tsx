import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LayoutTable02Icon } from "hugeicons-react"
import { DrawTable } from "@/components/admin/draws/DrawTable"
import type { Group } from "@/types/draw"
import type { Match } from "@/types/match"
import type { ScoringRules } from "@/types/settings"

interface MyDrawCardProps {
    myGroup: Group | null
    matches: Match[]
    scoringRules?: ScoringRules
    className?: string
}

export function MyDrawCard({ myGroup, matches, scoringRules, className }: MyDrawCardProps) {
    const groupMatches = myGroup
        ? matches.filter(m => m.group_id === myGroup.id)
        : []

    return (
        <Card className={`${className} flex flex-col`}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                    <LayoutTable02Icon size={16} className="text-foreground" />
                    Mon tableau
                    {myGroup && (
                        <span className="text-xs text-muted-foreground font-normal ml-1">
                            {myGroup.group_name}
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 h-full">
                {myGroup ? (
                    <DrawTable
                        group={myGroup}
                        matches={groupMatches}
                        scoringRules={scoringRules}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                        <LayoutTable02Icon size={32} className="mb-3" />
                        <p className="text-sm text-center">Vous n'êtes dans aucun tableau</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
