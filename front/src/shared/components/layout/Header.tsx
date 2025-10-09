import Logo from "@/shared/components/ui/Logo"
import { Button } from "@/shared/components/ui/Button"
import { Link } from "react-router"

export default function Header() {
  return (
    <header className="px-4 md:px-6 border-b-1 border-b-gray-200">
      <div className="flex h-16 items-center justify-between gap-4">

        {/* Left side */}
        <div className="flex items-center gap-2">

          {/* Main nav */}
          <div className="flex items-center gap-6">
            <Link to="/" className="text-primary hover:text-primary/90">
              <Logo />
            </Link>
          </div>

        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">

          <Button asChild variant="ghost" size="sm" className="text-sm border-1 border-gray-200">
            <Link to="/auth">Sign In</Link>
          </Button>

          <Button asChild size="sm" className="text-sm shadow-none">
            <Link to="/auth">Get Started</Link>
          </Button>

        </div>

      </div>
    </header>
  )
}
