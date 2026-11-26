import type { ActivityAction } from '../enums/library.enums.js';

export interface ActivityCreatedEvent {
    userId: number;
    activityId: string;
    action: ActivityAction;
    mediaItemId?: string;
    createdAt: Date;
}

export type ActivityCreatedPayload = Omit<ActivityCreatedEvent, 'userId' | 'createdAt'> & {
    createdAt: string;
};
