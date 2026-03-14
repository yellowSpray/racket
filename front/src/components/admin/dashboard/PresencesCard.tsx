import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { UserGroupIcon } from "hugeicons-react"

const MOCK_PRESENCES = [
    { name: "Julien M.", avatar: "/pp-squash-male-1.png" },
    { name: "Sophie L.", avatar: "/pp-tennis-female-1.png" },
    { name: "Marc D.", avatar: "/pp-squash-male-2.png" },
    { name: "Clara R.", avatar: "/pp-tennis-female-2.png" },
    { name: "Thomas B.", avatar: "/pp-tennis-male-1.png" },
    { name: "Léa P.", avatar: "/pp-squash-female-1.png" },
    { name: "Antoine G.", avatar: "/pp-tennis-male-2.png" },
    { name: "Emma V.", avatar: "/pp-squash-female-2.png" },
    { name: "Lucas F.", avatar: "/pp-squash-male-1.png" },
    { name: "Camille H.", avatar: "/pp-tennis-female-1.png" },
    { name: "Hugo N.", avatar: "/pp-squash-male-2.png" },
    { name: "Manon J.", avatar: "/pp-tennis-female-2.png" },
    { name: "Nathan K.", avatar: "/pp-tennis-male-1.png" },
    { name: "Inès S.", avatar: "/pp-squash-female-1.png" },
    { name: "Raphaël T.", avatar: "/pp-tennis-male-2.png" },
    { name: "Zoé W.", avatar: "/pp-squash-female-2.png" },
]

const VISIBLE_COUNT = 10

interface PresencesCardProps {
    className?: string
}

export function PresencesCard({ className }: PresencesCardProps) {
    const visible = MOCK_PRESENCES.slice(0, VISIBLE_COUNT)
    const remaining = MOCK_PRESENCES.length - VISIBLE_COUNT

    return (
        <div className={`flex flex-col justify-center border border-dashed rounded-xl p-4 ${className ?? ""}`}>
            <div className="flex flex-row items-center justify-between text-sm">
                <div className="flex items-center gap-2 mr-2 font-semibold">
                    <UserGroupIcon size={16} className="text-foreground" />
                    Présences
                </div>
                <div
                    className="flex flex-row justify-center -space-x-2 overflow-hidden"
                    style={{ maskImage: "linear-gradient(to left, black 70%, transparent 100%)", WebkitMaskImage: "linear-gradient(to left, black 70%, transparent 100%)" }}
                >
                    {visible.map((p) => (
                        <Avatar key={p.name} className="border-2 border-background">
                            <AvatarImage src={p.avatar} alt={p.name} className="object-cover" />
                            <AvatarFallback className="text-[10px]">
                                {p.name.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                        </Avatar>
                    ))}
                </div>
                {remaining > 0 && (
                    <div className="size-7 shrink-0 ml-2 rounded-full border-2 border-background bg-muted flex items-center justify-center">
                        <span className="text-xs font-semibold text-muted-foreground">
                            +{remaining}
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}
