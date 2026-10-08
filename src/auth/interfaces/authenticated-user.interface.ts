/** Forma de `request.user` una vez que el token JWT fue validado. Los permisos se leen de la BD en cada petición. */
export interface AuthenticatedUser {
    id: number;
    email: string;
    username: string;
    role: string;
    permissions: string[];
    /** Identificador único del token presentado (permite revocarlo en el logout). */
    jti: string;
    /** Expiración del token en segundos desde epoch. */
    tokenExp: number;
}
