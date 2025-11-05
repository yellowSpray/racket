import Loading from "@/components/shared/Loading"
import { Navigate, Outlet } from "react-router"
import { useAuth } from "@/contexts/AuthContext"

type ProtectedRouteProps = {
    allowedRoles?: string[]
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {

    const { isAuthenticated, profile, isLoading } = useAuth()

    // chargement , affiche le loading
    if(isLoading){
        return <Loading />
    }
    // si pas connecté , redirige vers /auth
    if(!isAuthenticated){
        return <Navigate to="/auth" replace />
    }
    // pas de profil chargé, redirige vers /auth
    if(!profile){
        return <Navigate to="/auth" replace />
    }
    // verifie si le user a le bon role sinon redirige vers /
    if(allowedRoles && !allowedRoles.includes(profile.role)){
        return <Navigate to="/" replace />
    }
    
    // si tout ok alors affiche la route protégé
    return <Outlet />
}