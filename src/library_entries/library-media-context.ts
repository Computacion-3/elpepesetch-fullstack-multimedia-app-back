export enum LibraryMediaType {
    GAME = 'GAME',
    MOVIE = 'MOVIE',
    BOOK = 'BOOK',
}

export enum LibraryApprovalStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

/**
 * Minimal integration contract for the future media module.
 * TODO: replace this contract with the real MediaItem entity/service.
 */
export interface LibraryMediaItemSnapshot {
    id: string;
    title: string;
    creator?: string | null;
    type: LibraryMediaType;
    releaseYear: number;
    genreIds: string[];
    approvalStatus: LibraryApprovalStatus;
    createdById?: string | null;
    pages?: number | null;
    durationMinutes?: number | null;
    averageRating?: number;
}

export interface LibraryMediaContext {
    findById(mediaItemId: string): Promise<LibraryMediaItemSnapshot | null>;
    findMany(ids: string[]): Promise<LibraryMediaItemSnapshot[]>;
    updateRatingStats(mediaItemId: string, averageRating: number, ratingsCount: number): Promise<void>;
}

export const LIBRARY_MEDIA_CONTEXT = Symbol('LIBRARY_MEDIA_CONTEXT');
