import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import type { UserListChangedEvent } from '../library-elements/user_lists/user-list.events.js';
import { userRoom } from '../auth/socket/socket-auth.middleware.js';
import type { RealtimeDelivery } from './realtime.events.js';

@Injectable()
export class UserListEventsListener {
    constructor(private readonly events: EventEmitter2) {}

    @OnEvent('user-list.changed')
    forward(event: UserListChangedEvent) {
        const { ownerId, ...delivery } = event;
        this.events.emit('realtime.direct', {
            room: userRoom(ownerId),
            ...delivery,
        } satisfies RealtimeDelivery);
    }
}
