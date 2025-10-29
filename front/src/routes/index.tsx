import Auth from "@/pages/Auth/Auth";
import Home from "@/pages/Home";
import Rootlayout from "@/shared/layout/RootLayout";
import UserPage from "@/pages/UserPage";
import AdminPage from "@/pages/AdminPage";
import { createBrowserRouter } from "react-router";
import ProtectedRoute from "@/routes/ProtectedRoute";
import ListPlayers from "@/pages/Players/ListPlayers";

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
                            { path: "players", element: <ListPlayers />}
                        ] 
                    }
                ]
            }
        ]
    }

])

export default router