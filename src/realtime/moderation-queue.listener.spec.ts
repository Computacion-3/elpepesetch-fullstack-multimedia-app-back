import type { DataSource } from 'typeorm';
import { ModerationQueueListener } from './moderation-queue.listener.js';

describe('ModerationQueueListener', () => {
    it('publishes actual queue totals to moderators after reading a consistent database snapshot', async () => {
        const dataSource = { query: vi.fn().mockResolvedValue([{ pendingMedia: 3, openReports: 2 }]) };
        const events = { emit: vi.fn() };
        const listener = new ModerationQueueListener(dataSource as unknown as DataSource, events as any);

        await listener.refresh({ kind: 'REPORT' });

        expect(dataSource.query).toHaveBeenCalledOnce();
        expect(events.emit).toHaveBeenCalledWith('realtime.direct', {
            room: 'moderators',
            event: 'moderation.queue.changed',
            payload: { kind: 'REPORT', pendingMedia: 3, openReports: 2 },
        });
    });
});
