import { Link } from "react-router";
import { Home, Settings, Users, FileText, SquarePen } from "lucide-react";

const menuItems = [
  { title: "Accueil", url: "/dashboard", icon: Home },
  { title: "Tableaux", url: "/dashboard/settings", icon: SquarePen },
  { title: "Match à jouer", url: "/dashboard/documents", icon: FileText },
  { title: "Liste Joueurs", url: "/dashboard/users", icon: Users },
  { title: "Paramètres", url: "/dashboard/settings", icon: Settings },
];

export function AppSideBar() {
  return (
    <aside className="col-span-2 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 p-6 border-b border-gray-200">
          <span className="text-sm font-semibold">Club Name</span>
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
      
    </aside>
  );
}
