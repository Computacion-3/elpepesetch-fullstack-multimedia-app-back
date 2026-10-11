import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Mock } from 'vitest';

import { PermissionService } from './permission.service.js';

/** Error de PostgreSQL tal como lo entrega TypeORM (QueryFailedError con el código del driver). */
const pgError = (code: string) => Object.assign(Object.create(QueryFailedError.prototype), { driverError: { code } });

describe('PermissionService', () => {
    let service: PermissionService;
    let repo: { create: Mock; save: Mock; find: Mock; findOne: Mock; merge: Mock; remove: Mock };

    const permission = () => ({ id: 1, name: 'users:manage', description: 'Gestionar usuarios' });

    beforeEach(() => {
        repo = {
            create: vi.fn((data) => ({ ...data })),
            save: vi.fn(async (p) => p),
            find: vi.fn(),
            findOne: vi.fn(),
            merge: vi.fn((target, source) => Object.assign(target, source)),
            remove: vi.fn(),
        };
        service = new PermissionService(repo as never);
    });

    it('crea un permiso', async () => {
        await expect(service.create({ name: 'seed:manage', description: 'Seed' })).resolves.toMatchObject({
            name: 'seed:manage',
        });
    });

    it('responde 409 si el nombre ya existe', async () => {
        repo.save.mockRejectedValue(pgError('23505'));
        await expect(service.create({ name: 'users:manage', description: 'x' })).rejects.toBeInstanceOf(ConflictException);
    });

    it('no oculta otros errores de base de datos', async () => {
        const failure = pgError('08006');
        repo.save.mockRejectedValue(failure);
        await expect(service.create({ name: 'x:y', description: 'x' })).rejects.toBe(failure);
    });

    it('findOne responde 404 si el permiso no existe', async () => {
        repo.findOne.mockResolvedValue(null);
        await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('update aplica los cambios sobre el permiso existente', async () => {
        repo.findOne.mockResolvedValue(permission());
        await expect(service.update(1, { description: 'Nueva' })).resolves.toMatchObject({ id: 1, description: 'Nueva' });
    });

    it('remove elimina el permiso y lo confirma', async () => {
        const existing = permission();
        repo.findOne.mockResolvedValue(existing);

        await expect(service.remove(1)).resolves.toEqual({ message: 'Permission with id #1 deleted successfully' });
        expect(repo.remove).toHaveBeenCalledWith(existing);
    });
});
