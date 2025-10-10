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