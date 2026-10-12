import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Mock } from 'vitest';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import { ApprovalStatus, MediaType } from '../enums/library.enums.js';
import { MediaQueryDto } from './dto/media-query.dto.js';
import { MediaItemService } from './media-item.service.js';

const userOf = (id: number, role: string, permissions: string[] = []): AuthenticatedUser => ({
    id,
    role,
    permissions,
    email: `${id}@test.com`,
    username: `u${id}`,
    jti: 'j',
    tokenExp: 0,
});

describe('MediaItemService', () => {
    const user = userOf(7, 'USER', ['catalog:create', 'catalog:update']);
    const admin = userOf(1, 'ADMIN', ['catalog:moderate']);
    const moderator = userOf(2, 'MODERATOR', ['catalog:moderate']);
    const genre = { id: 'g-1', name: 'RPG' };
    const dto = { title: 'Hades', type: MediaType.GAME, releaseYear: 2020, creator: 'Supergiant', genreIds: ['g-1'] };
    const item = (overrides = {}) => ({
        id: 'm-1',
        ...dto,
        approvalStatus: ApprovalStatus.PENDING,
        rejectionReason: null,
        createdBy: { id: 7 },
        genres: [genre],
        ...overrides,
    });

    let repo: { create: Mock; save: Mock; findAndCount: Mock; findOne: Mock; merge: Mock; remove: Mock };
    let genres: { findBy: Mock };
    let service: MediaItemService;

    beforeEach(() => {
        repo = {
            create: vi.fn((data) => ({ ...data })),
            save: vi.fn(async (m) => m),
            findAndCount: vi.fn().mockResolvedValue([[], 0]),
            findOne: vi.fn().mockResolvedValue(null),
            merge: vi.fn((target, source) => Object.assign(target, source)),
            remove: vi.fn(),
        };
        genres = { findBy: vi.fn().mockResolvedValue([genre]) };
        service = new MediaItemService(repo as never, genres as never);
    });

    describe('create', () => {
        it('una propuesta de usuario queda PENDING y guarda al creador y sus géneros', async () => {
            const saved = await service.create(user, dto);
            expect(saved).toMatchObject({ approvalStatus: ApprovalStatus.PENDING, createdBy: { id: 7 }, genres: [genre] });
        });

        it('lo que crea un administrador queda APPROVED', async () => {
            await expect(service.create(admin, dto)).resolves.toMatchObject({ approvalStatus: ApprovalStatus.APPROVED });
        });

        it('responde 400 si algún género no existe', async () => {
            genres.findBy.mockResolvedValue([]);
            await expect(service.create(user, dto)).rejects.toBeInstanceOf(BadRequestException);
        });

        it('responde 400 si el año supera el actual + 5', async () => {
            await expect(service.create(user, { ...dto, releaseYear: new Date().getFullYear() + 6 })).rejects.toBeInstanceOf(
                BadRequestException,
            );
        });

        it('responde 409 si ya existe (título, tipo, año)', async () => {
            repo.save.mockRejectedValue(new QueryFailedError('INSERT', [], { code: '23505' }));
            await expect(service.create(user, dto)).rejects.toBeInstanceOf(ConflictException);
        });
    });

    describe('consultas', () => {
        it('findAll muestra aprobados y los pendientes propios, con filtros y paginación', async () => {
            const query = Object.assign(new MediaQueryDto(), { type: MediaType.GAME, page: 2, limit: 5 });
            repo.findAndCount.mockResolvedValue([[item()], 6]);

            const result = await service.findAll(user, query);

            const options = repo.findAndCount.mock.calls[0][0];
            expect(options.where).toEqual([
                { type: MediaType.GAME, approvalStatus: ApprovalStatus.APPROVED },
                { type: MediaType.GAME, approvalStatus: ApprovalStatus.PENDING, createdBy: { id: 7 } },
            ]);
            expect(options).toMatchObject({ skip: 5, take: 5, order: { title: 'ASC' } });
            expect(result.meta).toEqual({ total: 6, page: 2, limit: 5, totalPages: 2 });
        });

        it('el filtro genreId no recorta los géneros de cada elemento', async () => {
            await service.findAll(user, Object.assign(new MediaQueryDto(), { genreId: 'g-1' }));

            const options = repo.findAndCount.mock.calls[0][0];
            expect(options.where[0].genres).toEqual({ id: 'g-1' });
            expect(options.relationLoadStrategy).toBe('query');
        });

        it('q busca en título o creador dentro de cada condición de visibilidad', async () => {
            await service.findAll(user, Object.assign(new MediaQueryDto(), { q: 'hades' }));
            expect(repo.findAndCount.mock.calls[0][0].where).toHaveLength(4);
        });

        it('un pendiente ajeno responde 404, pero lo ven su creador y los moderadores', async () => {
            repo.findOne.mockResolvedValue(item());
            await expect(service.findOne(userOf(9, 'USER'), 'm-1')).rejects.toBeInstanceOf(NotFoundException);
            await expect(service.findOne(user, 'm-1')).resolves.toBeDefined();
            await expect(service.findOne(moderator, 'm-1')).resolves.toBeDefined();
        });

        it('findPending lista solo los pendientes', async () => {
            await service.findPending(new MediaQueryDto());
            expect(repo.findAndCount.mock.calls[0][0].where).toEqual({ approvalStatus: ApprovalStatus.PENDING });
        });
    });

    describe('update', () => {
        it('el creador edita su propuesta pendiente y puede cambiar los géneros', async () => {
            repo.findOne.mockResolvedValue(item());
            await expect(service.update(user, 'm-1', { title: 'Hades II', genreIds: ['g-1'] })).resolves.toMatchObject({
                title: 'Hades II',
            });
        });

        it('el creador no edita una vez aprobado (403)', async () => {
            repo.findOne.mockResolvedValue(item({ approvalStatus: ApprovalStatus.APPROVED }));
            await expect(service.update(user, 'm-1', { title: 'X' })).rejects.toBeInstanceOf(ForbiddenException);
        });

        it('otro usuario no edita (403)', async () => {
            repo.findOne.mockResolvedValue(item());
            await expect(service.update(userOf(9, 'USER'), 'm-1', { title: 'X' })).rejects.toBeInstanceOf(
                ForbiddenException,
            );
        });

        it('el administrador edita siempre', async () => {
            repo.findOne.mockResolvedValue(item({ approvalStatus: ApprovalStatus.APPROVED, createdBy: { id: 9 } }));
            await expect(service.update(admin, 'm-1', { title: 'X' })).resolves.toMatchObject({ title: 'X' });
        });
    });

    describe('setApproval', () => {
        it('aprueba un pendiente y limpia el motivo', async () => {
            repo.findOne.mockResolvedValue(item());
            await expect(service.setApproval('m-1', { approvalStatus: ApprovalStatus.APPROVED })).resolves.toMatchObject({
                approvalStatus: ApprovalStatus.APPROVED,
                rejectionReason: null,
            });
        });

        it('rechaza con motivo', async () => {
            repo.findOne.mockResolvedValue(item());
            await expect(
                service.setApproval('m-1', { approvalStatus: ApprovalStatus.REJECTED, rejectionReason: ' Duplicado ' }),
            ).resolves.toMatchObject({ approvalStatus: ApprovalStatus.REJECTED, rejectionReason: 'Duplicado' });
        });

        it('rechazar sin motivo responde 400', async () => {
            await expect(service.setApproval('m-1', { approvalStatus: ApprovalStatus.REJECTED })).rejects.toBeInstanceOf(
                BadRequestException,
            );
        });

        it('un elemento ya revisado responde 409', async () => {
            repo.findOne.mockResolvedValue(item({ approvalStatus: ApprovalStatus.APPROVED }));
            await expect(service.setApproval('m-1', { approvalStatus: ApprovalStatus.APPROVED })).rejects.toBeInstanceOf(
                ConflictException,
            );
        });
    });

    describe('remove', () => {
        it('elimina el elemento', async () => {
            repo.findOne.mockResolvedValue(item());
            await expect(service.remove('m-1')).resolves.toEqual({ message: 'Media item m-1 deleted successfully' });
        });

        it('responde 404 si no existe', async () => {
            await expect(service.remove('nope')).rejects.toBeInstanceOf(NotFoundException);
        });

        it('responde 409 si está en uso', async () => {
            repo.findOne.mockResolvedValue(item());
            repo.remove.mockRejectedValue(new QueryFailedError('DELETE', [], { code: '23503' }));
            await expect(service.remove('m-1')).rejects.toBeInstanceOf(ConflictException);
        });
    });
});
