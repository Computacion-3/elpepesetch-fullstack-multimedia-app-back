import { EventEmitter2 } from '@nestjs/event-emitter';
import { ActivityAction } from '../library-elements/enums/library.enums.js';
import { ActivityEventsListener } from './activity-events.listener.js';

describe('ActivityEventsListener', () => {
    it('sends the persisted activity only to its owner room', () => {
        const events = { emit: vi.fn() } as unknown as EventEmitter2;
        const listener = new ActivityEventsListener(events);
        const createdAt = new Date('2026-10-03T18:30:00.000Z');

        listener.forward({
            userId: 17,
            activityId: '11111111-1111-4111-8111-111111111111',
            action: ActivityAction.ENTRY_ADDED,
            mediaItemId: '22222222-2222-4222-8222-222222222222',
            createdAt,
        });

        expect(events.emit).toHaveBeenCalledWith('realtime.direct', {
            room: 'user:17',
            event: 'activity.created',
            payload: {
                activityId: '11111111-1111-4111-8111-111111111111',
                action: ActivityAction.ENTRY_ADDED,
                mediaItemId: '22222222-2222-4222-8222-222222222222',
                createdAt: '2026-10-03T18:30:00.000Z',
            },
        });
    });
});
