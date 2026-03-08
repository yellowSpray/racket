import { Link } from "react-router"
import Logo from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/AuthContext"
import { Notification03Icon, Moon02Icon, Sun03Icon, LoginCircle01Icon } from "hugeicons-react"
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
    <header className="p-8 flex items-center justify-between gap-4">

        {/* Left side */}
        <Link to="/" className="text-primary flex items-center gap-2 pl-3">
          <Logo />
          <h1 className="text-[#3d3d3d] text-xl font-extrabold">volena</h1>
        </Link>

        {/* Right side */}
        {isAuthenticated && profile ? (
          <div className="flex items-center gap-2">
            <Button className="rounded-full bg-accent hover:bg-gray-200" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun03Icon size={20} /> : <Moon02Icon size={20} />}
            </Button>
            <Button className="rounded-full bg-accent relative hover:bg-gray-200">
              <Notification03Icon size={20} />
              <span className="absolute top-2 right-3 w-2 h-2 bg-rose-500 rounded-full border border-white dark:border-slate-900" />
            </Button>
            <button className="flex items-center gap-2 pr-4 pl-1 py-[4px] bg-accent rounded-xl hover:bg-gray-200 hover:text-accent-foreground transition-colors duration-200 ease-out">
              <Avatar>
                <AvatarImage
                  src={profile?.avatar_url || "https://github.com/shadcn.png"}
                  alt={`${profile?.first_name} ${profile?.last_name}`}
                />
              </Avatar>
              <span className="text-sm font-medium">{`${profile?.first_name} ${profile?.last_name}`}</span>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor" className="text-muted-foreground">
                <path d="M5 6L0 0h10L5 6z" />
              </svg>
            </button>
          </div>
        ) : ( 
          <div className="flex items-center gap-[15px]">
            <Button variant="ghost" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun03Icon size={20} /> : <Moon02Icon size={20} />}
            </Button>
            <Button asChild size="sm" className="text-sm shadow-none border-green-500 border-1 font-semibold">
              <Link to="/auth"><LoginCircle01Icon size={16} /> Commencer</Link>
            </Button>
          </div>
        )}
          
    </header>
  )
}
