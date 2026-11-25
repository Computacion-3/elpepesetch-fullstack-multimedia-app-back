import { InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { QueryFailedError } from 'typeorm';
import { Mock, Mocked } from 'vitest';

import { UserNotFoundException } from '../common/exceptions/index.js';

import { AuthService } from './auth.service.js';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface.js';
import { RoleService } from './role/role.service.js';
import { UserService } from './user/user.service.js';

describe('AuthService', () => {
    let service: AuthService;
    let usersService: Mocked<Pick<UserService, 'findByEmail' | 'createWithRole' | 'findOne'>>;
    let roleService: Mocked<Pick<RoleService, 'findByName'>>;
    let jwtService: { sign: Mock; verifyAsync: Mock };
    let revokedRepo: { upsert: Mock; delete: Mock; existsBy: Mock; insert: Mock };
    const events = { emit: vi.fn(), emitAsync: vi.fn().mockResolvedValue([]) };

    const passwordHash = bcrypt.hashSync('Secreta123', 4);
    const dbUser = {
        id: 7,
        username: 'pepe',
        email: 'pepe@example.com',
        passwordHash,
        isActive: true,
        role: { id: 1, name: 'USER', rolePermissions: [] },
    };

    beforeEach(() => {
        usersService = { findByEmail: vi.fn(), createWithRole: vi.fn(), findOne: vi.fn() };
        roleService = { findByName: vi.fn() };
        jwtService = { sign: vi.fn().mockReturnValue('signed.jwt.token'), verifyAsync: vi.fn() };
        revokedRepo = { upsert: vi.fn(), delete: vi.fn(), existsBy: vi.fn(), insert: vi.fn() };
        service = new AuthService(
            usersService as unknown as UserService,
            roleService as unknown as RoleService,
            jwtService as unknown as JwtService,
            revokedRepo as never,
            events as never,
        );
    });

    describe('register', () => {
        const dto = { username: 'pepe', email: 'pepe@example.com', password: 'Secreta123' };

        it('asigna siempre el rol por defecto', async () => {
            const role = { id: 1, name: 'USER' };
            roleService.findByName.mockResolvedValue(role as never);
            usersService.createWithRole.mockResolvedValue(dbUser as never);

            await service.register(dto);

            expect(roleService.findByName).toHaveBeenCalledWith('USER');
            expect(usersService.createWithRole).toHaveBeenCalledWith(dto, role);
        });

        it('falla con 500 si el rol por defecto no está configurado', async () => {
            roleService.findByName.mockResolvedValue(null);
            await expect(service.register(dto)).rejects.toBeInstanceOf(InternalServerErrorException);
        });
    });

    describe('login', () => {
        it('devuelve un JWT con jti único y sin exponer el hash', async () => {
            usersService.findByEmail.mockResolvedValue(dbUser as never);

            const result = await service.login({ email: dbUser.email, password: 'Secreta123' });

            expect(result).toEqual({
                accessToken: 'signed.jwt.token',
                tokenType: 'Bearer',
                user: { id: 7, username: 'pepe', email: 'pepe@example.com', role: 'USER' },
            });
            expect(JSON.stringify(result)).not.toContain(passwordHash);
            const [payload, options] = jwtService.sign.mock.calls[0] as [Record<string, unknown>, { jwtid: string }];
            expect(payload).toEqual({ sub: '7', email: 'pepe@example.com' });
            expect(options.jwtid).toMatch(/^[0-9a-f-]{36}$/);
        });

        it('genera un jti distinto en cada inicio de sesión', async () => {
            usersService.findByEmail.mockResolvedValue(dbUser as never);
            await service.login({ email: dbUser.email, password: 'Secreta123' });
            await service.login({ email: dbUser.email, password: 'Secreta123' });

            const jtis = jwtService.sign.mock.calls.map(([, options]) => (options as { jwtid: string }).jwtid);
            expect(new Set(jtis).size).toBe(2);
        });

        it('bloquea el inicio de sesión de una cuenta desactivada (401) sin emitir token', async () => {
            usersService.findByEmail.mockResolvedValue({ ...dbUser, isActive: false } as never);

            await expect(service.login({ email: dbUser.email, password: 'Secreta123' })).rejects.toThrow(
                'La cuenta está desactivada',
            );
            expect(jwtService.sign).not.toHaveBeenCalled();
        });

        it('no revela que la cuenta está desactivada si la contraseña es incorrecta', async () => {
            usersService.findByEmail.mockResolvedValue({ ...dbUser, isActive: false } as never);

            await expect(service.login({ email: dbUser.email, password: 'Otra12345' })).rejects.toThrow(
                'Credenciales inválidas',
            );
        });

        it('responde igual (401) con contraseña errónea y con correo inexistente', async () => {
            usersService.findByEmail.mockResolvedValueOnce(dbUser as never).mockResolvedValueOnce(null);

            const wrongPassword = await service.login({ email: dbUser.email, password: 'Otra12345' }).catch((e) => e);
            const unknownEmail = await service.login({ email: 'x@example.com', password: 'Otra12345' }).catch((e) => e);

            expect(wrongPassword).toBeInstanceOf(UnauthorizedException);
            expect(unknownEmail).toBeInstanceOf(UnauthorizedException);
            expect(unknownEmail.message).toBe(wrongPassword.message);
            expect(jwtService.sign).not.toHaveBeenCalled();
        });
    });

    describe('logout / revocación', () => {
        const authUser: AuthenticatedUser = {
            id: 7,
            email: 'pepe@example.com',
            username: 'pepe',
            role: 'USER',
            permissions: [],
            jti: 'abc-123',
            tokenExp: 1_900_000_000,
        };

        it('registra el jti con la fecha de expiración del token', async () => {
            await service.logout(authUser);

            expect(revokedRepo.upsert).toHaveBeenCalledWith(
                { jti: 'abc-123', expiresAt: new Date(1_900_000_000 * 1000) },
                { conflictPaths: ['jti'] },
            );
        });

        it('limpia los tokens revocados que ya expiraron', async () => {
            await service.logout(authUser);
            expect(revokedRepo.delete).toHaveBeenCalledTimes(1);
        });

        it('isRevoked consulta por jti', async () => {
            revokedRepo.existsBy.mockResolvedValue(true);
            await expect(service.isRevoked('abc-123')).resolves.toBe(true);
            expect(revokedRepo.existsBy).toHaveBeenCalledWith({ jti: 'abc-123' });
        });
    });

    describe('ticket del WebSocket', () => {
        const authUser: AuthenticatedUser = {
            id: 7,
            email: 'pepe@example.com',
            username: 'pepe',
            role: 'USER',
            permissions: [],
            jti: 'sesion-1',
            tokenExp: 1_900_000_000,
        };
        const ticketPayload = {
            sub: '7', email: 'pepe@example.com', typ: 'socket', jti: 'ticket-1', exp: 1_900_000_060,
            sessionJti: 'sesion-1', sessionExp: 1_900_000_000,
        };
        const dbUserWithPermissions = {
            ...dbUser,
            role: { id: 3, name: 'MODERATOR', rolePermissions: [{ permission: { name: 'reviews:moderate' } }] },
        };

        it('issueSocketToken firma un JWT de 60 s, audiencia socket y jti propio', () => {
            const result = service.issueSocketToken(authUser);

            expect(result).toEqual({ token: 'signed.jwt.token', expiresIn: 60 });
            const [payload, options] = jwtService.sign.mock.calls[0] as [
                Record<string, unknown>,
                { jwtid: string; audience: string; expiresIn: number },
            ];
            expect(payload).toMatchObject({ sub: '7', email: 'pepe@example.com', typ: 'socket', sessionJti: 'sesion-1', sessionExp: 1_900_000_000 });
            expect(options.audience).toBe('socket');
            expect(options.expiresIn).toBe(60);
            expect(options.jwtid).toMatch(/^[0-9a-f-]{36}$/);
            expect(options.jwtid).not.toBe(authUser.jti);
        });

        it('verifySocketToken devuelve el usuario con rol y permisos de la BD y consume el jti', async () => {
            jwtService.verifyAsync.mockResolvedValue(ticketPayload);
            usersService.findOne.mockResolvedValue(dbUserWithPermissions as never);

            await expect(service.verifySocketToken('ticket')).resolves.toEqual({
                id: 7,
                email: 'pepe@example.com',
                username: 'pepe',
                role: 'MODERATOR',
                permissions: ['reviews:moderate'],
                sessionJti: 'sesion-1',
                tokenExp: 1_900_000_000,
            });
            expect(jwtService.verifyAsync).toHaveBeenCalledWith('ticket', { audience: 'socket' });
            expect(revokedRepo.insert).toHaveBeenCalledWith({
                jti: 'ticket-1',
                expiresAt: new Date(1_900_000_060 * 1000),
            });
            expect(usersService.findOne).toHaveBeenCalledWith(7, true);
        });

        it('sin ticket responde 401 sin verificar nada', async () => {
            await expect(service.verifySocketToken(undefined)).rejects.toThrow('Falta el ticket del socket');
            expect(jwtService.verifyAsync).not.toHaveBeenCalled();
        });

        it('rechaza un ticket con firma inválida, vencido o de otra audiencia (401)', async () => {
            jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

            const error = await service.verifySocketToken('vencido').catch((e: unknown) => e);

            expect(error).toBeInstanceOf(UnauthorizedException);
            expect((error as Error).message).toBe('El ticket del socket es inválido o expiró');
            expect(revokedRepo.insert).not.toHaveBeenCalled();
        });

        it('rechaza un token que no es ticket de socket (por ejemplo, el de sesión)', async () => {
            jwtService.verifyAsync.mockResolvedValue({ ...ticketPayload, typ: undefined });

            await expect(service.verifySocketToken('sesion')).rejects.toBeInstanceOf(UnauthorizedException);
            expect(revokedRepo.insert).not.toHaveBeenCalled();
        });

        it('un ticket ya usado se rechaza (índice único de revoked_tokens)', async () => {
            jwtService.verifyAsync.mockResolvedValue(ticketPayload);
            revokedRepo.insert.mockRejectedValue(
                new QueryFailedError('INSERT', [], Object.assign(new Error('duplicate key'), { code: '23505' })),
            );

            await expect(service.verifySocketToken('ticket')).rejects.toThrow('El ticket del socket ya fue usado');
            expect(usersService.findOne).not.toHaveBeenCalled();
        });

        it('no oculta otros errores de la base de datos al consumir el ticket', async () => {
            jwtService.verifyAsync.mockResolvedValue(ticketPayload);
            const failure = new Error('conexión perdida');
            revokedRepo.insert.mockRejectedValue(failure);

            await expect(service.verifySocketToken('ticket')).rejects.toBe(failure);
        });

        it('rechaza el ticket de una cuenta desactivada (401)', async () => {
            jwtService.verifyAsync.mockResolvedValue(ticketPayload);
            usersService.findOne.mockResolvedValue({ ...dbUser, isActive: false } as never);

            await expect(service.verifySocketToken('ticket')).rejects.toThrow('La cuenta está desactivada');
        });

        it('rechaza el ticket de un usuario que ya no existe (401, no 404)', async () => {
            jwtService.verifyAsync.mockResolvedValue(ticketPayload);
            usersService.findOne.mockRejectedValue(new UserNotFoundException(7));

            await expect(service.verifySocketToken('ticket')).rejects.toBeInstanceOf(UnauthorizedException);
        });
    });
});
