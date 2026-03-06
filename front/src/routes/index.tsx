import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router";
import ProtectedRoute from "@/routes/ProtectedRoute";
import Rootlayout from "@/layout/RootLayout";
import { RedirectByRole } from "@/routes/RedirectByRole";
import Loading from "@/components/shared/Loading";

// Lazy-loaded pages
const Auth = lazy(() => import("@/pages/auth/AuthPage"))
const UserPage = lazy(() => import("@/pages/user/UserPage"))
const UserDashboard = lazy(() => import("@/pages/user/UserDashboard").then(m => ({ default: m.UserDashboard })))
const UserDraws = lazy(() => import("@/pages/user/UserDraws").then(m => ({ default: m.UserDraws })))
const UserMatches = lazy(() => import("@/pages/user/UserMatches").then(m => ({ default: m.UserMatches })))
const UserRankings = lazy(() => import("@/pages/user/UserRankings").then(m => ({ default: m.UserRankings })))
const UserMessages = lazy(() => import("@/pages/user/UserMessages").then(m => ({ default: m.UserMessages })))
const UserSettings = lazy(() => import("@/pages/user/UserSettings").then(m => ({ default: m.UserSettings })))
const AdminPage = lazy(() => import("@/pages/admin/AdminPage"))
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard").then(m => ({ default: m.AdminDashboard })))
const AdminDraws = lazy(() => import("@/pages/admin/AdminDraws").then(m => ({ default: m.AdminDraws })))
const AdminMatches = lazy(() => import("@/pages/admin/AdminMatches").then(m => ({ default: m.AdminMatches })))
const AdminPlayers = lazy(() => import("@/pages/admin/AdminPlayers").then(m => ({ default: m.AdminPlayers })))
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings").then(m => ({ default: m.AdminSettings })))

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
                    {
                        path: "user",
                        element: withSuspense(UserPage),
                        children: [
                            { path: "", element: withSuspense(UserDashboard) },
                            { path: "draws", element: withSuspense(UserDraws) },
                            { path: "matches", element: withSuspense(UserMatches) },
                            { path: "rankings", element: withSuspense(UserRankings) },
                            { path: "messages", element: withSuspense(UserMessages) },
                            { path: "settings", element: withSuspense(UserSettings) },
                        ]
                    }
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
                            { path: "", element: withSuspense(AdminDashboard) },
                            { path: "draws", element: withSuspense(AdminDraws) },
                            { path: "matches", element: withSuspense(AdminMatches) },
                            { path: "players", element: withSuspense(AdminPlayers) },
                            { path: "settings", element: withSuspense(AdminSettings) }
                        ]
                    }
                ]
            }
        ]
    }

])

export default router
