import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { ILike, QueryFailedError } from 'typeorm';
import { Mock, Mocked } from 'vitest';

import { UserNotFoundException } from '../../common/exceptions/index.js';
import { RoleService } from '../role/role.service.js';
import { UserQueryDto } from './dto/user-query.dto.js';
import { UserService } from './user.service.js';

/** Error de PostgreSQL tal como lo entrega TypeORM (QueryFailedError con el código del driver). */
const pgError = (code: string) => Object.assign(Object.create(QueryFailedError.prototype), { driverError: { code } });

const query = (overrides: Partial<UserQueryDto> = {}): UserQueryDto =>
    Object.assign(new UserQueryDto(), overrides);

describe('UserService', () => {
    let service: UserService;
    let repo: { findAndCount: Mock; findOne: Mock; create: Mock; save: Mock; merge: Mock; remove: Mock };
    let roleService: Mocked<Pick<RoleService, 'findOne'>>;

    const userRole = { id: 1, name: 'USER' };
    const adminRole = { id: 3, name: 'ADMIN' };
    const dbUser = () => ({ id: 7, username: 'pepe', email: 'pepe@example.com', passwordHash: 'hash', isActive: true, role: userRole });

    beforeEach(() => {
        repo = {
            findAndCount: vi.fn().mockResolvedValue([[], 0]),
            findOne: vi.fn(),
            create: vi.fn((data) => ({ ...data })),
            save: vi.fn(async (user) => user),
            merge: vi.fn((target, source) => Object.assign(target, source)),
            remove: vi.fn(),
        };
        roleService = { findOne: vi.fn() };
        const config = { get: vi.fn().mockReturnValue('4') };
        service = new UserService(repo as never, roleService as unknown as RoleService, config as unknown as ConfigService);
    });

    describe('findAll', () => {
        it('sin filtros pagina con los valores por defecto (página 1, 10 por página)', async () => {
            repo.findAndCount.mockResolvedValue([[dbUser()], 23]);

            const result = await service.findAll(query());

            expect(repo.findAndCount).toHaveBeenCalledWith(
                expect.objectContaining({ where: {}, skip: 0, take: 10, order: { id: 'ASC' } }),
            );
            expect(result.meta).toEqual({ total: 23, page: 1, limit: 10, totalPages: 3 });
            expect(result.data).toHaveLength(1);
        });

        it('aplica rol, estado y el desplazamiento de la página', async () => {
            await service.findAll(query({ role: 'ADMIN', isActive: false, page: 3, limit: 5 }));

            expect(repo.findAndCount).toHaveBeenCalledWith(
                expect.objectContaining({ where: { role: { name: 'ADMIN' }, isActive: false }, skip: 10, take: 5 }),
            );
        });

        it('q busca en username, email o nombre (OR) sin perder los demás filtros', async () => {
            await service.findAll(query({ q: '  pepe ', isActive: true }));

            const like = ILike('%pepe%');
            expect(repo.findAndCount.mock.calls[0][0].where).toEqual([
                { isActive: true, username: like },
                { isActive: true, email: like },
                { isActive: true, fullName: like },
            ]);
        });

        it('escapa los comodines de LIKE en q', async () => {
            await service.findAll(query({ q: '50%_off' }));

            expect(repo.findAndCount.mock.calls[0][0].where[0].username).toEqual(ILike('%50\\%\\_off%'));
        });

        it('una página vacía informa 0 páginas', async () => {
            const result = await service.findAll(query());
            expect(result.meta).toEqual({ total: 0, page: 1, limit: 10, totalPages: 0 });
        });
    });

    describe('findOne', () => {
        it('lanza UserNotFoundException (404) si el usuario no existe', async () => {
            repo.findOne.mockResolvedValue(null);
            await expect(service.findOne(99)).rejects.toBeInstanceOf(UserNotFoundException);
        });

        it('carga rol y permisos cuando se piden las relaciones', async () => {
            repo.findOne.mockResolvedValue(dbUser());
            await service.findOne(7, true);
            expect(repo.findOne).toHaveBeenCalledWith({
                where: { id: 7 },
                relations: { role: { rolePermissions: { permission: true } } },
            });
        });
    });

    describe('creación', () => {
        const data = { username: 'pepe', email: 'pepe@example.com', password: 'Secreta123' };

        it('guarda solo el hash bcrypt de la contraseña, nunca el texto plano', async () => {
            const saved = await service.createWithRole(data, userRole as never);

            expect(saved).not.toHaveProperty('password');
            expect(saved.passwordHash).not.toBe('Secreta123');
            expect(bcrypt.compareSync('Secreta123', saved.passwordHash)).toBe(true);
            expect(saved.role).toBe(userRole);
        });

        it('el administrador crea con el rol indicado en roleId', async () => {
            roleService.findOne.mockResolvedValue(adminRole as never);

            const saved = await service.create({ ...data, roleId: 3 });

            expect(roleService.findOne).toHaveBeenCalledWith(3);
            expect(saved.role).toBe(adminRole);
        });

        it('traduce un correo o username repetido (23505) a 409', async () => {
            repo.save.mockRejectedValue(pgError('23505'));
            await expect(service.createWithRole(data, userRole as never)).rejects.toBeInstanceOf(ConflictException);
        });

        it('no oculta otros errores de base de datos', async () => {
            const failure = pgError('08006');
            repo.save.mockRejectedValue(failure);
            await expect(service.createWithRole(data, userRole as never)).rejects.toBe(failure);
        });
    });

    describe('edición', () => {
        it('updateProfile vuelve a hashear una contraseña nueva y aplica los demás campos', async () => {
            repo.findOne.mockResolvedValue(dbUser());

            const saved = await service.updateProfile(7, { password: 'Nueva1234', fullName: 'Pepe Pérez' });

            expect(bcrypt.compareSync('Nueva1234', saved.passwordHash)).toBe(true);
            expect(saved.fullName).toBe('Pepe Pérez');
            expect(saved.role).toBe(userRole);
        });

        it('update de administrador puede cambiar el rol', async () => {
            repo.findOne.mockResolvedValue(dbUser());
            roleService.findOne.mockResolvedValue(adminRole as never);

            const saved = await service.update(7, { roleId: 3 });

            expect(saved.role).toBe(adminRole);
        });

        it('assignRole asigna el rol y guarda', async () => {
            repo.findOne.mockResolvedValue(dbUser());
            roleService.findOne.mockResolvedValue(adminRole as never);

            const saved = await service.assignRole(7, 3);

            expect(saved.role).toBe(adminRole);
            expect(repo.save).toHaveBeenCalledTimes(1);
        });
    });

    describe('setStatus', () => {
        it('impide que un administrador desactive su propia cuenta (400) sin tocar la BD', async () => {
            await expect(service.setStatus(7, false, 7)).rejects.toBeInstanceOf(BadRequestException);
            expect(repo.findOne).not.toHaveBeenCalled();
        });

        it('desactiva la cuenta de otro usuario', async () => {
            repo.findOne.mockResolvedValue(dbUser());
            const saved = await service.setStatus(7, false, 1);
            expect(saved.isActive).toBe(false);
        });

        it('permite reactivar la propia cuenta', async () => {
            repo.findOne.mockResolvedValue({ ...dbUser(), isActive: false });
            const saved = await service.setStatus(7, true, 7);
            expect(saved.isActive).toBe(true);
        });
    });

    it('remove elimina al usuario y lo confirma', async () => {
        const user = dbUser();
        repo.findOne.mockResolvedValue(user);

        await expect(service.remove(7)).resolves.toEqual({ message: 'User with id #7 deleted successfully' });
        expect(repo.remove).toHaveBeenCalledWith(user);
    });
});
