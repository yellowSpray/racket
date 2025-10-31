import Auth from "@/pages/auth/Auth";
import Home from "@/pages/Home";
import Rootlayout from "@/layout/RootLayout";
import UserPage from "@/pages/user/UserPage";
import AdminPage from "@/pages/admin/AdminPage";
import { createBrowserRouter } from "react-router";
import ProtectedRoute from "@/routes/ProtectedRoute";
import ListPlayers from "@/pages/admin/Players/ListPlayers";
import { DashboardAdmin } from "@/pages/admin/dashboard";
import { DrawAdmin } from "@/pages/admin/draw";
import { MatchAdmin } from "@/pages/admin/match";
import { SettingsAdmin } from "@/pages/admin/settings";

const router = createBrowserRouter([

    {
        path: "/",
        element: <Rootlayout />,
        children: [
            { index: true, element: <Home /> },
            { path: "auth", element: <Auth /> },
            { 
                element: <ProtectedRoute allowedRoles={["user", "admin", "superadmin"]}/>,
                children: [
                    { path: "user", element: <UserPage /> }
                ]
            },
            { 
                element: <ProtectedRoute allowedRoles={["admin", "superadmin"]}/>,
                children: [
                    { 
                        path: "admin", 
                        element: <AdminPage />,
                        children: [
                            { path: "", element: <DashboardAdmin />},
                            { path: "draw", element: <DrawAdmin />},
                            { path: "match", element: <MatchAdmin />},
                            { path: "players", element: <ListPlayers />},
                            { path: "settings", element: <SettingsAdmin />}
                        ] 
                    }
                ]
            }
        ]
    }

])

export default router