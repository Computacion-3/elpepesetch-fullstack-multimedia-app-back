/**
 * Usuario autenticado de una conexión de Socket.IO (queda en `socket.data.user`).
 * Rol y permisos se leen de la BD al conectar, igual que JwtStrategy en HTTP.
 */
export interface SocketUser {
    id: number;
    email: string;
    username: string;
    role: string;
    permissions: string[];
    sessionJti: string;
    tokenExp: number;
}
