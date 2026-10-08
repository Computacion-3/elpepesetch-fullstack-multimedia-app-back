import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
    NotFoundException,
    Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLogsService } from '../activity_logs/activity_logs.service.js';
import { CreateLibraryEntryDto } from './dto/create-library_entry.dto.js';
import { LibraryQueryDto, LibrarySortBy, SortOrder } from './dto/library-query.dto.js';
import { UpdateLibraryEntryDto } from './dto/update-library_entry.dto.js';
import { LibraryEntry } from '../entities/library_entry.entity.js';
import {
    LIBRARY_MEDIA_CONTEXT,
    LibraryApprovalStatus,
    LibraryMediaItemSnapshot,
    LibraryMediaType,
} from './library-media-context.js';
import type { LibraryMediaContext } from './library-media-context.js';

import { ActivityAction, LibraryStatus } from '../enums/library.enums.js';

@Injectable()
export class LibraryEntriesService {
    constructor(
        @Optional()
        @InjectRepository(LibraryEntry)
        private readonly repository: Repository<LibraryEntry>,
        @Optional() private readonly activityLogsService?: ActivityLogsService,
        @Optional() @Inject(LIBRARY_MEDIA_CONTEXT)
        private readonly mediaContext?: LibraryMediaContext,
    ) {}

    async create(userId: string, dto: CreateLibraryEntryDto): Promise<LibraryEntry> {
        this.requireUserId(userId);
        const mediaItem = await this.getMediaItem(dto.mediaItemId);
        this.assertCanAddMedia(userId, mediaItem);

        const existing = await this.repository.findOne({ where: { userId, mediaItemId: dto.mediaItemId } });
        if (existing) throw new ConflictException('The media item is already in the library');

        const entry = this.repository.create({
            userId,
            mediaItemId: dto.mediaItemId,
            status: dto.status ?? LibraryStatus.PENDING,
            progress: dto.progress ?? 0,
            rating: dto.rating ?? null,
            isFavorite: dto.isFavorite ?? false,
            notes: dto.notes ?? null,
            startedAt: null,
            completedAt: null,
        });
        this.applyStateRules(entry, mediaItem);
        const saved = await this.repository.save(entry);
        await this.recalculateRating(dto.mediaItemId);
        await this.log(userId, ActivityAction.ENTRY_ADDED, dto.mediaItemId);
        return saved;
    }

