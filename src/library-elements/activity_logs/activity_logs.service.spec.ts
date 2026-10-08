import { BadRequestException } from '@nestjs/common';
import { ActivityLogsService } from './activity_logs.service.js';
import { ActivityLog } from '../entities/activity_log.entity.js';
import { ActivityAction } from '../enums/library.enums.js';

describe('ActivityLogsService', () => {
  const userId = '11111111-1111-4111-8111-111111111111';

  function createService(logs: ActivityLog[] = []) {
    const repository = {
      create: vi.fn((value: Partial<ActivityLog>) => Object.assign(new ActivityLog(), value)),
      save: vi.fn(async (log: ActivityLog) => log),
      findAndCount: vi.fn(async () => [logs, logs.length] as const),
    };
    return {
      service: new ActivityLogsService(repository as never),
      repository,
    };
  }

  it('writes an activity with its user, action, media item and metadata', async () => {
    const { service, repository } = createService();
    const metadata = { previousStatus: 'PENDING', status: 'IN_PROGRESS' };

    await service.logActivity(userId, {
      action: ActivityAction.STATUS_CHANGED,
      mediaItemId: '22222222-2222-4222-8222-222222222222',
      metadata,
    });

    expect(repository.create).toHaveBeenCalledWith({
      userId,
      action: ActivityAction.STATUS_CHANGED,
      mediaItemId: '22222222-2222-4222-8222-222222222222',
      metadata,
    });
  });

  it('returns only the requested user history with pagination metadata', async () => {
    const logs = [Object.assign(new ActivityLog(), { userId })];
    const { service, repository } = createService(logs);

    const response = await service.findAll(userId, { page: 2, limit: 5 });

    expect(response.meta).toEqual({ total: 1, page: 2, limit: 5, totalPages: 1 });
    expect(repository.findAndCount).toHaveBeenCalledWith({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: 5,
      take: 5,
    });
  });

  it('rejects requests without an authenticated user id', async () => {
    const { service } = createService();

    await expect(service.findAll('')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.logActivity('', { action: ActivityAction.LIST_CREATED })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
