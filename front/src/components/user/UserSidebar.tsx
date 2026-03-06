import { Link, useLocation } from "react-router";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Home, SquarePen, MessageSquare, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useClubs } from "@/hooks/useClub";

const menuItems = [
  { title: "Accueil", url: "/user", icon: Home },
  { title: "Tableaux", url: "/user/draws", icon: SquarePen },
  { title: "Messages", url: "/user/messages", icon: MessageSquare },
  { title: "Paramètres", url: "/user/settings", icon: Settings },
];

export function UserSideBar() {
  const { profile } = useAuth();
  const { clubs } = useClubs();
  const location = useLocation();
  const clubName = clubs.find(c => c.id === profile?.club_id)?.club_name || "Club";

  return (
    <div className="h-full col-span-2 border-r border-gray-200 flex flex-col">

      {/* Navigation */}
      <nav className="flex-1 p-10 overflow-y-auto">
        <h3 className="text-gray-500 uppercase text-xs ml-3 mb-2">Menu</h3>
        <ul className="space-y-2">
          {menuItems.map((item, index) => {

            const Icon = item.icon;
            const isActive = item.url === "/user"
              ? location.pathname === "/user"
              : location.pathname.startsWith(item.url);
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
                    ${isActive ? "bg-primary font-[600]" : "hover:bg-gray-100"}
                    ${isLast ? "mt-4" : ""}
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
      <div className="p-10 border-t border-gray-200">
          <div className="flex flex-row items-center gap-2">
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
                {clubName}
              </p>
            </div>
          </div>
      </div>
    </div>
  );
}
