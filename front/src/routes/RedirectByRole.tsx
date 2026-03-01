import Loading from "@/components/shared/Loading"
import Home from "@/pages/Home"
import { Navigate } from "react-router"
import { useAuth } from "@/contexts/AuthContext"


export function RedirectByRole() {

    const { profile, isLoading, isAuthenticated } = useAuth()

    if(isLoading) return <Loading />

    // Si pas connecté → afficher la landing page
    if(!isAuthenticated || !profile) {
        return <Home />
    }

    // Switch en fonction du role
    switch (profile.role) {
        case "admin":
            return <Navigate to="/admin" replace />
        case "user":
            return <Navigate to="/user" replace />
        default:
            return <Home />
    }
}