import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserListsService } from './user_lists.service.js';
import { UserList } from '../entities/user_list.entity.js';
import { MediaItem } from '../entities/media-item.entity.js';
import { ActivityAction, ApprovalStatus, ListVisibility, MediaType } from '../enums/library.enums.js';
import { Not, QueryFailedError } from 'typeorm';
import { Mock } from 'vitest';

describe('UserListsService', () => {
    const mediaItem = Object.assign(new MediaItem(), {
        id: '44444444-4444-4444-8444-444444444444',
        approvalStatus: ApprovalStatus.APPROVED,
        type: MediaType.BOOK,
    });
    function createService(lists: UserList[] = [], media = mediaItem, saveError?: unknown) {
        const repository = {
            create: vi.fn((value: Partial<UserList>) => Object.assign(new UserList(), value)),
            findOne: vi.fn(
                async ({ where }: any) =>
                    lists.find(
                        (list) =>
                            (where.id && list.id === where.id) ||
                            (where.owner?.id && list.owner?.id === where.owner.id && list.name === where.name),
                    ) ?? null,
            ),
            find: vi.fn(async () => lists),
            findAndCount: vi.fn(async () => [lists, lists.length] as const),
            save: vi.fn(async (list: UserList) => {
                if (saveError) throw saveError;
                return list;
            }),
            remove: vi.fn(async (list: UserList) => list),
        };
        const mediaRepository = { findOne: vi.fn(async () => media) };
        const activity = { logActivity: vi.fn(async () => undefined) };
        return { service: new UserListsService(repository as never, mediaRepository as never, activity as never) };
    }

    it('creates a private list by default with an owner relation', async () => {
        const { service } = createService();
        const list = await service.create(7, { name: 'Favorites' });
        expect(list.visibility).toBe(ListVisibility.PRIVATE);
        expect(list.owner).toEqual({ id: 7 });
        expect(list.items).toEqual([]);
    });

    it('rejects duplicate names and non-owner mutations', async () => {
        const existing = Object.assign(new UserList(), {
            id: 'list-1',
            owner: { id: 7 },
            name: 'Favorites',
            items: [],
        });
        const { service } = createService([existing]);
        await expect(service.create(7, { name: 'Favorites' })).rejects.toBeInstanceOf(ConflictException);
        await expect(service.update(8, 'list-1', { name: 'Changed' })).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('maps a concurrent list-name duplicate to conflict', async () => {
        const duplicateError = new QueryFailedError('INSERT', [], { code: '23505' });
        const { service } = createService([], mediaItem, duplicateError);
        await expect(service.create(7, { name: 'Favorites' })).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects private access and duplicate items', async () => {
        const existing = Object.assign(new UserList(), {
            id: 'list-1',
            owner: { id: 7 },
            name: 'Favorites',
            visibility: ListVisibility.PRIVATE,
            items: [mediaItem],
        });
        const { service } = createService([existing]);
        await expect(service.findOne(8, 'list-1')).rejects.toBeInstanceOf(NotFoundException);
        await expect(service.addItem(7, 'list-1', { mediaItemId: mediaItem.id })).rejects.toBeInstanceOf(
            ConflictException,
        );
    });

    it('allows public access to other users and rejects unapproved items', async () => {
        const publicList = Object.assign(new UserList(), {
            id: 'public-list',
            owner: { id: 8, username: 'owner' },
            name: 'Public',
            visibility: ListVisibility.PUBLIC,
            items: [],
        });
        const { service } = createService([publicList]);
        const result = await service.findOne(7, publicList.id);
        expect(result).toBe(publicList);

        const rejected = Object.assign(new MediaItem(), mediaItem, { approvalStatus: ApprovalStatus.PENDING });
        const rejectedService = createService(
            [
                Object.assign(new UserList(), {
                    id: 'list-2',
                    owner: { id: 7 },
                    name: 'List',
                    items: [],
                }),
            ],
            rejected,
        ).service;
        await expect(rejectedService.addItem(7, 'list-2', { mediaItemId: rejected.id })).rejects.toThrow();
    });

    it('removes an item from an owned list', async () => {
        const list = Object.assign(new UserList(), {
            id: 'list-3',
            owner: { id: 7 },
            name: 'List',
            items: [mediaItem],
        });
        const { service } = createService([list]);
        await service.removeItem(7, list.id, mediaItem.id);
        expect(list.items).toEqual([]);
    });
});

describe('UserListsService: casos adicionales', () => {
    const ownerId = 7;
    const approved = Object.assign(new MediaItem(), {
        id: '55555555-5555-4555-8555-555555555555',
        approvalStatus: ApprovalStatus.APPROVED,
        type: MediaType.MOVIE,
    });
    const ownedList = (overrides: Partial<UserList> = {}) =>
        Object.assign(new UserList(), {
            id: 'list-1',
            owner: { id: ownerId, username: 'pepe' },
            name: 'Favoritos',
            visibility: ListVisibility.PRIVATE,
            items: [],
            ...overrides,
        });

    let repository: {
        create: Mock;
        findOne: Mock;
        find: Mock;
        findAndCount: Mock;
        save: Mock;
        remove: Mock;
    };
    let mediaRepository: { findOne: Mock };
    let activity: { logActivity: Mock };
    let service: UserListsService;

    beforeEach(() => {
        repository = {
            create: vi.fn((value: Partial<UserList>) => Object.assign(new UserList(), value)),
            findOne: vi.fn().mockResolvedValue(null),
            find: vi.fn().mockResolvedValue([]),
            findAndCount: vi.fn().mockResolvedValue([[], 0]),
            save: vi.fn(async (list: UserList) => list),
            remove: vi.fn(async (list: UserList) => list),
        };
        mediaRepository = { findOne: vi.fn().mockResolvedValue(approved) };
        activity = { logActivity: vi.fn().mockResolvedValue(undefined) };
        service = new UserListsService(repository as never, mediaRepository as never, activity as never);
    });

    describe('create', () => {
        it('respeta la descripción y la visibilidad enviadas y registra la actividad', async () => {
            const list = await service.create(ownerId, {
                name: 'Para el finde',
                description: 'Juegos cortos',
                visibility: ListVisibility.PUBLIC,
            });

            expect(list).toMatchObject({ description: 'Juegos cortos', visibility: ListVisibility.PUBLIC });
            expect(activity.logActivity).toHaveBeenCalledWith(ownerId, { action: ActivityAction.LIST_CREATED });
        });

        it('sin descripción guarda null', async () => {
            const list = await service.create(ownerId, { name: 'Sin descripción' });
            expect(list.description).toBeNull();
        });

        it('no oculta otros errores de base de datos ni registra actividad', async () => {
            const failure = new QueryFailedError('INSERT', [], { code: '08006' });
            repository.save.mockRejectedValue(failure);

            await expect(service.create(ownerId, { name: 'X' })).rejects.toBe(failure);
            expect(activity.logActivity).not.toHaveBeenCalled();
        });
    });

    describe('consultas', () => {
        it('findAll trae solo las listas del dueño, más recientes primero', async () => {
            await service.findAll(ownerId);

            expect(repository.find).toHaveBeenCalledWith({
                where: { owner: { id: ownerId } },
                relations: { owner: true, items: true },
                order: { createdAt: 'DESC' },
            });
        });

        it('findPublic pagina, excluye las propias y expone el username del dueño', async () => {
            const publicList = ownedList({
                id: 'public-1',
                owner: { id: 8, username: 'maria' } as never,
                visibility: ListVisibility.PUBLIC,
            });
            repository.findAndCount.mockResolvedValue([[publicList], 21]);

            const result = await service.findPublic(ownerId, { page: 3, limit: 10 });

            const options = repository.findAndCount.mock.calls[0][0];
            expect(options.where.visibility).toBe(ListVisibility.PUBLIC);
            expect(options.where.owner.id).toEqual(Not(ownerId));
            expect(options).toMatchObject({ skip: 20, take: 10 });
            expect(result.data[0].ownerUsername).toBe('maria');
            expect(result.meta).toEqual({ total: 21, page: 3, limit: 10, totalPages: 3 });
        });

        it('findOne responde 404 si la lista no existe', async () => {
            await expect(service.findOne(ownerId, 'nope')).rejects.toBeInstanceOf(NotFoundException);
        });

        it('el dueño puede ver su propia lista privada', async () => {
            const list = ownedList();
            repository.findOne.mockResolvedValue(list);
            await expect(service.findOne(ownerId, 'list-1')).resolves.toBe(list);
        });
    });

    describe('update', () => {
        it('responde 404 si la lista no existe', async () => {
            await expect(service.update(ownerId, 'nope', { name: 'X' })).rejects.toBeInstanceOf(NotFoundException);
        });

        it('aplica los cambios en una lista propia', async () => {
            repository.findOne.mockResolvedValueOnce(ownedList());

            const updated = await service.update(ownerId, 'list-1', {
                name: 'Nuevo nombre',
                visibility: ListVisibility.PUBLIC,
            });

            expect(updated).toMatchObject({ name: 'Nuevo nombre', visibility: ListVisibility.PUBLIC });
            expect(repository.save).toHaveBeenCalledTimes(1);
        });

        it('responde 409 si el nuevo nombre ya existe en otra lista del dueño', async () => {
            repository.findOne
                .mockResolvedValueOnce(ownedList())
                .mockResolvedValueOnce(ownedList({ id: 'list-2', name: 'Pendientes' }));

            await expect(service.update(ownerId, 'list-1', { name: 'Pendientes' })).rejects.toBeInstanceOf(
                ConflictException,
            );
            expect(repository.save).not.toHaveBeenCalled();
        });

        it('no busca duplicados si el nombre no cambia', async () => {
            repository.findOne.mockResolvedValueOnce(ownedList());

            await service.update(ownerId, 'list-1', { name: 'Favoritos', description: 'Otra' });

            expect(repository.findOne).toHaveBeenCalledTimes(1);
        });

        it('traduce un nombre duplicado concurrente (23505) a 409', async () => {
            repository.findOne.mockResolvedValueOnce(ownedList());
            repository.save.mockRejectedValue(new QueryFailedError('UPDATE', [], { code: '23505' }));

            await expect(service.update(ownerId, 'list-1', { description: 'x' })).rejects.toBeInstanceOf(
                ConflictException,
            );
        });

        it('no oculta otros errores de base de datos', async () => {
            const failure = new Error('connection lost');
            repository.findOne.mockResolvedValueOnce(ownedList());
            repository.save.mockRejectedValue(failure);

            await expect(service.update(ownerId, 'list-1', { description: 'x' })).rejects.toBe(failure);
        });
    });

    describe('remove', () => {
        it('elimina una lista propia', async () => {
            const list = ownedList();
            repository.findOne.mockResolvedValue(list);

            await service.remove(ownerId, 'list-1');

            expect(repository.remove).toHaveBeenCalledWith(list);
        });

        it('responde 403 si la lista es de otro usuario y no borra nada', async () => {
            repository.findOne.mockResolvedValue(ownedList({ owner: { id: 99 } as never }));

            await expect(service.remove(ownerId, 'list-1')).rejects.toBeInstanceOf(ForbiddenException);
            expect(repository.remove).not.toHaveBeenCalled();
        });
    });

    describe('addItem', () => {
        it('agrega un elemento aprobado a la lista', async () => {
            repository.findOne.mockResolvedValue(ownedList());

            const saved = await service.addItem(ownerId, 'list-1', { mediaItemId: approved.id });

            expect(saved.items).toEqual([approved]);
        });

        it('responde 404 si el elemento multimedia no existe', async () => {
            repository.findOne.mockResolvedValue(ownedList());
            mediaRepository.findOne.mockResolvedValue(null);

            await expect(service.addItem(ownerId, 'list-1', { mediaItemId: approved.id })).rejects.toBeInstanceOf(
                NotFoundException,
            );
        });

        it('responde 400 para un elemento no aprobado', async () => {
            repository.findOne.mockResolvedValue(ownedList());
            mediaRepository.findOne.mockResolvedValue({ ...approved, approvalStatus: ApprovalStatus.PENDING });

            await expect(service.addItem(ownerId, 'list-1', { mediaItemId: approved.id })).rejects.toBeInstanceOf(
                BadRequestException,
            );
        });

        it('traduce un elemento duplicado concurrente (23505) a 409', async () => {
            repository.findOne.mockResolvedValue(ownedList());
            repository.save.mockRejectedValue(new QueryFailedError('INSERT', [], { code: '23505' }));

            await expect(service.addItem(ownerId, 'list-1', { mediaItemId: approved.id })).rejects.toBeInstanceOf(
                ConflictException,
            );
        });

        it('no oculta otros errores de base de datos', async () => {
            const failure = new Error('connection lost');
            repository.findOne.mockResolvedValue(ownedList());
            repository.save.mockRejectedValue(failure);

            await expect(service.addItem(ownerId, 'list-1', { mediaItemId: approved.id })).rejects.toBe(failure);
        });
    });

    it('removeItem responde 404 si el elemento no está en la lista', async () => {
        repository.findOne.mockResolvedValue(ownedList({ items: [approved] }));

        await expect(service.removeItem(ownerId, 'list-1', 'otro-id')).rejects.toBeInstanceOf(NotFoundException);
        expect(repository.save).not.toHaveBeenCalled();
    });
});
