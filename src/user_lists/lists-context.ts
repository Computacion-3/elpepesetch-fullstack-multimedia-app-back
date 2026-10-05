export enum ListMediaApprovalStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

export interface ListMediaItemSnapshot {
    id: string;
    approvalStatus: ListMediaApprovalStatus;
}

/**
 * Minimal integration contract for User and MediaItem.
 * TODO: replace this contract with the real services/entities.
 */
export interface ListsContext {
    findMediaItem(mediaItemId: string): Promise<ListMediaItemSnapshot | null>;
    findOwnerUsername(ownerId: string): Promise<string | null>;
}

export const LISTS_CONTEXT = Symbol('LISTS_CONTEXT');
