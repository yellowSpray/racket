import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
    children: ReactNode
}

export default function ProtectedRoute({children}: ProtectedRouteProps) {

    const { user, loading } = useAuth()

    if(loading) {
        return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
    }

    if (!user) {
        return <Navigate to="/auth" replace />;
    }

    return (
        <>
            {children}
        </>
    )
}