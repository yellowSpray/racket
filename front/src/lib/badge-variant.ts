import { cva } from "class-variance-authority";

/** Variantes de style pour les badges (statut joueur, paiement, liaison compte, demande visiteur). */
export const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        // Gris neutre : situe sans rien annoncer.
        default:
          "border-transparent bg-neutral-soft text-neutral-soft-foreground",
        // Neutre et sans fond : se pose sur n'importe quelle surface sans la masquer.
        outline:
          "border-border text-foreground",
        member:
          "border-transparent bg-primary text-primary-foreground",
        visitor:
          "border-transparent bg-warning text-warning-foreground",
        active:
          "text-success border-success-soft-border bg-success/10",
        // `text-foreground/70` et non `text-muted-foreground` : ce dernier
        // vaut #9C9C9C, soit 2.6 pour 1 sur blanc, sous le minimum de 4.5.
        // Meme correctif que les entrees au repos de la barre laterale.
        inactive:
          "text-foreground/70 border-border bg-muted/60",
        paid:
          "border-transparent bg-success text-success-foreground",
        unpaid:
          "border-transparent bg-destructive text-destructive-foreground",
        // Rouge pâle, pour qualifier sans alerter. `unpaid` est l'alerte,
        // un rouge plein ; en poser huit dans une colonne ferait crier la
        // carte entière et le compte ne se verrait plus.
        unpaidSoft:
          "border-transparent bg-destructive-soft text-destructive-soft-foreground",
        // Vert profond, pour un compte de personnes presentes. `unpaid` est
        // l'alerte, ce compte-ci n'en est pas une : il renseigne.
        count:
          "border-transparent bg-success-strong text-success-foreground",
        // Les trois tags du jour, dans la tuile des matchs. Trois roles,
        // trois poids : le total renseigne, les non joues appellent une
        // action, les absences sont un fait acquis. D'ou le contour pour
        // le seul des trois qui demande quelque chose.
        neutral:
          "border-transparent bg-neutral-soft text-neutral-soft-foreground",
        warningOutline:
          "border-warning-border bg-card text-warning-soft-foreground",
        warningSoft:
          "border-transparent bg-warning-soft text-warning-soft-foreground",
        linked:
          "text-success border-2 border-success",
        pending:
          "text-warning border-2 border-warning",
        approved:
          "border-transparent bg-success text-success-foreground",
        rejected:
          "border-transparent bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)