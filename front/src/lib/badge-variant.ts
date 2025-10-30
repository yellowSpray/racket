import { cva } from "class-variance-authority";

export const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gray-300 text-gray-700",
        member:
          "border-transparent bg-primary text-primary-foreground",
        visitor:
          "border-transparent bg-amber-500 text-gray-50",
        active:
          "text-green-500 border-2 border-primary",
        inactive:
          "text-gray-500 border-2",
        paid:
          "border-transparent bg-green-500 text-gray-50",
        unpaid:
          "border-transparent bg-red-500 text-gray-50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)