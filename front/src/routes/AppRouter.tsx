import Auth from "@/pages/Auth/Auth"
import Home from "@/pages/Home"
import { Route, Routes } from "react-router"
import ProtectedRoute from "./ProtectedRoute"
import Dashboard from "@/pages/Dashboard"

export default function AppRouter() {
    return (
        <Routes>
            <Route index element={<Home />} />
            <Route path="/auth" element={<Auth/>} />
            <Route 
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                } 
            />
        </Routes>
    )
}