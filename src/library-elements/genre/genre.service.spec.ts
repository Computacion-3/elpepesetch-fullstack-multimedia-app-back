import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Mock } from 'vitest';

import { GenreService } from './genre.service.js';

describe('GenreService', () => {
    let service: GenreService;
    let repo: { create: Mock; save: Mock; find: Mock; findOneBy: Mock; findOne: Mock; merge: Mock; remove: Mock };

    const genre = (mediaItems: unknown[] = []) => ({ id: 'g-1', name: 'Fantasía', description: null, mediaItems });

    beforeEach(() => {
        repo = {
            create: vi.fn((data) => ({ ...data })),
            save: vi.fn(async (g) => g),
            find: vi.fn().mockResolvedValue([]),
            findOneBy: vi.fn().mockResolvedValue(null),
            findOne: vi.fn().mockResolvedValue(null),
            merge: vi.fn((target, source) => Object.assign(target, source)),
            remove: vi.fn(),
        };
        service = new GenreService(repo as never);
    });

    it('crea un género', async () => {
        await expect(service.create({ name: 'Terror' })).resolves.toMatchObject({ name: 'Terror' });
    });

    it('responde 409 si el nombre ya existe', async () => {
        repo.save.mockRejectedValue(new QueryFailedError('INSERT', [], { code: '23505' }));
        await expect(service.create({ name: 'Fantasía' })).rejects.toBeInstanceOf(ConflictException);
    });

    it('no oculta otros errores de base de datos', async () => {
        const failure = new Error('connection lost');
        repo.save.mockRejectedValue(failure);
        await expect(service.create({ name: 'X' })).rejects.toBe(failure);
    });

    it('lista los géneros ordenados por nombre', async () => {
        await service.findAll();
        expect(repo.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
    });

    it('findOne responde 404 si no existe', async () => {
        await expect(service.findOne('nope')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('update aplica los cambios y traduce un nombre duplicado a 409', async () => {
        repo.findOneBy.mockResolvedValue(genre());
        await expect(service.update('g-1', { description: 'Nueva' })).resolves.toMatchObject({ description: 'Nueva' });

        repo.save.mockRejectedValue(new QueryFailedError('UPDATE', [], { code: '23505' }));
        await expect(service.update('g-1', { name: 'Terror' })).rejects.toBeInstanceOf(ConflictException);
    });

    it('elimina un género sin elementos asignados', async () => {
        repo.findOne.mockResolvedValue(genre());
        await expect(service.remove('g-1')).resolves.toEqual({ message: 'Genre g-1 deleted successfully' });
        expect(repo.remove).toHaveBeenCalled();
    });

    it('responde 409 y no elimina un género asignado a elementos del catálogo', async () => {
        repo.findOne.mockResolvedValue(genre([{ id: 'm-1' }]));
        await expect(service.remove('g-1')).rejects.toBeInstanceOf(ConflictException);
        expect(repo.remove).not.toHaveBeenCalled();
    });

    it('remove responde 404 si no existe', async () => {
        await expect(service.remove('nope')).rejects.toBeInstanceOf(NotFoundException);
    });
});
