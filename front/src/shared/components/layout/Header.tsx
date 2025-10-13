import Logo from "@/shared/components/ui/Logo"
import { Button } from "@/shared/components/ui/Button"
import { Link } from "react-router"
import { useAuth } from "@/hooks/useAuth"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/Avatar"

export default function Header() {

  const { user, logout } = useAuth()

  return (
    <header className="px-4 md:px-6 border-b-1 border-b-border">
      <div className="flex h-16 items-center justify-between gap-4">

        {/* Left side */}
        <div className="flex items-center gap-2">

          {/* Main nav */}
          <div className="flex items-center gap-6">
            <Link to="/" className="text-primary flex items-center gap-2">
              <Logo />
              <h1 className="text-foreground">Logo name</h1>
            </Link>
          </div>

        </div>

        {/* Right side */}

        {user ? 
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              <p className="font-bold">{ user.name }</p>
              <p>({ user.role })</p>
            </div>
            <Button 
              size="sm" 
              className="text-sm border-2 border-green-400 shadow-none font-bold"
              onClick={logout}
            >
              Logout
            </Button>
          </div>
        : 
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-sm border-1 border-border">
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="text-sm shadow-none border-green-400 border-1 font-bold">
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>
        }
          
      </div>
    </header>
  )
}
