import type { User } from '@/types/auth'
import { useNavigate } from 'react-router'
import { useEffect, useState } from 'react'
import { AuthContext } from '@/context/AuthContextInstance'

export interface AuthContextType {
    user: User | null,
    loading: boolean,
    login: (userData: User, token: string) => void,
    logout: () => void
}

export const AuthProvider = ({ children }: { children: React.ReactNode}) => {

    const [ user, setUser ] = useState<User | null>(null)
    const [ loading, setLoading ] = useState<boolean>(true)
    const navigate = useNavigate()

    useEffect(() => {

        const token = sessionStorage.getItem('token')
        const userData = sessionStorage.getItem('user')

        if(token && userData) {
            try {
                const parsedUser: User = JSON.parse(userData)
                setUser(parsedUser)
                console.log("[AuthProvider] User loaded from sessionStorage:", parsedUser);
            } catch (error) {
                console.error('Failed to parse user data:', error)
            } finally {
                setLoading(false)
            }
        } else {
            console.log("[AuthProvider] No user found in sessionStorage");
            setLoading(false);
        }

    }, [])

    const login = (userData: User, token: string): void => {
        sessionStorage.setItem('token', token)
        sessionStorage.setItem('user', JSON.stringify(userData))
        setUser(userData)
        navigate('/dashboard');
    }

    const logout = (): void => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setUser(null);
        navigate('/auth');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}