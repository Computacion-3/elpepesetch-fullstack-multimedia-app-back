import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

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
});
