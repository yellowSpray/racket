import { useState } from "react"
import { Alert02Icon, ArrowDown01Icon, ArrowUp01Icon, PlusSignIcon, Calendar03Icon, UserIcon } from "hugeicons-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { SchedulerDiagnostic, SuggestionType } from "@/lib/schedulerSuggestions"

interface UnplacedMatchesPanelProps {
    diagnostic: SchedulerDiagnostic
}

const SUGGESTION_ICONS: Record<SuggestionType, typeof PlusSignIcon> = {
    add_courts: PlusSignIcon,
    add_dates: Calendar03Icon,
    check_player: UserIcon,
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr + "T12:00:00")
    return date.toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
    })
}

export function UnplacedMatchesPanel({ diagnostic }: UnplacedMatchesPanelProps) {
    const [expanded, setExpanded] = useState(false)

    if (diagnostic.unplacedCount === 0) return null

    return (
        <div className="bg-amber-50 border border-amber-200 rounded-lg mb-4">
            {/* Summary */}
            <div className="px-4 py-3 flex items-start gap-3">
                <Alert02Icon className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-amber-800">
                        {diagnostic.placedCount}/{diagnostic.totalCount} matchs planifies
                        {" — "}
                        {diagnostic.unplacedCount} match(s) sans creneau
                    </p>

                    {/* Suggestions */}
                    {diagnostic.suggestions.length > 0 && (
                        <ul className="mt-2 space-y-1">
                            {diagnostic.suggestions.map((s, i) => {
                                const Icon = SUGGESTION_ICONS[s.type]
                                return (
                                    <li key={i} className="flex items-center gap-2 text-xs text-amber-700">
                                        <Icon className="h-3.5 w-3.5 shrink-0" />
                                        <span>{s.message}</span>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 h-7 px-2 text-amber-700 hover:text-amber-900 hover:bg-amber-100"
                    onClick={() => setExpanded(!expanded)}
                    aria-label={expanded ? "Masquer les details" : "Voir les details"}
                >
                    {expanded ? (
                        <><ArrowUp01Icon className="h-4 w-4 mr-1" />Masquer</>
                    ) : (
                        <><ArrowDown01Icon className="h-4 w-4 mr-1" />Details</>
                    )}
                </Button>
            </div>

            {/* Expanded details */}
            {expanded && (
                <div className="border-t border-amber-200 px-4 py-3">
                    <div className="space-y-2">
                        {diagnostic.unplacedDetails.map((d, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-2 text-xs bg-white/60 rounded px-3 py-2"
                            >
                                <Badge variant="outline" className="text-[10px] shrink-0">
                                    {d.groupName}
                                </Badge>
                                <span className="font-medium">{d.player1Name}</span>
                                <span className="text-amber-500">vs</span>
                                <span className="font-medium">{d.player2Name}</span>
                                <span className="text-amber-500 ml-auto shrink-0">
                                    {formatDate(d.date)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
