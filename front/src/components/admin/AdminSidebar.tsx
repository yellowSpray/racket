import { Link, useLocation, matchPath } from "react-router";
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Home, Settings, Users, FileText, SquarePen } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";


const menuItems = [
  { title: "Accueil", url: "/admin", icon: Home, secondTitle: "Accueil" },
  { title: "Tableaux", url: "/admin/draws", icon: SquarePen, secondTitle: "Tout les tableaux" },
  { title: "Matchs", url: "/admin/matches", icon: FileText, secondTitle: "Match à jouer" },
  { title: "Joueurs", url: "/admin/players", icon: Users, secondTitle: "Liste des joueurs" },
  { title: "Paramètres", url: "/admin/settings", icon: Settings, secondTitle: "Paramètres" },
];

export function AdminSideBar({ onTitleChange }: { onTitleChange?: (title: string) => void }) {

  const { profile } = useAuth()
  const location = useLocation()
  
  useEffect(() => {
    const current = menuItems.find(item => 
      matchPath({ path: item.url, end: true}, location.pathname)
    )
    if (current && onTitleChange) onTitleChange(current.secondTitle)
  }, [location.pathname])

  return (
    <div className="h-full col-span-2 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 p-6 border-b border-gray-200 h-18">
          <Select>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select event" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="event36">Event number 36</SelectItem>
            </SelectContent>
          </Select>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-6 overflow-y-auto">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.url;

            return (
              <li key={item.title}>
                <Link
                  to={item.url}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                    ${
                      isActive
                        ? "bg-primary/50 font-[600]"
                        : "hover:bg-gray-100"
                    }
                  `}
                >
                  <Icon size={20} />
                  <span>{item.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-6 border-t border-gray-200">
          <div className="flex flex-row items-center  gap-2">
            <Avatar>
              <AvatarImage 
                src={profile?.avatar_url || "https://github.com/shadcn.png"} 
                alt={`${profile?.first_name} ${profile?.last_name}`}  
              />
            </Avatar>

            <div className="ml-2">
              <p className="font-bold">
                {`${profile?.first_name} ${profile?.last_name}`}
              </p>
              <p className="text-gray-400">
                Admin de {profile?.club || "Club"}
              </p>
            </div>
          </div>
      </div>
    </div>
  );
}
