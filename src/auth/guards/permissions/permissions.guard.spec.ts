import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WsException } from '@nestjs/websockets';

import { AppLogger } from '../../../common/logger/logger.service.js';
import { Permissions } from '../../decorators/permissions.decorator.js';
import { AuthenticatedUser } from '../../interfaces/authenticated-user.interface.js';

import { PermissionsGuard } from './permissions.guard.js';

class Handlers {
    @Permissions('users:manage')
    protected() {}

    @Permissions('users:manage', 'roles:manage')
    needsTwo() {}

    open() {}
}

describe('PermissionsGuard', () => {
    const logger = { warn: vi.fn() } as unknown as AppLogger;
    const guard = new PermissionsGuard(new Reflector(), logger);

    const contextFor = (handler: () => void, user?: Partial<AuthenticatedUser>) =>
        ({
            getHandler: () => handler,
            getClass: () => Handlers,
            getType: () => 'http',
            switchToHttp: () => ({ getRequest: () => ({ user }) }),
        }) as unknown as ExecutionContext;

    const handlers = Handlers.prototype;

    it('deja pasar rutas sin @Permissions()', () => {
        expect(guard.canActivate(contextFor(handlers.open))).toBe(true);
    });

    it('permite al usuario que tiene el permiso', () => {
        expect(guard.canActivate(contextFor(handlers.protected, { id: 1, permissions: ['users:manage'] }))).toBe(true);
    });

    it('responde 403 si el rol no tiene el permiso', () => {
        expect(() => guard.canActivate(contextFor(handlers.protected, { id: 1, permissions: [] }))).toThrow(
            ForbiddenException,
        );
    });

    it('exige TODOS los permisos indicados', () => {
        expect(() =>
            guard.canActivate(contextFor(handlers.needsTwo, { id: 1, permissions: ['users:manage'] })),
        ).toThrow(ForbiddenException);
        expect(
            guard.canActivate(contextFor(handlers.needsTwo, { id: 1, permissions: ['users:manage', 'roles:manage'] })),
        ).toBe(true);
    });

    it('responde 401 si no hay usuario autenticado en la petición', () => {
        expect(() => guard.canActivate(contextFor(handlers.protected))).toThrow(UnauthorizedException);
    });

    describe('WebSockets', () => {
        const wsContextFor = (handler: () => void, user?: Partial<AuthenticatedUser>) =>
            ({
                getHandler: () => handler,
                getClass: () => Handlers,
                getType: () => 'ws',
                switchToWs: () => ({ getClient: () => ({ data: { user } }) }),
            }) as unknown as ExecutionContext;

        it('lee los permisos del usuario del socket', () => {
            expect(guard.canActivate(wsContextFor(handlers.protected, { id: 1, permissions: ['users:manage'] }))).toBe(
                true,
            );
        });

        it('sin el permiso responde con WsException (no con un 403 HTTP)', () => {
            expect(() => guard.canActivate(wsContextFor(handlers.protected, { id: 1, permissions: [] }))).toThrow(
                WsException,
            );
        });

        it('sin usuario en el socket responde con WsException', () => {
            expect(() => guard.canActivate(wsContextFor(handlers.protected))).toThrow(WsException);
        });
    });
});
