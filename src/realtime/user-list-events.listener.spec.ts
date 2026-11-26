import { EventEmitter2 } from '@nestjs/event-emitter';
import { ListVisibility } from '../library-elements/enums/library.enums.js';
import { UserListEventsListener } from './user-list-events.listener.js';

describe('UserListEventsListener', () => {
    it('forwards list domain events to the owner room through the shared realtime channel', async () => {
        const events = { emit: vi.fn() } as unknown as EventEmitter2;
        const listener = new UserListEventsListener(events);

        await listener.forward({
            ownerId: 42,
            event: 'list.created',
            payload: {
                listId: '11111111-1111-4111-8111-111111111111',
                name: 'Favorites',
                visibility: ListVisibility.PRIVATE,
                createdAt: '2026-01-02T03:04:05.000Z',
            },
        });

        expect(events.emit).toHaveBeenCalledWith('realtime.direct', {
            room: 'user:42',
            event: 'list.created',
            payload: {
                listId: '11111111-1111-4111-8111-111111111111',
                name: 'Favorites',
                visibility: ListVisibility.PRIVATE,
                createdAt: '2026-01-02T03:04:05.000Z',
            },
        });
    });
});
