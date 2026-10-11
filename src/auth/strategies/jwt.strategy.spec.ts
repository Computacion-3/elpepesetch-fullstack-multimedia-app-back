import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Mocked } from 'vitest';

import { UserNotFoundException } from '../../common/exceptions/index.js';
import { AuthService } from '../auth.service.js';
import { UserService } from '../user/user.service.js';
import { JwtStrategy } from './jwt.strategy.js';

describe('JwtStrategy', () => {
    let strategy: JwtStrategy;
    let usersService: Mocked<Pick<UserService, 'findOne'>>;
    let authService: Mocked<Pick<AuthService, 'isRevoked'>>;

    const config = (secret?: string) => ({ get: vi.fn().mockReturnValue(secret) }) as unknown as ConfigService;
    const payload = { sub: '7', email: 'pepe@example.com', jti: 'token-1', exp: 1_900_000_000 };
    const dbUser = (overrides = {}) => ({
        id: 7,
        email: 'pepe@example.com',
        username: 'pepe',
        isActive: true,
        role: {
            name: 'MODERATOR',
            rolePermissions: [{ permission: { name: 'reviews:moderate' } }, { permission: { name: 'reports:create' } }],
        },
        ...overrides,
    });

    beforeEach(() => {
        usersService = { findOne: vi.fn() };
        authService = { isRevoked: vi.fn().mockResolvedValue(false) };
        strategy = new JwtStrategy(
            config('test-secret'),
            usersService as unknown as UserService,
            authService as unknown as AuthService,
        );
    });

    it('no arranca si falta JWT_SECRET', () => {
        expect(
            () => new JwtStrategy(config(undefined), usersService as unknown as UserService, authService as unknown as AuthService),
        ).toThrow(/JWT_SECRET/);
    });

    it('construye request.user con el rol y los permisos leídos de la BD', async () => {
        usersService.findOne.mockResolvedValue(dbUser() as never);

        await expect(strategy.validate(payload)).resolves.toEqual({
            id: 7,
            email: 'pepe@example.com',
            username: 'pepe',
            role: 'MODERATOR',
            permissions: ['reviews:moderate', 'reports:create'],
            jti: 'token-1',
            tokenExp: 1_900_000_000,
        });
        expect(usersService.findOne).toHaveBeenCalledWith(7, true);
    });

    it('un rol sin permisos produce una lista vacía', async () => {
        usersService.findOne.mockResolvedValue(dbUser({ role: { name: 'USER' } }) as never);
        await expect(strategy.validate(payload)).resolves.toMatchObject({ permissions: [] });
    });

    it('rechaza un token sin jti (401)', async () => {
        await expect(strategy.validate({ ...payload, jti: '' })).rejects.toBeInstanceOf(UnauthorizedException);
        expect(usersService.findOne).not.toHaveBeenCalled();
    });

    it('rechaza un token revocado con logout (401) sin consultar al usuario', async () => {
        authService.isRevoked.mockResolvedValue(true);

        await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
        expect(authService.isRevoked).toHaveBeenCalledWith('token-1');
        expect(usersService.findOne).not.toHaveBeenCalled();
    });

    it('rechaza el token de un usuario que ya no existe (401, no 404)', async () => {
        usersService.findOne.mockRejectedValue(new UserNotFoundException(7));
        await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rechaza el token de una cuenta desactivada (401)', async () => {
        usersService.findOne.mockResolvedValue(dbUser({ isActive: false }) as never);
        await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('no oculta errores inesperados de la base de datos', async () => {
        const failure = new Error('connection lost');
        usersService.findOne.mockRejectedValue(failure);
        await expect(strategy.validate(payload)).rejects.toBe(failure);
    });
});
