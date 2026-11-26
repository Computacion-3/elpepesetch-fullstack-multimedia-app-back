import { OnEvent } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WsException,
} from '@nestjs/websockets';
import { isUUID } from 'class-validator';
import type { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service.js';
import type { SocketUser } from '../auth/interfaces/socket-user.interface.js';
import { createSocketAuthMiddleware, userRoom } from '../auth/socket/socket-auth.middleware.js';
import { MediaItemService } from '../library-elements/media-item/media-item.service.js';
import type { RealtimeDelivery } from './realtime.events.js';
import { mediaRoom } from './realtime.events.js';

@WebSocketGateway({ path: '/socket.io' })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private server: Server;
    private readonly sessions = new Map<string, Set<Socket>>();
    private readonly expirationTimers = new Map<string, NodeJS.Timeout>();

    constructor(
        private readonly authService: AuthService,
        private readonly mediaItems: MediaItemService,
    ) {}

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

    // Permite entrar solo a la sala de un elemento que el usuario puede consultar.
    @SubscribeMessage('media.subscribe')
    async subscribeToMedia(
        @ConnectedSocket() client: Socket,
        @MessageBody() message: { mediaItemId?: unknown },
    ): Promise<{ mediaItemId: string }> {
        const mediaItemId = this.readMediaItemId(message);
        const user = client.data.user as SocketUser | undefined;
        if (!user) throw new WsException('La conexión no está autenticada');

        try {
            // El catálogo valida que el elemento sea visible para la identidad del handshake.
            await this.mediaItems.findOne(user, mediaItemId);
        } catch (error) {
            if (error instanceof NotFoundException) throw new WsException('El elemento no está disponible');
            throw error;
        }

        await client.join(mediaRoom(mediaItemId));
        return { mediaItemId };
    }

    // Permite salir de la sala asociada a un elemento multimedia.
    @SubscribeMessage('media.unsubscribe')
    async unsubscribeFromMedia(
        @ConnectedSocket() client: Socket,
        @MessageBody() message: { mediaItemId?: unknown },
    ): Promise<{ mediaItemId: string }> {
        const mediaItemId = this.readMediaItemId(message);
        await client.leave(mediaRoom(mediaItemId));
        return { mediaItemId };
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

    private readMediaItemId(message: { mediaItemId?: unknown }): string {
        if (typeof message?.mediaItemId !== 'string' || !isUUID(message.mediaItemId)) {
            throw new WsException('mediaItemId debe ser un UUID válido');
        }
        return message.mediaItemId;
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
