export enum MediaType {
    GAME = 'GAME',
    MOVIE = 'MOVIE',
    BOOK = 'BOOK',
}

export enum ApprovalStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

export enum LibraryStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    DROPPED = 'DROPPED',
}

export enum ListVisibility {
    PRIVATE = 'PRIVATE',
    PUBLIC = 'PUBLIC',
}

export enum ReportReason {
    SPOILER = 'SPOILER',
    OFFENSIVE = 'OFFENSIVE',
    SPAM = 'SPAM',
    OTHER = 'OTHER',
}

export enum ReportStatus {
    OPEN = 'OPEN',
    RESOLVED = 'RESOLVED',
    DISMISSED = 'DISMISSED',
}

export enum ReportResolutionAction {
    HIDE = 'HIDE',
    DISMISS = 'DISMISS',
}

export enum ActivityAction {
    ENTRY_ADDED = 'ENTRY_ADDED',
    STATUS_CHANGED = 'STATUS_CHANGED',
    PROGRESS_UPDATED = 'PROGRESS_UPDATED',
    ENTRY_COMPLETED = 'ENTRY_COMPLETED',
    FAVORITE_TOGGLED = 'FAVORITE_TOGGLED',
    REVIEW_CREATED = 'REVIEW_CREATED',
    LIST_CREATED = 'LIST_CREATED',
}
