import type { UserListEventPayloads } from '../library-elements/user_lists/user-list.events.js';
import type { ActivityCreatedPayload } from '../library-elements/activity_logs/activity-log.events.js';
import type { MediaRatingUpdatedEvent } from '../library-elements/events/media-rating-updated.event.js';
import type { ReviewCreatedEvent } from '../library-elements/events/review-created.event.js';

// Construye en el servidor el nombre de la sala privada de un elemento multimedia.
export const mediaRoom = (mediaItemId: string): string => 'media:' + mediaItemId;

export type ModerationQueueKind = 'MEDIA' | 'REPORT';

export type RealtimeEventPayloads = {
    'media.moderated': {
        mediaItemId: string;
        title: string;
        approvalStatus: 'APPROVED' | 'REJECTED';
        rejectionReason?: string;
    };
    'moderation.queue.changed': { kind: ModerationQueueKind; pendingMedia: number; openReports: number };
    'review.visibility.changed': {
        reviewId: string;
        mediaItemId: string;
        isHidden: true;
        hiddenReason: string;
    };
    'account.updated': { role: 'USER' | 'MODERATOR' | 'ADMIN' };
    'account.deactivated': Record<string, never>;
    'activity.created': ActivityCreatedPayload;
    'media.rating.updated': MediaRatingUpdatedEvent;
    'review.created': Omit<ReviewCreatedEvent, 'mediaItemId'>;
} & UserListEventPayloads;

export type RealtimeEventName = keyof RealtimeEventPayloads;
export type RealtimeDelivery = {
    [Event in RealtimeEventName]: {
        room: string;
        event: Event;
        payload: RealtimeEventPayloads[Event];
        disconnectUser?: boolean;
    };
}[RealtimeEventName];
