export interface User {
    id: string,
    email: string,
    full_name: string,
    phone: string,
    role: string
}

export interface LoginCredentials {
    email: string,
    password: string
}
