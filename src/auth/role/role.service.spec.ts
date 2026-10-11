import { BadRequestException, ConflictException } from '@nestjs/common';
import { In, QueryFailedError } from 'typeorm';
import { Mock } from 'vitest';

import { RoleNotFoundException } from '../../common/exceptions/index.js';
import { RolePermission } from '../entities/role-permission.entity.js';
import { RoleService } from './role.service.js';

/** Error de PostgreSQL tal como lo entrega TypeORM (QueryFailedError con el código del driver). */
const pgError = (code: string) => Object.assign(Object.create(QueryFailedError.prototype), { driverError: { code } });

describe('RoleService', () => {
    let service: RoleService;
    let roleRepo: { create: Mock; save: Mock; find: Mock; findOne: Mock; merge: Mock; remove: Mock; manager: { transaction: Mock } };
    let permissionRepo: { findBy: Mock };
    let manager: { createQueryBuilder: Mock; save: Mock; create: Mock };
    let deleteChain: { delete: Mock; from: Mock; where: Mock; execute: Mock };

    const role = () => ({ id: 2, name: 'MODERATOR', description: 'Modera', rolePermissions: [] });
    const permissions = [
        { id: 1, name: 'reviews:moderate' },
        { id: 2, name: 'catalog:moderate' },
    ];

    beforeEach(() => {
        deleteChain = { delete: vi.fn(), from: vi.fn(), where: vi.fn(), execute: vi.fn() };
        deleteChain.delete.mockReturnValue(deleteChain);
        deleteChain.from.mockReturnValue(deleteChain);
        deleteChain.where.mockReturnValue(deleteChain);

        manager = {
            createQueryBuilder: vi.fn().mockReturnValue(deleteChain),
            save: vi.fn(),
            create: vi.fn((_entity, data) => ({ ...data })),
        };
        roleRepo = {
            create: vi.fn((data) => ({ ...data })),
            save: vi.fn(async (r) => r),
            find: vi.fn(),
            findOne: vi.fn(),
            merge: vi.fn((target, source) => Object.assign(target, source)),
            remove: vi.fn(),
            manager: { transaction: vi.fn(async (work) => work(manager)) },
        };
        permissionRepo = { findBy: vi.fn() };
        service = new RoleService(roleRepo as never, permissionRepo as never);
    });

    describe('create / update', () => {
        it('crea un rol', async () => {
            await expect(service.create({ name: 'EDITOR', description: 'Edita' })).resolves.toMatchObject({ name: 'EDITOR' });
        });

        it('responde 409 si el nombre ya existe', async () => {
            roleRepo.save.mockRejectedValue(pgError('23505'));
            await expect(service.create({ name: 'ADMIN', description: 'x' })).rejects.toBeInstanceOf(ConflictException);
        });

        it('update aplica los cambios sobre el rol existente', async () => {
            roleRepo.findOne.mockResolvedValue(role());
            await expect(service.update(2, { description: 'Nueva' })).resolves.toMatchObject({ id: 2, description: 'Nueva' });
        });
    });

    describe('findOne / findByName', () => {
        it('lanza RoleNotFoundException (404) si el rol no existe', async () => {
            roleRepo.findOne.mockResolvedValue(null);
            await expect(service.findOne(99)).rejects.toBeInstanceOf(RoleNotFoundException);
        });

        it('findByName devuelve null sin lanzar si no existe', async () => {
            roleRepo.findOne.mockResolvedValue(null);
            await expect(service.findByName('NOPE')).resolves.toBeNull();
        });
    });

    describe('setPermissions', () => {
        it('reemplaza los permisos del rol dentro de una transacción', async () => {
            roleRepo.findOne.mockResolvedValue(role());
            permissionRepo.findBy.mockResolvedValue(permissions);

            await service.setPermissions(2, [1, 2]);

            expect(permissionRepo.findBy).toHaveBeenCalledWith({ id: In([1, 2]) });
            expect(roleRepo.manager.transaction).toHaveBeenCalledTimes(1);
            expect(deleteChain.from).toHaveBeenCalledWith(RolePermission);
            expect(deleteChain.where).toHaveBeenCalledWith('role_id = :id', { id: 2 });
            expect(deleteChain.execute).toHaveBeenCalled();
            expect(manager.save).toHaveBeenCalledWith(RolePermission, [
                expect.objectContaining({ permission: permissions[0] }),
                expect.objectContaining({ permission: permissions[1] }),
            ]);
        });

        it('una lista vacía deja el rol sin permisos', async () => {
            roleRepo.findOne.mockResolvedValue(role());
            permissionRepo.findBy.mockResolvedValue([]);

            await service.setPermissions(2, []);

            expect(deleteChain.execute).toHaveBeenCalled();
            expect(manager.save).not.toHaveBeenCalled();
        });

        it('responde 400 y no modifica nada si algún permiso no existe', async () => {
            roleRepo.findOne.mockResolvedValue(role());
            permissionRepo.findBy.mockResolvedValue([permissions[0]]);

            await expect(service.setPermissions(2, [1, 999])).rejects.toBeInstanceOf(BadRequestException);
            expect(roleRepo.manager.transaction).not.toHaveBeenCalled();
        });

        it('acepta ids repetidos sin confundirlos con permisos faltantes', async () => {
            roleRepo.findOne.mockResolvedValue(role());
            permissionRepo.findBy.mockResolvedValue([permissions[0]]);

            await expect(service.setPermissions(2, [1, 1])).resolves.toBeDefined();
        });
    });

    describe('remove', () => {
        it('elimina un rol sin usuarios', async () => {
            roleRepo.findOne.mockResolvedValue(role());
            await expect(service.remove(2)).resolves.toEqual({ message: 'Role with id #2 deleted successfully' });
        });

        it('responde 409 si el rol tiene usuarios asignados (violación de llave foránea)', async () => {
            roleRepo.findOne.mockResolvedValue(role());
            roleRepo.remove.mockRejectedValue(pgError('23503'));
            await expect(service.remove(2)).rejects.toBeInstanceOf(ConflictException);
        });
    });
});
