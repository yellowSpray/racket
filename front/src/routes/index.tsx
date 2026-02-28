import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router";
import ProtectedRoute from "@/routes/ProtectedRoute";
import Rootlayout from "@/layout/RootLayout";
import { RedirectByRole } from "@/routes/RedirectByRole";
import Loading from "@/components/shared/Loading";

// Lazy-loaded pages
const Auth = lazy(() => import("@/pages/auth/AuthPage"))
const UserPage = lazy(() => import("@/pages/user/UserPage"))
const AdminPage = lazy(() => import("@/pages/admin/AdminPage"))
const DashboardAdmin = lazy(() => import("@/pages/admin/Dashboard").then(m => ({ default: m.DashboardAdmin })))
const DrawAdmin = lazy(() => import("@/pages/admin/DrawPage").then(m => ({ default: m.DrawAdmin })))
const MatchAdmin = lazy(() => import("@/pages/admin/Match").then(m => ({ default: m.MatchAdmin })))
const ListPlayers = lazy(() => import("@/pages/admin/ListPlayerPage").then(m => ({ default: m.ListPlayers })))
const SettingsAdmin = lazy(() => import("@/pages/admin/Settings").then(m => ({ default: m.SettingsAdmin })))

function withSuspense(Component: React.LazyExoticComponent<React.ComponentType>) {
    return (
        <Suspense fallback={<Loading />}>
            <Component />
        </Suspense>
    )
}

const router = createBrowserRouter([

    {
        path: "/",
        element: <Rootlayout />,
        children: [
            // Page d'accueil : redirige automatiquement si connecté
            { index: true, element: <RedirectByRole /> },

            // Page de connexion
            { path: "auth", element: withSuspense(Auth) },

            // Routes pour les utilisateurs
            {
                element: <ProtectedRoute allowedRoles={["user", "admin", "superadmin"]}/>,
                children: [
                    { path: "user", element: withSuspense(UserPage) }
                ]
            },
            // Routes pour les admins
            {
                element: <ProtectedRoute allowedRoles={["admin", "superadmin"]}/>,
                children: [
                    {
                        path: "admin",
                        element: withSuspense(AdminPage),
                        children: [
                            { path: "", element: withSuspense(DashboardAdmin) },
                            { path: "draws", element: withSuspense(DrawAdmin) },
                            { path: "matches", element: withSuspense(MatchAdmin) },
                            { path: "players", element: withSuspense(ListPlayers) },
                            { path: "settings", element: withSuspense(SettingsAdmin) }
                        ]
                    }
                ]
            }
        ]
    }

])

export default router
