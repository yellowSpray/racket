import Logo from "@/shared/components/ui/Logo"
import { Button } from "@/shared/components/ui/Button"

export default function Header() {
  return (
    <header className="px-4 md:px-6">
      <div className="flex h-16 items-center justify-between gap-4">

        {/* Left side */}
        <div className="flex items-center gap-2">

          {/* Main nav */}
          <div className="flex items-center gap-6">
            <a href="#" className="text-primary hover:text-primary/90">
              <Logo />
            </a>
          </div>

        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">

          <Button asChild variant="ghost" size="sm" className="text-sm">
            <a href="#">Sign In</a>
          </Button>

          <Button asChild size="sm" className="text-sm">
            <a href="#">Get Started</a>
          </Button>

        </div>

      </div>
    </header>
  )
}
