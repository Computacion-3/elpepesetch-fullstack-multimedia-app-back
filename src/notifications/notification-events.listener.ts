import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from './notification.entity.js';
import { NotificationsService } from './notifications.service.js';

@Injectable()
export class NotificationEventsListener {
    constructor(
        private readonly notifications: NotificationsService,
        private readonly events: EventEmitter2,
    ) {}

    @OnEvent('media.moderated')
    async mediaModerated(event: {
        eventId: string;
        creatorId: number;
        mediaItemId: string;
        title: string;
        approvalStatus: 'APPROVED' | 'REJECTED';
        rejectionReason?: string;
    }) {
        const payload = {
            mediaItemId: event.mediaItemId,
            title: event.title,
            approvalStatus: event.approvalStatus,
            ...(event.rejectionReason ? { rejectionReason: event.rejectionReason } : {}),
        };
        await this.notifications.create(event.creatorId, event.eventId, NotificationType.MEDIA_MODERATED, payload);
        this.events.emit('realtime.direct', {
            room: `user:${event.creatorId}`,
            event: 'media.moderated',
            payload,
        });
    }

    @OnEvent('review.visibility.changed')
    async reviewVisibilityChanged(event: {
        eventId: string;
        userId: number;
        reviewId: string;
        mediaItemId: string;
        isHidden: true;
        hiddenReason: string;
    }) {
        const payload = {
            reviewId: event.reviewId,
            mediaItemId: event.mediaItemId,
            isHidden: true,
            hiddenReason: event.hiddenReason,
        };
        await this.notifications.create(
            event.userId,
            event.eventId,
            NotificationType.REVIEW_VISIBILITY_CHANGED,
            payload,
        );
        this.events.emit('realtime.direct', {
            room: `user:${event.userId}`,
            event: 'review.visibility.changed',
            payload,
        });
    }

    @OnEvent('account.updated')
    async accountUpdated(event: { eventId: string; userId: number; role: 'USER' | 'MODERATOR' | 'ADMIN' }) {
        const payload = { role: event.role };
        await this.notifications.create(event.userId, event.eventId, NotificationType.ROLE_CHANGED, payload);
        this.events.emit('realtime.direct', { room: `user:${event.userId}`, event: 'account.updated', payload });
    }
}
