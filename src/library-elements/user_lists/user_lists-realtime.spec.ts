import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserList } from '../entities/user_list.entity.js';
import { MediaItem } from '../entities/media-item.entity.js';
import { ApprovalStatus, ListVisibility, MediaType } from '../enums/library.enums.js';
import { UserListsService } from './user_lists.service.js';

describe('UserListsService realtime events', () => {
    const ownerId = 7;
    const listId = '11111111-1111-4111-8111-111111111111';
    const mediaItemId = '22222222-2222-4222-8222-222222222222';
    const createdAt = new Date('2026-01-02T03:04:05.000Z');
    const updatedAt = new Date('2026-02-03T04:05:06.000Z');
    const mediaItem = Object.assign(new MediaItem(), {
        id: mediaItemId,
        title: 'Test media',
        type: MediaType.BOOK,
        approvalStatus: ApprovalStatus.APPROVED,
    });
    const ownedList = (items: MediaItem[] = []) =>
        Object.assign(new UserList(), {
            id: listId,
            owner: { id: ownerId, username: 'pepe' },
            name: 'Favorites',
            description: null,
            visibility: ListVisibility.PRIVATE,
            items,
            createdAt,
            updatedAt,
        });

    let repository: {
        create: ReturnType<typeof vi.fn>;
        findOne: ReturnType<typeof vi.fn>;
        find: ReturnType<typeof vi.fn>;
        findAndCount: ReturnType<typeof vi.fn>;
        save: ReturnType<typeof vi.fn>;
        remove: ReturnType<typeof vi.fn>;
    };
    let mediaRepository: { findOne: ReturnType<typeof vi.fn> };
    let activity: { logActivity: ReturnType<typeof vi.fn> };
    let events: { emitAsync: ReturnType<typeof vi.fn> };
    let service: UserListsService;

    beforeEach(() => {
        repository = {
            create: vi.fn((values) => Object.assign(new UserList(), values)),
            findOne: vi.fn(),
            find: vi.fn().mockResolvedValue([]),
            findAndCount: vi.fn().mockResolvedValue([[], 0]),
            save: vi.fn(async (list) => list),
            remove: vi.fn(async (list) => list),
        };
        mediaRepository = { findOne: vi.fn().mockResolvedValue(mediaItem) };
        activity = { logActivity: vi.fn().mockResolvedValue(undefined) };
        events = { emitAsync: vi.fn().mockResolvedValue([]) };
        service = new UserListsService(
            repository as never,
            mediaRepository as never,
            activity as never,
            events as unknown as EventEmitter2,
        );
    });

    it('emits list.created after persistence and activity logging', async () => {
        repository.findOne.mockResolvedValue(null);
        repository.save.mockImplementation(async (list) => Object.assign(list, { id: listId, createdAt }));

        await service.create(ownerId, { name: 'Favorites' });

        expect(events.emitAsync).toHaveBeenCalledWith('user-list.changed', {
            ownerId,
            event: 'list.created',
            payload: { listId, name: 'Favorites', visibility: ListVisibility.PRIVATE, createdAt: createdAt.toISOString() },
        });
        expect(repository.save.mock.invocationCallOrder[0]).toBeLessThan(events.emitAsync.mock.invocationCallOrder[0]);
        expect(activity.logActivity.mock.invocationCallOrder[0]).toBeLessThan(events.emitAsync.mock.invocationCallOrder[0]);
    });

    it('emits list.updated only when persisted values change', async () => {
        repository.findOne.mockResolvedValueOnce(ownedList());
        repository.save.mockImplementation(async (list) => Object.assign(list, { updatedAt }));

        await service.update(ownerId, listId, { name: 'Reading list' });

        expect(events.emitAsync).toHaveBeenCalledWith('user-list.changed', {
            ownerId,
            event: 'list.updated',
            payload: {
                listId,
                name: 'Reading list',
                description: null,
                visibility: ListVisibility.PRIVATE,
                updatedAt: updatedAt.toISOString(),
            },
        });

        repository.findOne.mockResolvedValueOnce(ownedList());
        events.emitAsync.mockClear();
        await service.update(ownerId, listId, { name: 'Favorites' });
        expect(events.emitAsync).not.toHaveBeenCalled();
    });

    it('emits list.deleted only after a successful delete', async () => {
        repository.findOne.mockResolvedValue(ownedList());
        await service.remove(ownerId, listId);
        expect(events.emitAsync).toHaveBeenCalledWith('user-list.changed', {
            ownerId,
            event: 'list.deleted',
            payload: { listId },
        });

        repository.remove.mockRejectedValue(new Error('delete failed'));
        events.emitAsync.mockClear();
        await expect(service.remove(ownerId, listId)).rejects.toThrow('delete failed');
        expect(events.emitAsync).not.toHaveBeenCalled();
    });

    it('emits item events after persistence and does not emit on a failed save', async () => {
        repository.findOne.mockResolvedValue(ownedList());
        repository.save.mockImplementation(async (list) => list);
        await service.addItem(ownerId, listId, { mediaItemId });

        expect(events.emitAsync).toHaveBeenCalledWith('user-list.changed', {
            ownerId,
            event: 'list.item.added',
            payload: { listId, mediaItemId, addedAt: expect.any(String) },
        });

        const updatedList = ownedList([mediaItem]);
        repository.findOne.mockResolvedValue(updatedList);
        events.emitAsync.mockClear();
        await service.removeItem(ownerId, listId, mediaItemId);
        expect(events.emitAsync).toHaveBeenCalledWith('user-list.changed', {
            ownerId,
            event: 'list.item.removed',
            payload: { listId, mediaItemId },
        });

        repository.findOne.mockResolvedValue(ownedList());
        repository.save.mockRejectedValue(new Error('save failed'));
        events.emitAsync.mockClear();
        await expect(service.addItem(ownerId, listId, { mediaItemId })).rejects.toThrow('save failed');
        expect(events.emitAsync).not.toHaveBeenCalled();
    });
});
