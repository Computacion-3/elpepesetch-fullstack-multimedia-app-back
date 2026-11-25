import { BadRequestException } from '@nestjs/common';
import { ActivityLogsService } from './activity_logs.service.js';
import { ActivityLog } from '../entities/activity_log.entity.js';
import { ActivityAction } from '../enums/library.enums.js';

describe('ActivityLogsService', () => {
    function createService(logs: ActivityLog[] = []) {
        const repository = {
            create: vi.fn((value: Partial<ActivityLog>) => Object.assign(new ActivityLog(), value)),
            save: vi.fn(async (log: ActivityLog) => log),
            findAndCount: vi.fn(async () => [logs, logs.length] as const),
        };
        const events = { emitAsync: vi.fn().mockResolvedValue([]) };
        return { service: new ActivityLogsService(repository as never, events as never), repository, events };
    }

    it('writes an activity using real relation references', async () => {
        const { service, repository } = createService();
        await service.logActivity(7, {
            action: ActivityAction.STATUS_CHANGED,
            mediaItemId: '22222222-2222-4222-8222-222222222222',
            metadata: { status: 'IN_PROGRESS' },
        });
        expect(repository.create).toHaveBeenCalledWith({
            user: { id: 7 },
            action: ActivityAction.STATUS_CHANGED,
            mediaItem: { id: '22222222-2222-4222-8222-222222222222' },
            metadata: { status: 'IN_PROGRESS' },
        });
    });

    it('filters by related user and paginates newest activity', async () => {
        const { service, repository } = createService([]);
        await service.findAll(7, { page: 2, limit: 5 });
        expect(repository.findAndCount).toHaveBeenCalledWith({
            where: { user: { id: 7 } },
            order: { createdAt: 'DESC' },
            skip: 5,
            take: 5,
        });
    });

    it('rejects an invalid authenticated user id', async () => {
        const { service } = createService();
        await expect(service.findAll(0)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('accepts every specified activity action and preserves metadata', async () => {
        const { service, repository } = createService();
        for (const action of Object.values(ActivityAction)) {
            await service.logActivity(7, { action, metadata: { source: 'test' } });
        }
        expect(repository.create).toHaveBeenCalledTimes(Object.values(ActivityAction).length);
        expect(repository.create).toHaveBeenLastCalledWith({
            user: { id: 7 },
            action: ActivityAction.LIST_CREATED,
            mediaItem: null,
            metadata: { source: 'test' },
        });
    });

    it('publishes one owner-scoped event with the persisted activity after saving', async () => {
        const createdAt = new Date('2026-10-03T18:30:00.000Z');
        const saved = Object.assign(new ActivityLog(), {
            id: '11111111-1111-4111-8111-111111111111',
            action: ActivityAction.ENTRY_ADDED,
            mediaItem: { id: '22222222-2222-4222-8222-222222222222' },
            createdAt,
        });
        const { service, repository, events } = createService();
        repository.save.mockResolvedValue(saved);

        await service.logActivity(7, { action: ActivityAction.ENTRY_ADDED, mediaItemId: saved.mediaItem.id });

        expect(events.emitAsync).toHaveBeenCalledTimes(1);
        expect(events.emitAsync).toHaveBeenCalledWith('activity.created', {
            userId: 7,
            activityId: saved.id,
            action: ActivityAction.ENTRY_ADDED,
            mediaItemId: saved.mediaItem.id,
            createdAt,
        });
    });

    it('does not publish when activity persistence fails', async () => {
        const { service, repository, events } = createService();
        const failure = new Error('database unavailable');
        repository.save.mockRejectedValue(failure);

        await expect(service.logActivity(7, { action: ActivityAction.LIST_CREATED })).rejects.toBe(failure);
        expect(events.emitAsync).not.toHaveBeenCalled();
    });

    it('loads the media relation only for GraphQL history reads', async () => {
        const { service, repository } = createService();

        await service.findAll(7, { page: 1, limit: 10 }, true);

        expect(repository.findAndCount).toHaveBeenCalledWith({
            where: { user: { id: 7 } },
            order: { createdAt: 'DESC' },
            skip: 0,
            take: 10,
            relations: { mediaItem: true },
        });
    });
});
