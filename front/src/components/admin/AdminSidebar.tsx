import { Link, useLocation } from "react-router";
import { DashboardSquare02Icon, Settings01Icon, UserGroupIcon, File01Icon, LayoutTable02Icon } from "hugeicons-react";


const menuItems = [
  { title: "Dashboard", url: "/admin", icon: DashboardSquare02Icon},
  { title: "Tableaux", url: "/admin/draws", icon: LayoutTable02Icon},
  { title: "Matchs", url: "/admin/matches", icon: File01Icon},
  { title: "Joueurs", url: "/admin/players", icon: UserGroupIcon},
];

export function AdminSideBar() {

  const location = useLocation()

  return (
    <>
      {/* Navigation */}
      <nav className="w-full flex-1 flex flex-col items-center 2xl:items-stretch justify-between p-2 bg-gray-100 rounded-xl">
        <ul className="space-y-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.url;
            return (
              <li key={item.title}>
                <Link
                  to={item.url}
                  className={`
                    flex items-center justify-center 2xl:justify-start gap-2 p-2.5 rounded-xl transition-colors
                    ${isActive ? "bg-primary font-[600]" : "hover:bg-gray-200"}
                  `}
                >
                  <Icon size={20} className="shrink-0" />
                  <span className="hidden 2xl:inline text-sm">{item.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <Link
          to="/admin/settings"
          className={`
            flex items-center justify-center 2xl:justify-start gap-2 p-2.5 rounded-xl transition-colors
            ${location.pathname === "/admin/settings" ? "bg-primary font-[600]" : "hover:bg-gray-200"}
          `}
        >
          <Settings01Icon size={20} className="shrink-0" />
          <span className="hidden 2xl:inline text-sm">Paramètres</span>
        </Link>
      </nav>
    </>
  );
}
