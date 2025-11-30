import Loading from "@/components/shared/Loading"
import { Navigate } from "react-router"
import { useAuth } from "@/contexts/AuthContext"


export function RedirectByRole() {

    const { profile, isLoading, isAuthenticated } = useAuth()

    if(isLoading) return <Loading />
    
    // Si pas connecter alors vers la page home
    if(!isAuthenticated || !profile) {
        return <Navigate to="/" replace />
    }

    // Switch en fonction du role
    switch (profile.role) {
        case "admin":
            return <Navigate to="/admin" replace />
        case "user":
            return <Navigate to="/user" replace />
        default:
            return <Navigate to="/" replace />
    }
}