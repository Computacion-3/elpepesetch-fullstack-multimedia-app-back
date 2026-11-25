import { OnEvent } from '@nestjs/event-emitter';
import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    WebSocketGateway,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service.js';
import { createSocketAuthMiddleware, userRoom } from '../auth/socket/socket-auth.middleware.js';
import type { RealtimeDelivery } from './realtime.events.js';

@WebSocketGateway({ path: '/socket.io' })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private server: Server;
    private readonly sessions = new Map<string, Set<Socket>>();
    private readonly expirationTimers = new Map<string, NodeJS.Timeout>();

    constructor(private readonly authService: AuthService) {}

    afterInit(server: Server) {
        this.server = server;
        server.use(createSocketAuthMiddleware(this.authService));
    }

    handleConnection(client: Socket) {
        const user = client.data.user as { sessionJti: string; tokenExp: number };
        const sockets = this.sessions.get(user.sessionJti) ?? new Set<Socket>();
        sockets.add(client);
        this.sessions.set(user.sessionJti, sockets);

        this.scheduleExpiration(client, user.tokenExp);
    }

    handleDisconnect(client: Socket) {
        clearTimeout(this.expirationTimers.get(client.id));
        this.expirationTimers.delete(client.id);
        const user = client.data.user as { sessionJti?: string } | undefined;
        if (!user?.sessionJti) return;
        const sockets = this.sessions.get(user.sessionJti);
        sockets?.delete(client);
        if (sockets?.size === 0) this.sessions.delete(user.sessionJti);
    }

    @OnEvent('realtime.direct')
    deliver(event: RealtimeDelivery) {
        this.server.to(event.room).emit(event.event, event.payload);
        if (event.disconnectUser) this.server.in(event.room).disconnectSockets(true);
    }

    @OnEvent('account.deactivated')
    accountDeactivated(event: { userId: number }) {
        const room = userRoom(event.userId);
        this.server.to(room).emit('account.deactivated', {});
        this.server.in(room).disconnectSockets(true);
    }

    @OnEvent('account.updated')
    updateRoleRooms(event: { userId: number; role: string }) {
        const sockets = this.server.in(userRoom(event.userId));
        if (event.role === 'MODERATOR' || event.role === 'ADMIN') sockets.socketsJoin('moderators');
        else sockets.socketsLeave('moderators');
    }

    @OnEvent('auth.logout')
    sessionLoggedOut(event: { jti: string }) {
        for (const socket of this.sessions.get(event.jti) ?? []) socket.disconnect(true);
    }

    private scheduleExpiration(client: Socket, tokenExp: number) {
        const remaining = tokenExp * 1000 - Date.now();
        const timer = setTimeout(() => {
            if (Date.now() >= tokenExp * 1000) client.disconnect(true);
            else this.scheduleExpiration(client, tokenExp);
        }, Math.min(Math.max(remaining, 0), 2_147_483_647));
        timer.unref();
        this.expirationTimers.set(client.id, timer);
    }
}
