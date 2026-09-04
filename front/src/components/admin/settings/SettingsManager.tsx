import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useClubConfig } from "@/hooks/useClubConfig"
import { useClubCourts } from "@/hooks/useClubCourts"
import { ClubLogoCard } from "./ClubLogoCard"
import { ClubCourtsCard } from "./ClubCourtsCard"
import { EventDefaultsCard } from "./EventDefaultsCard"
import { ScoringRulesCard } from "./ScoringRulesCard"
import { PromotionRulesCard } from "./PromotionRulesCard"
import { ClubConfigSkeleton } from "@/components/shared/skeletons/SettingsSkeleton"
import { cn } from "@/lib/utils"
import {
    Building02Icon,
    VolleyballIcon,
    Calendar03Icon,
    Award01Icon,
    ArrowUpDownIcon,
} from "hugeicons-react"

/**
 * Reglages du club, en une seule page.
 *
 * Les onglets Evenements et Mon club presentaient deux moities d'une meme
 * chose : tout leur contenu est du reglage de club, applique a la creation
 * d'un evenement. Le nom du premier laissait croire qu'il agissait sur
 * l'evenement en cours, ce qui n'a jamais ete le cas. Les rubriques ci-dessous
 * le disent explicitement.
 *
 * Les regles propres a un evenement se modifient depuis la liste des
 * evenements, en rouvrant son assistant.
 */

export interface SettingsSection {
    id: string
    label: string
    /** Phrase affichee en tete du panneau, qui dit sur quoi la rubrique agit. */
    hint: string
    icon: typeof Building02Icon
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
    {
        id: "club",
        label: "Club",
        hint: "Identite de votre club, visible par tous les joueurs.",
        icon: Building02Icon,
    },
    {
        id: "courts",
        label: "Terrains",
        hint: "Copies automatiquement dans chaque nouvel événement.",
        icon: VolleyballIcon,
    },
    {
        id: "defaults",
        label: "Valeurs par défaut",
        hint: "Point de départ des nouveaux événements : horaires, durée de match, taille des groupes, visiteurs.",
        icon: Calendar03Icon,
    },
    {
        id: "scoring",
        label: "Pointage",
        hint: "Barème appliqué aux nouveaux événements. Chaque événement peut ensuite avoir le sien.",
        icon: Award01Icon,
    },
    {
        id: "promotion",
        label: "Montées et descentes",
        hint: "Règle appliquée aux nouveaux événements. Chaque événement peut ensuite avoir la sienne.",
        icon: ArrowUpDownIcon,
    },
]

export function SettingsManager() {
    const { profile } = useAuth()
    const {
        clubConfig,
        scoringRules,
        promotionRules,
        loading,
        error,
        defaultScoring,
        defaultPromotion,
        fetchClubConfig,
        updateClubDefaults,
        upsertScoringRules,
        upsertPromotionRules,
    } = useClubConfig()

    const {
        courts: clubCourts,
        loading: courtsLoading,
        error: courtsError,
        fetchClubCourts,
        addClubCourt,
        updateClubCourt,
        removeClubCourt,
        initClubCourts,
    } = useClubCourts()

    const [activeSection, setActiveSection] = useState(SETTINGS_SECTIONS[0].id)

    const clubId = profile?.club_id ?? null

    useEffect(() => {
        fetchClubConfig(clubId)
        fetchClubCourts(clubId)
    }, [clubId, fetchClubConfig, fetchClubCourts])

    if (!clubId) {
        return (
            <div className="text-center py-12 text-gray-500">
                Aucun club associé à votre profil
            </div>
        )
    }

    if (loading) return <ClubConfigSkeleton />

    if (error) {
        return (
            <div className="text-center py-12 text-red-500">
                Erreur : {error}
            </div>
        )
    }

    const section = SETTINGS_SECTIONS.find(s => s.id === activeSection) ?? SETTINGS_SECTIONS[0]

    return (
        <div className="h-full flex gap-6 min-h-0">
            <nav
                role="tablist"
                aria-orientation="vertical"
                aria-label="Rubriques des paramètres"
                className="w-60 shrink-0 flex flex-col gap-1"
            >
                {SETTINGS_SECTIONS.map(({ id, label, icon: Icon }) => {
                    const selected = id === activeSection
                    return (
                        <button
                            key={id}
                            role="tab"
                            type="button"
                            aria-selected={selected}
                            aria-controls={`settings-panel-${id}`}
                            onClick={() => setActiveSection(id)}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-left transition-colors",
                                selected
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                        >
                            <Icon size={18} />
                            {label}
                        </button>
                    )
                })}
            </nav>

            <div
                id={`settings-panel-${section.id}`}
                role="tabpanel"
                className="flex-1 min-w-0 overflow-y-auto"
            >
                <p className="text-sm text-muted-foreground mb-4">{section.hint}</p>

                {section.id === "club" && (
                    <ClubLogoCard
                        clubId={clubId}
                        logoUrl={clubConfig?.logo_url}
                        clubName={clubConfig?.club_name ?? ""}
                        onSaved={() => fetchClubConfig(clubId)}
                    />
                )}

                {section.id === "courts" && (
                    <ClubCourtsCard
                        courts={clubCourts}
                        loading={courtsLoading}
                        error={courtsError}
                        defaultNumberOfCourts={clubConfig?.default_number_of_courts ?? 4}
                        defaultStartTime={clubConfig?.default_start_time ?? "19:00"}
                        defaultEndTime={clubConfig?.default_end_time ?? "23:00"}
                        onAdd={(data) => addClubCourt(clubId, data)}
                        onUpdate={updateClubCourt}
                        onRemove={removeClubCourt}
                        onInit={(n, from, to) => initClubCourts(clubId, n, from, to)}
                    />
                )}

                {section.id === "defaults" && (
                    <EventDefaultsCard
                        defaultStartTime={clubConfig?.default_start_time ?? "19:00"}
                        defaultEndTime={clubConfig?.default_end_time ?? "23:00"}
                        defaultMatchDuration={clubConfig?.default_match_duration ?? 30}
                        defaultMinPlayers={clubConfig?.default_min_players_per_group ?? 3}
                        defaultMaxPlayers={clubConfig?.default_max_players_per_group ?? 5}
                        visitorFee={clubConfig?.visitor_fee ?? 0}
                        openToVisitors={clubConfig?.open_to_visitors ?? false}
                        autoRenewPlayers={clubConfig?.auto_renew_players ?? false}
                        onSave={(data) => updateClubDefaults(clubId, data)}
                        onToggleVisitors={async (checked) => {
                            await updateClubDefaults(clubId, { open_to_visitors: checked })
                            fetchClubConfig(clubId)
                        }}
                        onToggleAutoRenew={async (checked) => {
                            await updateClubDefaults(clubId, { auto_renew_players: checked })
                            fetchClubConfig(clubId)
                        }}
                    />
                )}

                {section.id === "scoring" && (
                    <ScoringRulesCard
                        scoringRules={scoringRules}
                        defaultScoring={defaultScoring}
                        onSave={(data) => upsertScoringRules(clubId, data)}
                    />
                )}

                {section.id === "promotion" && (
                    <PromotionRulesCard
                        promotionRules={promotionRules}
                        defaultPromotion={defaultPromotion}
                        onSave={(data) => upsertPromotionRules(clubId, data)}
                    />
                )}
            </div>
        </div>
    )
}
