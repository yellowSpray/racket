import { Link } from "react-router"
import Logo from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/AuthContext"
import { Notification03Icon, Moon02Icon, Sun03Icon, ArrowDown01Icon } from "hugeicons-react"
import { useEffect, useState } from "react"
// import { supabase } from "@/lib/supabaseClient"


export default function Header() {

  // const navigate = useNavigate()
  // const location = useLocation()
  const { profile, isAuthenticated } = useAuth()
  // const isAppPage = location.pathname.startsWith('/admin') || location.pathname.startsWith('/user')
  const [darkMode, setDarkMode] = useState(false);

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // const handleLogout = async () => {
  //   await supabase.auth.signOut()
  //   navigate('/')
  // }

  return (
    <header className="px-8 pt-8 pb-4 flex items-center justify-between gap-4 border-b-border border-1">

        {/* Left side */}
        <Link to="/" className="text-primary flex items-center gap-2 pl-3">
          <Logo />
          <h1 className="text-[#3d3d3d] text-xl font-extrabold">volena</h1>
        </Link>

        {/* Right side */}
        {isAuthenticated && profile ? (
          <div className="flex items-center gap-4">
            <Button variant="icon" size="icon" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun03Icon size={20} strokeWidth={2} /> : <Moon02Icon size={20} strokeWidth={2} />}
            </Button>
            <Button variant="icon" size="icon" className="relative">
              <Notification03Icon size={20} strokeWidth={2} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-white dark:border-slate-900" />
            </Button>
            <Button variant="outline" className="py-1 pl-1 pr-2">
              <Avatar>
                <AvatarImage
                  src={profile?.avatar_url || "https://github.com/shadcn.png"}
                  alt={`${profile?.first_name} ${profile?.last_name}`}
                />
              </Avatar>
              <span>{`${profile?.first_name} ${profile?.last_name}`}</span>
              <ArrowDown01Icon size={20} />
            </Button>
          </div>
        ) : ( 
          <div className="flex items-center gap-4">
            <Button variant="icon" size="icon" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun03Icon size={20} /> : <Moon02Icon size={20} />}
            </Button>
            <Button asChild variant="default">
              <Link to="/auth">Commencer</Link>
            </Button>
          </div>
        )}
          
    </header>
  )
}
