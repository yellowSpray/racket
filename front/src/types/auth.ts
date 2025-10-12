export interface User {
    id: number,
    email: string,
    password: string,
    name: string,
    role: string
}

export interface LoginCredentials {
    email: string,
    password: string
}

export interface AuthContextType {
    user: User | null,
    loading: boolean,
    login: (userData: User, token: string) => void,
    logout: () => void
}