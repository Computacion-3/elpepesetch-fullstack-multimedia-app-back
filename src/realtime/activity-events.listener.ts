import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { userRoom } from '../auth/socket/socket-auth.middleware.js';
import type { ActivityCreatedEvent, ActivityCreatedPayload } from '../library-elements/activity_logs/activity-log.events.js';
import type { RealtimeDelivery } from './realtime.events.js';

@Injectable()
export class ActivityEventsListener {
    constructor(private readonly events: EventEmitter2) {}

    @OnEvent('activity.created')
    forward(event: ActivityCreatedEvent) {
        const { userId, ...payload } = event;
        const delivery: RealtimeDelivery = {
            room: userRoom(userId),
            event: 'activity.created',
            payload: { ...payload, createdAt: payload.createdAt.toISOString() } satisfies ActivityCreatedPayload,
        };
        this.events.emit('realtime.direct', delivery);
    }
}
