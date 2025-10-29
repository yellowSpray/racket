export interface User {
    id: string,
    last_name: string,
    first_name: string,
    email: string,
    phone: string,
    role: string
}

export interface LoginCredentials {
    email: string,
    password: string
}
