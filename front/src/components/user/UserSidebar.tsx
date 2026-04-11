import { Link, useLocation } from "react-router";
import { Home01Icon, PencilEdit02Icon, Settings01Icon, Search01Icon, Logout03Icon } from "hugeicons-react";
import { useAuth } from "@/contexts/AuthContext";

const menuItems = [
  { title: "Accueil", url: "/user", icon: Home01Icon },
  { title: "Tableaux", url: "/user/draws", icon: PencilEdit02Icon },
  { title: "Découvrir", url: "/user/discover", icon: Search01Icon },
];

export function UserSideBar() {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <>
      {/* Navigation */}
      <nav className="w-full flex-1 flex flex-col items-center justify-between pt-3">
        <ul className="space-y-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.url === "/user"
              ? location.pathname === "/user"
              : location.pathname.startsWith(item.url);
            return (
              <li key={item.title}>
                <Link
                  to={item.url}
                  className={`
                    flex items-center justify-center p-3 rounded-full border-2 border-border transition-colors
                    ${isActive ? "bg-primary border-primary text-foreground" : "text-gray-500 hover:bg-border hover:text-foreground"}
                  `}
                >
                  <Icon size={17} strokeWidth={2} />
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-col items-center gap-4">
          <Link
            to="/user/settings"
            className={`
              flex items-center justify-center p-3 rounded-full border-2 border-border transition-colors
              ${location.pathname.startsWith("/user/settings") ? "bg-primary border-primary text-foreground" : "text-gray-500 hover:bg-border hover:text-foreground"}
            `}
          >
            <Settings01Icon size={17} strokeWidth={2} />
          </Link>
          <button
            onClick={signOut}
            className="flex items-center justify-center p-3 rounded-full border-2 border-border transition-colors text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-500"
          >
            <Logout03Icon size={17} strokeWidth={2} />
          </button>
        </div>
      </nav>
    </>
  );
}