    async findAll(userId: string, query: LibraryQueryDto): Promise<LibraryListResponse> {
        this.requireUserId(userId);
        const entries = await this.repository.find({
            where: {
                userId,
                ...(query.status ? { status: query.status } : {}),
                ...(query.isFavorite === undefined ? {} : { isFavorite: query.isFavorite }),
            },
        });
        const mediaItems = await this.getMediaItems(entries.map((entry) => entry.mediaItemId));
        const mediaById = new Map(mediaItems.map((media) => [media.id, media]));
        const filtered = entries.filter((entry) => this.matchesQuery(entry, mediaById.get(entry.mediaItemId), query));
        this.sortEntries(filtered, mediaById, query);

        const page = query.page;
        const limit = query.limit;
        const total = filtered.length;
        const data = filtered.slice((page - 1) * limit, page * limit);
        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    async findOne(userId: string, id: string): Promise<LibraryEntry> {
        this.requireUserId(userId);
        const entry = await this.repository.findOne({ where: { id, userId } });
        if (!entry) throw new NotFoundException('Library entry not found');
        return entry;
    }

    async update(userId: string, id: string, dto: UpdateLibraryEntryDto): Promise<LibraryEntry> {
        const entry = await this.findOne(userId, id);
        const mediaItem = await this.getMediaItem(entry.mediaItemId);
        const previous = {
            status: entry.status,
            progress: entry.progress,
            rating: entry.rating,
            isFavorite: entry.isFavorite,
        };

        Object.assign(entry, dto);
        this.applyStateRules(entry, mediaItem);
        const saved = await this.repository.save(entry);
        if (entry.rating !== previous.rating) await this.recalculateRating(entry.mediaItemId);

        if (entry.status !== previous.status) {
            await this.log(
                userId,
                entry.status === LibraryStatus.COMPLETED ? ActivityAction.ENTRY_COMPLETED : ActivityAction.STATUS_CHANGED,
                entry.mediaItemId,
                { previousStatus: previous.status, status: entry.status },
            );
        }
        if (entry.progress !== previous.progress) {
            await this.log(userId, ActivityAction.PROGRESS_UPDATED, entry.mediaItemId, {
                previousProgress: previous.progress,
                progress: entry.progress,
            });
        }
        if (entry.isFavorite !== previous.isFavorite) {
            await this.log(userId, ActivityAction.FAVORITE_TOGGLED, entry.mediaItemId, {
                isFavorite: entry.isFavorite,
            });
        }
        return saved;
    }

    async remove(userId: string, id: string): Promise<void> {
        const entry = await this.findOne(userId, id);
        await this.repository.remove(entry);
        await this.recalculateRating(entry.mediaItemId);
    }

    private async getMediaItem(mediaItemId: string): Promise<LibraryMediaItemSnapshot | null> {
        // TODO: replace the optional context with the real MediaItem repository/service.
        return this.mediaContext?.findById(mediaItemId) ?? null;
    }

    private async getMediaItems(mediaItemIds: string[]): Promise<LibraryMediaItemSnapshot[]> {
        if (!this.mediaContext || mediaItemIds.length === 0) return [];
        return this.mediaContext.findMany([...new Set(mediaItemIds)]);
    }

    private assertCanAddMedia(userId: string, mediaItem: LibraryMediaItemSnapshot | null): void {
        if (!mediaItem) {
            // TODO: require a real MediaItem lookup once the media module is available.
            return;
        }
        if (
            mediaItem.approvalStatus !== LibraryApprovalStatus.APPROVED &&
            !(mediaItem.approvalStatus === LibraryApprovalStatus.PENDING && mediaItem.createdById === userId)
        ) {
            throw new BadRequestException('The media item cannot be added to this library');
        }
    }

    private applyStateRules(entry: LibraryEntry, mediaItem: LibraryMediaItemSnapshot | null): void {
        if (entry.progress < 0) throw new BadRequestException('Progress cannot be negative');
        if (entry.rating !== null && (!Number.isInteger(entry.rating) || entry.rating < 1 || entry.rating > 10)) {
            throw new BadRequestException('Rating must be an integer between 1 and 10');
        }
        if (entry.rating !== null && entry.status === LibraryStatus.PENDING) {
            throw new BadRequestException('A pending entry cannot be rated');
        }

        const maximum = this.getMaximumProgress(mediaItem);
        if (maximum !== null && entry.progress > maximum) {
            throw new BadRequestException(`Progress cannot exceed ${maximum}`);
        }
        if (entry.progress > 0 && entry.status === LibraryStatus.PENDING) {
            entry.status = LibraryStatus.IN_PROGRESS;
        }
        if (maximum !== null && entry.progress >= maximum && entry.progress > 0) {
            entry.status = LibraryStatus.COMPLETED;
        }
        if (entry.status === LibraryStatus.IN_PROGRESS && !entry.startedAt) {
            entry.startedAt = new Date();
        }
        if (entry.status === LibraryStatus.COMPLETED) {
            if (maximum !== null) entry.progress = maximum;
            if (!entry.startedAt) entry.startedAt = new Date();
            entry.completedAt = entry.completedAt ?? new Date();
        } else {
            entry.completedAt = null;
        }
    }

    private getMaximumProgress(mediaItem: LibraryMediaItemSnapshot | null): number | null {
        if (!mediaItem) {
            // TODO: determine the maximum from MediaItem.type, pages and durationMinutes.
            return null;
        }
        if (mediaItem.type === LibraryMediaType.BOOK) return mediaItem.pages ?? null;
        if (mediaItem.type === LibraryMediaType.MOVIE) return mediaItem.durationMinutes ?? null;
        return null;
    }

    private matchesQuery(
        entry: LibraryEntry,
        mediaItem: LibraryMediaItemSnapshot | undefined,
        query: LibraryQueryDto,
    ): boolean {
        if (!mediaItem) return !query.q && !query.type && !query.genreId && query.year === undefined;
        return (
            (!query.q ||
                mediaItem.title.toLowerCase().includes(query.q.toLowerCase()) ||
                (!!mediaItem.creator && mediaItem.creator.toLowerCase().includes(query.q.toLowerCase()))) &&
            (!query.type || mediaItem.type === query.type) &&
            (!query.genreId || mediaItem.genreIds.includes(query.genreId)) &&
            (query.year === undefined || mediaItem.releaseYear === query.year)
        );
    }

    private sortEntries(
        entries: LibraryEntry[],
        mediaById: Map<string, LibraryMediaItemSnapshot>,
        query: LibraryQueryDto,
    ): void {
        const direction = query.order === SortOrder.DESC ? -1 : 1;
        entries.sort((left, right) => {
            const leftMedia = mediaById.get(left.mediaItemId);
            const rightMedia = mediaById.get(right.mediaItemId);
            let comparison = 0;
            if (query.sortBy === LibrarySortBy.TITLE) comparison = (leftMedia?.title ?? '').localeCompare(rightMedia?.title ?? '');
            if (query.sortBy === LibrarySortBy.RELEASE_YEAR) comparison = (leftMedia?.releaseYear ?? 0) - (rightMedia?.releaseYear ?? 0);
            if (query.sortBy === LibrarySortBy.AVERAGE_RATING) {
                comparison = (leftMedia?.averageRating ?? 0) - (rightMedia?.averageRating ?? 0);
            }
            if (query.sortBy === LibrarySortBy.ADDED_AT) comparison = left.addedAt.getTime() - right.addedAt.getTime();
            return comparison * direction;
        });
    }

    private async recalculateRating(mediaItemId: string): Promise<void> {
        if (!this.mediaContext) {
            // TODO: update MediaItem.averageRating and MediaItem.ratingsCount using the real media entity.
            return;
        }
        const entries = await this.repository.find({ where: { mediaItemId } });
        const ratings = entries.flatMap((entry) => (entry.rating === null ? [] : [entry.rating]));
        const averageRating = ratings.length === 0 ? 0 : ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
        await this.mediaContext.updateRatingStats(mediaItemId, Number(averageRating.toFixed(1)), ratings.length);
    }

    private async log(
        userId: string,
        action: ActivityAction,
        mediaItemId: string,
        metadata?: Record<string, unknown>,
    ): Promise<void> {
        await this.activityLogsService?.create(userId, { action, mediaItemId, metadata });
    }

    private requireUserId(userId: string): void {
        // TODO: replace x-user-id with the authenticated user supplied by the future auth guard.
        if (!userId) throw new BadRequestException('Authenticated user id is required');
    }
}

export interface LibraryListResponse {
    data: LibraryEntry[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
