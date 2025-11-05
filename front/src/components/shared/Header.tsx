import { Link } from "react-router"
import Logo from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/AuthContext"
import { Bell } from "lucide-react"

export default function Header() {

  const { profile, isAuthenticated } = useAuth()

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

        {isAuthenticated && profile ? (
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <p className="font-bold">{profile.first_name} {profile.last_name}</p>
              <Avatar>
                <AvatarImage 
                  src={profile.avatar_url || "https://github.com/shadcn.png"} 
                  alt={`${profile.first_name} ${profile.last_name}`}  
                />
                <AvatarFallback>
                  {profile.first_name[0]}{profile.last_name[0]}
                </AvatarFallback>
              </Avatar>
            </div>
            <span className="rounded-full h-8 w-8 bg-gray-300 flex items-center justify-center">
              <Bell size={18}/>
            </span>
            <Button size="sm" className="text-sm shadow-none border-green-400 border-1 font-bold">
              {profile.role === "admin" || profile.role === "superadmin" ? (
                <Link to="/admin">Dashboard</Link>
              ) : (
                <Link to="/user">Dashboard</Link>
              )}
            </Button>
          </div>
        ) : ( 
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-sm border-1 border-border">
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="text-sm shadow-none border-green-400 border-1 font-bold">
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>
        )}
          
      </div>
    </header>
  )
}
