import { Link, useLocation } from "react-router";
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import { Home, Settings, Users, FileText, SquarePen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";


const menuItems = [
  { title: "Dashboard", url: "/admin", icon: Home},
  { title: "Tableaux", url: "/admin/draws", icon: SquarePen},
  { title: "Matchs", url: "/admin/matches", icon: FileText},
  { title: "Joueurs", url: "/admin/players", icon: Users},
  { title: "Paramètres", url: "/admin/settings", icon: Settings},
];

export function AdminSideBar() {

  const { profile } = useAuth()
  const location = useLocation()

  return (
    <div className="h-full col-span-2 border-r border-gray-200 flex flex-col">

      {/* Navigation */}
      <nav className="flex-1 p-6 overflow-y-auto">
        <h3 className="text-gray-500 uppercase text-xs ml-3 mb-2">Menu</h3>
        <ul className="space-y-2">
          {menuItems.map((item, index) => {

            const Icon = item.icon;
            const isActive = location.pathname === item.url;
            const isLast = index === menuItems.length - 1;

            return (
              <li 
                key={item.title}
                className={`
                  ${isLast ? "border-t border-gray-300 mt-5" : ""}   
                `}
              >
                <Link
                  to={item.url}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                    ${isActive ? "bg-primary/50 font-[600]" : "hover:bg-gray-100"}
                    ${isLast ? "mt-4" : ""} 
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
