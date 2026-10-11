import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '../../decorators/public.decorator.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
    const handler = () => undefined;
    class TestController {}
    const context = {
        getHandler: () => handler,
        getClass: () => TestController,
    } as unknown as ExecutionContext;

    const guardWith = (isPublic: boolean | undefined) => {
        const reflector = { getAllAndOverride: vi.fn().mockReturnValue(isPublic) } as unknown as Reflector;
        return { guard: new JwtAuthGuard(reflector), reflector };
    };

    afterEach(() => vi.restoreAllMocks());

    it('deja pasar sin token las rutas marcadas con @Public()', () => {
        const parent = vi.spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate');
        const { guard, reflector } = guardWith(true);

        expect(guard.canActivate(context)).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [handler, TestController]);
        expect(parent).not.toHaveBeenCalled();
    });

    it('en cualquier otra ruta delega la validación del JWT en Passport', () => {
        const parent = vi.spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate').mockReturnValue(true);
        const { guard } = guardWith(undefined);

        expect(guard.canActivate(context)).toBe(true);
        expect(parent).toHaveBeenCalledWith(context);
    });
});
