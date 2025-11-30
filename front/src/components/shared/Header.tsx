import { Link, useNavigate } from "react-router"
import Logo from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { Bell, Moon, Sun, LogOut } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"


export default function Header() {

  const navigate = useNavigate()
  const { profile, isAuthenticated } = useAuth()
  const [darkMode, setDarkMode] = useState(false);

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

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
          <div className="flex items-center">
            <Button variant="ghost" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </Button>
            <Button variant="ghost" className="relative">
              <Bell size={20} />
              <span className="absolute top-2 right-4 w-2 h-2 bg-rose-500 rounded-full border border-white dark:border-slate-900" />
            </Button>
            <Button 
              size="sm"
              className="ml-5" 
              onClick={handleLogout}
            >
                <p>Log out</p>
                <LogOut size={20} />
            </Button>
          </div>
        ) : ( 
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </Button>
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
