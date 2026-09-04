import { Loading03Icon } from "hugeicons-react"

import { cn } from "@/lib/utils"

/*
 * Adapté de shadcn, qui s'appuie sur lucide : l'icône vient de hugeicons, seule
 * bibliothèque utilisée ici. Les props suivent donc le contrat de l'icône et
 * non celui d'un `<svg>` brut, sinon la propagation ne compile pas.
 */
type SpinnerProps = React.ComponentProps<typeof Loading03Icon>

function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <Loading03Icon
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
