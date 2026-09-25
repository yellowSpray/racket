import { ArrowLeft01Icon, ArrowRight01Icon } from "hugeicons-react"
import { Button } from "@/components/ui/button"
import { dateVoisine } from "@/lib/datesDeJeu"

/**
 * Le choix de la journée de jeu, au-dessus des deux vues des matchs.
 *
 * Les deux vues n'affichent qu'une journée à la fois : c'est cette barre qui
 * dit laquelle et qui en change. Elle est commune aux deux, donc changer de
 * vue garde la journée, et changer de journée garde la vue.
 *
 * DEUX FLÈCHES ET LA DATE AU CENTRE. Une série se saisit soir après soir :
 * avancer d'un jour doit coûter un geste, pas deux. Sauter au 28 septembre
 * reste possible par la date elle-même, qui est un `select` natif posé en
 * transparence, le montage du fil d'Ariane : le système ouvre sa roulette sur
 * téléphone, le clavier marche sans une ligne de code, et un `change` suffit à
 * le tester.
 *
 * Les flèches se désactivent au bout plutôt que de boucler : une flèche qui
 * ramène au premier jour fait croire qu'il en reste un.
 */
export function ChoixDeLaDate({
    dates, valeur, onChange,
}: {
    dates: string[]
    valeur: string | null
    onChange: (date: string) => void
}) {
    if (!valeur || dates.length === 0) return null

    const precedente = dateVoisine(dates, valeur, -1)
    const suivante = dateVoisine(dates, valeur, 1)

    return (
        <div data-choix-date className="flex items-center gap-2 py-2">
            <Fleche
                libelle="Journee precedente"
                cible={precedente}
                onChange={onChange}
                icone={<ArrowLeft01Icon size={16} strokeWidth={2} />}
            />

            {/*
              * La pastille prend toute la largeur restante sur téléphone, où
              * elle est seule sur sa ligne, et s'arrête à sa date au-delà : une
              * barre de 1300 px pour trois mots se lirait comme un champ.
              */}
            <span className="relative flex h-8 flex-1 items-center justify-center rounded-full border border-border bg-card px-3 text-sm font-semibold transition-colors hover:bg-muted sm:flex-none sm:min-w-44">
                {formatJournee(valeur)}
                <select
                    data-liste-stylee
                    aria-label="Choisir la journee"
                    value={valeur}
                    onChange={e => onChange(e.target.value)}
                    className="absolute inset-0 w-full cursor-pointer opacity-0"
                >
                    {dates.map(d => (
                        <option key={d} value={d}>{formatJournee(d)}</option>
                    ))}
                </select>
            </span>

            <Fleche
                libelle="Journee suivante"
                cible={suivante}
                onChange={onChange}
                icone={<ArrowRight01Icon size={16} strokeWidth={2} />}
            />
        </div>
    )
}

function Fleche({
    libelle, cible, onChange, icone,
}: {
    libelle: string
    cible: string | null
    onChange: (date: string) => void
    icone: React.ReactNode
}) {
    return (
        <Button
            variant="outline"
            size="sm"
            className="size-8 shrink-0 px-0 has-[>svg]:px-0"
            aria-label={libelle}
            title={libelle}
            disabled={!cible}
            onClick={() => cible && onChange(cible)}
        >
            {icone}
        </Button>
    )
}

/**
 * « lun. 21 sept. ».
 *
 * Midi et non minuit : une date nue est lue en UTC, et le fuseau du lecteur
 * la ferait basculer sur la veille à l'ouest de Greenwich.
 */
function formatJournee(date: string): string {
    return new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
        weekday: "short", day: "numeric", month: "short",
    })
}
