import type { UserListEventPayloads } from '../library-elements/user_lists/user-list.events.js';

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
