import type { User } from '@/types/auth'
import { useNavigate } from 'react-router'
import { useEffect, useState } from 'react'
import { AuthContext } from '@/context/AuthContextInstance'

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
            } catch (error) {
                console.error('Failed to parse user data:', error)
            }
        } 

        setLoading(false);

    }, [])

    const login = (userData: User, token: string): void => {
        sessionStorage.setItem('token', token)
        sessionStorage.setItem('user', JSON.stringify(userData))
        setUser(userData)
        navigate('/dashboard');
    }

    const logout = (): void => {
        sessionStorage.clear()
        setUser(null);
        navigate('/auth', { replace: true });
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}