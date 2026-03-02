import { Link, useLocation } from "react-router";
import { Home, Users, FileText, SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabaseClient"


const menuItems = [
  { title: "Accueil", url: "/user", icon: Home },
  { title: "Tableaux", url: "/user/draws", icon: SquarePen },
  { title: "Match à jouer", url: "/user/matches", icon: FileText },
  { title: "Classement", url: "/user/rankings", icon: Users },
];

export function UserSideBar() {
  const location = useLocation();

  return (
    <aside className="col-span-2 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 p-10 border-b border-gray-200 h-18">
          <span className="text-sm font-semibold">Club Name</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-10 overflow-y-auto">
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
                        ? "bg-primary font-[600]"
                        : "hover:bg-gray-100"
                    }
                  `}
                >
                  <Icon size={16} />
                  <span>{item.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="flex items-center gap-2 p-10 border-t border-gray-200">
          <Button 
              size="sm" 
              className="text-sm border-2 border-green-400 shadow-none font-bold"
              onClick={() => supabase.auth.signOut()}
            >
              Sign out
          </Button>
      </div>
    </aside>
  );
}