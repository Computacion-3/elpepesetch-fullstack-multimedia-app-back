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
        return { service: new ActivityLogsService(repository as never), repository };
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
});
