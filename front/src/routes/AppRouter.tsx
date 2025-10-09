import Auth from "@/pages/Auth/Auth"
import Home from "@/pages/Home"
import { Route, Routes } from "react-router"

export default function AppRouter() {
    return (
        <Routes>
            <Route index element={<Home />} />
            <Route path="/auth" element={<Auth/>} />
        </Routes>
    )
}