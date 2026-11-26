import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard.js';

describe('JwtAuthGuard context adapters', () => {
    const guard = new JwtAuthGuard(new Reflector());

    it('accepts a WebSocket message only after the handshake populated socket.data.user', () => {
        const socket = { data: { user: { id: 7 } } };
        const context = {
            getType: () => 'ws',
            switchToWs: () => ({ getClient: () => socket }),
        } as unknown as ExecutionContext;
        expect(guard.canActivate(context)).toBe(true);
    });

    it('rejects WebSocket messages without an authenticated handshake', () => {
        const context = {
            getType: () => 'ws',
            switchToWs: () => ({ getClient: () => ({ data: {} }) }),
        } as unknown as ExecutionContext;
        expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('extracts the same request from the Apollo GraphQL context', () => {
        const request = { user: { id: 7 } };
        const context = {
            getType: () => 'graphql',
            getArgs: () => [null, null, { req: request }, null],
            getClass: () => class Resolver {},
            getHandler: () => vi.fn(),
        } as unknown as ExecutionContext;
        expect(guard.getRequest(context)).toBe(request);
    });
});
