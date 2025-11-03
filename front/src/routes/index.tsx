import { createBrowserRouter } from "react-router";
import ProtectedRoute from "@/routes/ProtectedRoute";
import Rootlayout from "@/layout/RootLayout";
import Home from "@/pages/Home";
import Auth from "@/pages/auth/Auth";
import UserPage from "@/pages/user/UserPage";
import AdminPage from "@/pages/admin/AdminPage";
import { ListPlayers } from "@/pages/admin/PlayersPage";
import { DashboardAdmin } from "@/pages/admin/Dashboard";
import { DrawAdmin } from "@/pages/admin/Draw";
import { MatchAdmin } from "@/pages/admin/Match";
import { SettingsAdmin } from "@/pages/admin/Settings";

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
                            { path: "draws", element: <DrawAdmin />},
                            { path: "matches", element: <MatchAdmin />},
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