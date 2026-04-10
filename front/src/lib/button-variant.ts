import { cva } from "class-variance-authority"

/** Variantes de style pour les boutons (default, destructive, outline, icon, ghost, link). */
export const buttonVariants = cva(
  "font-semibold border-2 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-primary-hover hover:bg-primary-hover transition-colors duration-200 ease-out",
        destructive:
          "bg-destructive text-white border-destructive-hover hover:bg-destructive-hover transition-colors duration-200 ease-out",
        outline:
          "bg-transparent text-gray-500 border-border hover:bg-border hover:text-foreground transition-colors duration-200 ease-out",
        icon:
          "bg-transparent text-gray-500 border-border hover:bg-border hover:text-foreground transition-colors duration-200 ease-out",
        // Legacy variants (fallback)
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline border-0",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 px-6 has-[>svg]:px-4",
        icon: "size-10",
        iconSm: "size-8"
      },
    },
    defaultVariants: {
      variant: "default",
      // size: "default",
    },
  }
)
