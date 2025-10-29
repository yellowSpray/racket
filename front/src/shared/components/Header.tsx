import { Link } from "react-router"
import Logo from "@/shared/components/ui/Logo"
import { Button } from "@/shared/components/ui/Button"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/Avatar"
import { useProfile } from "@/hooks/useProfile"
import { Bell } from "lucide-react"

export default function Header() {

  const { profile } = useProfile()

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

        {profile ? 
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <p className="font-bold">{profile?.first_name} {profile?.last_name}</p>
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                <AvatarFallback>Avatar Profile</AvatarFallback>
              </Avatar>
            </div>
            <span className="rounded-full h-8 w-8 bg-gray-300 flex items-center justify-center">
              <Bell size={18}/>
            </span>
            <Button size="sm" className="text-sm shadow-none border-green-400 border-1 font-bold">
              {profile.role === "admin" ? (
                <Link to="/admin">Dashboard</Link>
              ) : (
                <Link to="/user">Dashboard</Link>
              )}
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
