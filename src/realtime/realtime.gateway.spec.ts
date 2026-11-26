import { NotFoundException } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { RealtimeGateway } from './realtime.gateway.js';

describe('RealtimeGateway', () => {
    const server = {
        use: vi.fn(),
        to: vi.fn((_room: string) => ({ emit: vi.fn() })),
        in: vi.fn((_room: string) => ({ disconnectSockets: vi.fn(), socketsJoin: vi.fn(), socketsLeave: vi.fn() })),
    };
    const mediaItemId = '11111111-1111-4111-8111-111111111111';
    const mediaItems = { findOne: vi.fn() };
    const gateway = new RealtimeGateway({} as any, mediaItems as any);
    const client = () => ({
        data: { user: { id: 7, role: 'USER', permissions: [] } },
        join: vi.fn(async () => undefined),
        leave: vi.fn(async () => undefined),
    }) as unknown as Socket;

    beforeEach(() => {
        vi.clearAllMocks();
        mediaItems.findOne.mockResolvedValue({ id: mediaItemId });
    });

    it('delivers internal events only to the server-selected room', () => {
        gateway.afterInit(server as unknown as Server);
        gateway.deliver({
            room: 'moderators',
            event: 'moderation.queue.changed',
            payload: { kind: 'MEDIA', pendingMedia: 2, openReports: 0 },
        });
        expect(server.to).toHaveBeenCalledWith('moderators');
        expect(server.to.mock.results[0].value.emit).toHaveBeenCalledWith('moderation.queue.changed', {
            kind: 'MEDIA',
            pendingMedia: 2,
            openReports: 0,
        });
    });

    it('updates moderator room membership from the current database role', () => {
        gateway.afterInit(server as unknown as Server);
        gateway.updateRoleRooms({ userId: 5, role: 'USER' });
        expect(server.in.mock.results[0].value.socketsLeave).toHaveBeenCalledWith('moderators');
        gateway.updateRoleRooms({ userId: 5, role: 'MODERATOR' });
        expect(server.in.mock.results[1].value.socketsJoin).toHaveBeenCalledWith('moderators');
    });

    it('joins a media room only after catalog visibility is confirmed', async () => {
        const socket = client();
        await gateway.subscribeToMedia(socket, { mediaItemId });
        expect(mediaItems.findOne).toHaveBeenCalledWith(socket.data.user, mediaItemId);
        expect(socket.join).toHaveBeenCalledWith('media:' + mediaItemId);
    });

    it('rejects hidden media and does not let clients request arbitrary rooms', async () => {
        const socket = client();
        mediaItems.findOne.mockRejectedValueOnce(new NotFoundException());
        await expect(gateway.subscribeToMedia(socket, { mediaItemId })).rejects.toBeInstanceOf(WsException);
        await expect(gateway.subscribeToMedia(socket, { room: 'moderators' } as any)).rejects.toBeInstanceOf(WsException);
        expect(socket.join).not.toHaveBeenCalled();
    });

    it('lets a client leave only the server-built media room', async () => {
        const socket = client();
        await gateway.unsubscribeFromMedia(socket, { mediaItemId });
        expect(socket.leave).toHaveBeenCalledWith('media:' + mediaItemId);
    });

    it('disconnects only sockets attached to the revoked session jti', () => {
        gateway.afterInit(server as unknown as Server);
        const socket = {
            id: 'socket-1',
            data: { user: { sessionJti: 'session-1', tokenExp: 1_900_000_000 } },
            disconnect: vi.fn(),
        } as unknown as Socket;
        gateway.handleConnection(socket);
        gateway.sessionLoggedOut({ jti: 'another-session' });
        expect(socket.disconnect).not.toHaveBeenCalled();
        gateway.sessionLoggedOut({ jti: 'session-1' });
        expect(socket.disconnect).toHaveBeenCalledWith(true);
        gateway.handleDisconnect(socket);
    });

    it('emits deactivation before disconnecting every socket in the user room', () => {
        gateway.afterInit(server as unknown as Server);
        gateway.accountDeactivated({ userId: 5 });
        expect(server.to.mock.results[0].value.emit).toHaveBeenCalledWith('account.deactivated', {});
        expect(server.in.mock.results[0].value.disconnectSockets).toHaveBeenCalledWith(true);
    });

    it('keeps sockets with distant expiration alive until the session expires', async () => {
        vi.useFakeTimers({ now: 1_800_000_000_000 });
        const socket = {
            id: 'socket-long-session',
            data: { user: { sessionJti: 'session-long', tokenExp: 1_800_000_000 + 2_148_000 } },
            disconnect: vi.fn(),
        } as unknown as Socket;
        gateway.handleConnection(socket);

        await vi.advanceTimersByTimeAsync(2_147_483_647);
        expect(socket.disconnect).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(516_353);
        expect(socket.disconnect).toHaveBeenCalledWith(true);
        gateway.handleDisconnect(socket);
        vi.useRealTimers();
    });
});
