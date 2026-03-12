import { Link, useLocation } from "react-router";
import { DashboardSquare02Icon, Settings01Icon, UserGroupIcon, File01Icon, LayoutTable02Icon, Mail01Icon } from "hugeicons-react";


const menuItems = [
  { title: "Dashboard", url: "/admin", icon: DashboardSquare02Icon},
  { title: "Tableaux", url: "/admin/draws", icon: LayoutTable02Icon},
  { title: "Matchs", url: "/admin/matches", icon: File01Icon},
  { title: "Joueurs", url: "/admin/players", icon: UserGroupIcon},
  { title: "Email", url: "/admin/email", icon: Mail01Icon},
];

export function AdminSideBar() {

  const location = useLocation()

  return (
    <>
      {/* Navigation */}
      <nav className="w-full flex-1 flex flex-col items-center justify-between pt-2">
        <ul className="space-y-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.url;
            return (
              <li key={item.title}>
                <Link
                  to={item.url}
                  className={`
                    flex items-center justify-center p-3 rounded-full border-2 border-border transition-colors
                    ${isActive ? "bg-primary border-primary text-foreground" : "text-gray-500 hover:bg-border hover:text-foreground"}
                  `}
                >
                  <Icon size={20} strokeWidth={2} />
                  {/* <span className="hidden 2xl:inline text-sm">{item.title}</span> */}
                </Link>
              </li>
            );
          })}
        </ul>
        <Link
          to="/admin/settings"
          className={`
            flex items-center justify-center p-3 rounded-full border-2 border-border transition-colors
            ${location.pathname === "/admin/settings" ? "bg-primary border-primary text-foreground" : "text-gray-500 hover:bg-border hover:text-foreground"}
          `}
        >
          <Settings01Icon size={20} strokeWidth={2} />
          {/* <span className="hidden 2xl:inline text-sm">Paramètres</span> */}
        </Link>
      </nav>
    </>
  );
}
