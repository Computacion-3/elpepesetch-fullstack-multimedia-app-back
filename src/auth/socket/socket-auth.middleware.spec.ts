import { UnauthorizedException } from '@nestjs/common';
import type { Socket } from 'socket.io';

import type { SocketUser } from '../interfaces/socket-user.interface.js';
import { createSocketAuthMiddleware, getSocketUser, userRoom } from './socket-auth.middleware.js';

describe('createSocketAuthMiddleware', () => {
    const user: SocketUser = { id: 7, email: 'pepe@example.com', username: 'pepe', role: 'USER', permissions: [] };

    const fakeSocket = (auth: Record<string, unknown> = {}) =>
        ({ handshake: { auth }, data: {}, join: vi.fn().mockResolvedValue(undefined) }) as unknown as Socket & {
            join: ReturnType<typeof vi.fn>;
        };

    /** Ejecuta el middleware y devuelve lo que recibió `next`. */
    const run = (verify: ReturnType<typeof vi.fn>, socket: Socket) =>
        new Promise<Error | undefined>((resolve) => {
            createSocketAuthMiddleware({ verifySocketToken: verify })(socket, resolve);
        });

    it('acepta un ticket válido: guarda el usuario y lo une a su sala', async () => {
        const verify = vi.fn().mockResolvedValue(user);
        const socket = fakeSocket({ token: 'ticket' });

        await expect(run(verify, socket)).resolves.toBeUndefined();

        expect(verify).toHaveBeenCalledWith('ticket');
        expect(getSocketUser(socket)).toEqual(user);
        expect(socket.join).toHaveBeenCalledWith('user:7');
    });

    it('rechaza la conexión con el motivo del 401', async () => {
        const verify = vi.fn().mockRejectedValue(new UnauthorizedException('El ticket del socket ya fue usado'));
        const socket = fakeSocket({ token: 'usado' });

        const error = await run(verify, socket);

        expect(error).toBeInstanceOf(Error);
        expect(error?.message).toBe('El ticket del socket ya fue usado');
        expect(socket.data.user).toBeUndefined();
        expect(socket.join).not.toHaveBeenCalled();
    });

    it('sin token (o con un token que no es texto) delega el rechazo en verifySocketToken', async () => {
        const verify = vi.fn().mockRejectedValue(new UnauthorizedException('Falta el ticket del socket'));

        await run(verify, fakeSocket());
        await run(verify, fakeSocket({ token: 123 }));

        expect(verify).toHaveBeenNthCalledWith(1, undefined);
        expect(verify).toHaveBeenNthCalledWith(2, undefined);
    });

    it('getSocketUser falla si la conexión no pasó por el middleware', () => {
        expect(() => getSocketUser(fakeSocket())).toThrow('createSocketAuthMiddleware');
    });

    it('userRoom arma el nombre de la sala', () => {
        expect(userRoom(42)).toBe('user:42');
    });
});
