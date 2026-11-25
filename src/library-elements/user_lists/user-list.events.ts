import type { ListVisibility } from '../enums/library.enums.js';

export type UserListEventPayloads = {
    'list.created': { listId: string; name: string; visibility: ListVisibility; createdAt: string };
    'list.updated': {
        listId: string;
        name: string;
        description: string | null;
        visibility: ListVisibility;
        updatedAt: string;
    };
    'list.deleted': { listId: string };
    'list.item.added': { listId: string; mediaItemId: string; addedAt: string };
    'list.item.removed': { listId: string; mediaItemId: string };
};

export type UserListChangedEvent = {
    [Event in keyof UserListEventPayloads]: {
        ownerId: number;
        event: Event;
        payload: UserListEventPayloads[Event];
    };
}[keyof UserListEventPayloads];
