import type { Socket } from 'socket.io';

import type { AuthService } from '../auth.service.js';
import type { SocketUser } from '../interfaces/socket-user.interface.js';

/** Sala privada de cada usuario: sirve para mandarle eventos solo a él (`server.to(userRoom(id)).emit(...)`). */
export const userRoom = (userId: number): string => `user:${userId}`;

type SocketMiddleware = (socket: Socket, next: (err?: Error) => void) => void;

/**
 * Middleware de Socket.IO que autentica el handshake con el ticket de `POST /auth/socket-token`
 * (o la mutation `socketToken`). El cliente lo manda en `io(url, { auth: { token } })`.
 *
 * Si el ticket es válido: deja el usuario en `socket.data.user` y lo une a su sala `user:<id>`.
 * Si no: rechaza la conexión y el cliente recibe `connect_error` con el motivo en `err.message`.
 *
 * Uso en el gateway:
 *   afterInit(server: Server) { server.use(createSocketAuthMiddleware(this.authService)); }
 */
export function createSocketAuthMiddleware(authService: Pick<AuthService, 'verifySocketToken'>): SocketMiddleware {
    return (socket, next) => {
        const token = (socket.handshake.auth as { token?: unknown } | undefined)?.token;
        authService
            .verifySocketToken(typeof token === 'string' ? token : undefined)
            .then(async (user) => {
                socket.data.user = user;
                await socket.join(userRoom(user.id));
                if (user.role === 'MODERATOR' || user.role === 'ADMIN') await socket.join('moderators');
                next();
            })
            .catch((error: unknown) => {
                next(new Error(error instanceof Error ? error.message : 'No autorizado'));
            });
    };
}

/** Usuario de una conexión ya autenticada por el middleware. */
export function getSocketUser(socket: Socket): SocketUser {
    const user = socket.data.user as SocketUser | undefined;
    if (!user) {
        throw new Error('La conexión no pasó por createSocketAuthMiddleware');
    }
    return user;
}
