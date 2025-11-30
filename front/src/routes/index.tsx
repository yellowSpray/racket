import { createBrowserRouter } from "react-router";
import ProtectedRoute from "@/routes/ProtectedRoute";
import Rootlayout from "@/layout/RootLayout";
import Auth from "@/pages/auth/AuthPage";
import UserPage from "@/pages/user/UserPage";
import AdminPage from "@/pages/admin/AdminPage";
import { ListPlayers } from "@/pages/admin/ListPlayerPage";
import { DashboardAdmin } from "@/pages/admin/Dashboard";
import { DrawAdmin } from "@/pages/admin/Draw";
import { MatchAdmin } from "@/pages/admin/Match";
import { SettingsAdmin } from "@/pages/admin/Settings";
import { RedirectByRole } from "@/routes/RedirectByRole";

const router = createBrowserRouter([

    {
        path: "/",
        element: <Rootlayout />,
        children: [
            // Page d'accueil : redirige automatiquement si connecté
            { index: true, element: <RedirectByRole /> }, // redirige admin vers /admin, user vers /user

            // Page de connexion
            { path: "auth", element: <Auth /> },

            // Routes pour les utilisateurs
            { 
                element: <ProtectedRoute allowedRoles={["user", "admin", "superadmin"]}/>,
                children: [
                    { path: "user", element: <UserPage /> }
                ]
            },
            // Routes pour les admins
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