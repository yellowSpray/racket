import { Link, useLocation } from "react-router";
import { Home01Icon, PencilEdit02Icon, Comment01Icon, Settings01Icon, Search01Icon } from "hugeicons-react";

const menuItems = [
  { title: "Accueil", url: "/user", icon: Home01Icon },
  { title: "Tableaux", url: "/user/draws", icon: PencilEdit02Icon },
  { title: "Découvrir", url: "/user/discover", icon: Search01Icon },
  { title: "Messages", url: "/user/messages", icon: Comment01Icon },
  { title: "Paramètres", url: "/user/settings", icon: Settings01Icon },
];

export function UserSideBar() {
  const location = useLocation();

  return (
    <div className="h-full flex flex-col rounded-full bg-white border border-border">

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center justify-between py-10 px-5 overflow-y-auto">
        <ul className="space-y-7.5">
          {menuItems.slice(0, -1).map((item) => {
            const Icon = item.icon;
            const isActive = item.url === "/user"
              ? location.pathname === "/user"
              : location.pathname.startsWith(item.url);
            return (
              <li key={item.title}>
                <Link
                  to={item.url}
                  className={`
                    flex items-center justify-center p-2.5 rounded-full transition-colors
                    ${isActive ? "bg-primary font-[600]" : "hover:bg-gray-100"}
                  `}
                >
                  <Icon size={20} />
                </Link>
              </li>
            );
          })}
        </ul>
        {(() => {
          const last = menuItems[menuItems.length - 1];
          const Icon = last.icon;
          const isActive = location.pathname.startsWith(last.url);
          return (
            <Link
              to={last.url}
              className={`
                flex items-center justify-center p-2.5 rounded-full transition-colors
                ${isActive ? "bg-primary font-[600]" : "hover:bg-gray-100"}
              `}
            >
              <Icon size={20} />
            </Link>
          );
        })()}
      </nav>

    </div>
  );
}
