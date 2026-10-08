import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLogsService } from '../activity_logs/activity_logs.service.js';
import { CreateLibraryEntryDto } from './dto/create-library_entry.dto.js';
import { LibraryQueryDto, LibrarySortBy, SortOrder } from './dto/library-query.dto.js';
import { UpdateLibraryEntryDto } from './dto/update-library_entry.dto.js';
import { LibraryEntry } from '../entities/library_entry.entity.js';
import { MediaItem } from '../entities/media-item.entity.js';
import { ActivityAction, ApprovalStatus, LibraryStatus, MediaType } from '../enums/library.enums.js';

@Injectable()
export class LibraryEntriesService {
    constructor(
        @InjectRepository(LibraryEntry) private readonly repository: Repository<LibraryEntry>,
        @InjectRepository(MediaItem) private readonly mediaRepository: Repository<MediaItem>,
        private readonly activityLogsService: ActivityLogsService,
    ) {}

    async create(userId: number, dto: CreateLibraryEntryDto): Promise<LibraryEntry> {
        const mediaItem = await this.getMediaItem(dto.mediaItemId);
        if (
            mediaItem.approvalStatus !== ApprovalStatus.APPROVED &&
            !(mediaItem.approvalStatus === ApprovalStatus.PENDING && mediaItem.createdBy.id === userId)
        ) {
            throw new BadRequestException('The media item cannot be added to this library');
        }
        const existing = await this.repository.findOne({
            where: { user: { id: userId }, mediaItem: { id: dto.mediaItemId } },
        });
        if (existing) throw new ConflictException('The media item is already in the library');
        const entry = this.repository.create({
            user: { id: userId },
            mediaItem,
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
        await this.recalculateRating(mediaItem.id);
        await this.activityLogsService.logActivity(userId, {
            action: ActivityAction.ENTRY_ADDED,
            mediaItemId: mediaItem.id,
        });
        return saved;
    }

    async findAll(userId: number, query: LibraryQueryDto): Promise<LibraryListResponse> {
        let entries = await this.repository.find({
            where: {
                user: { id: userId },
                ...(query.status ? { status: query.status } : {}),
                ...(query.isFavorite === undefined ? {} : { isFavorite: query.isFavorite }),
            },
            relations: { mediaItem: { genres: true } },
        });
        entries = entries.filter((entry) => this.matchesQuery(entry, query));
        this.sortEntries(entries, query);
        const total = entries.length;
        const data = entries.slice((query.page - 1) * query.limit, query.page * query.limit);
        return {
            data,
            meta: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) },
        };
    }

    async findOne(userId: number, id: string): Promise<LibraryEntry> {
        const entry = await this.repository.findOne({
            where: { id, user: { id: userId } },
            relations: { mediaItem: true },
        });
        if (!entry) throw new NotFoundException('Library entry not found');
        return entry;
    }

    async update(userId: number, id: string, dto: UpdateLibraryEntryDto): Promise<LibraryEntry> {
        const entry = await this.findOne(userId, id);
        const previous = {
            status: entry.status,
            progress: entry.progress,
            rating: entry.rating,
            isFavorite: entry.isFavorite,
        };
        Object.assign(entry, dto);
        this.applyStateRules(entry, entry.mediaItem);
        const saved = await this.repository.save(entry);
        if (entry.rating !== previous.rating) await this.recalculateRating(entry.mediaItem.id);
        if (entry.status !== previous.status) {
            await this.activityLogsService.logActivity(userId, {
                action:
                    entry.status === LibraryStatus.COMPLETED
                        ? ActivityAction.ENTRY_COMPLETED
                        : ActivityAction.STATUS_CHANGED,
                mediaItemId: entry.mediaItem.id,
                metadata: { previousStatus: previous.status, status: entry.status },
            });
        }
        if (entry.progress !== previous.progress) {
            await this.activityLogsService.logActivity(userId, {
                action: ActivityAction.PROGRESS_UPDATED,
                mediaItemId: entry.mediaItem.id,
                metadata: { previousProgress: previous.progress, progress: entry.progress },
            });
        }
        if (entry.isFavorite !== previous.isFavorite) {
            await this.activityLogsService.logActivity(userId, {
                action: ActivityAction.FAVORITE_TOGGLED,
                mediaItemId: entry.mediaItem.id,
                metadata: { isFavorite: entry.isFavorite },
            });
        }
        return saved;
    }

    async remove(userId: number, id: string): Promise<void> {
        const entry = await this.findOne(userId, id);
        await this.repository.remove(entry);
        await this.recalculateRating(entry.mediaItem.id);
    }

    private async getMediaItem(id: string): Promise<MediaItem> {
        const mediaItem = await this.mediaRepository.findOne({
            where: { id },
            relations: { genres: true, createdBy: true },
        });
        if (!mediaItem) throw new NotFoundException(`Media item ${id} not found`);
        return mediaItem;
    }

    private applyStateRules(entry: LibraryEntry, mediaItem: MediaItem): void {
        if (entry.progress < 0) throw new BadRequestException('Progress cannot be negative');
        if (entry.rating !== null && (!Number.isInteger(entry.rating) || entry.rating < 1 || entry.rating > 10)) {
            throw new BadRequestException('Rating must be an integer between 1 and 10');
        }
        if (entry.rating !== null && entry.status === LibraryStatus.PENDING) {
            throw new BadRequestException('A pending entry cannot be rated');
        }
        const maximum = this.getMaximumProgress(mediaItem);
        if (maximum !== null && entry.progress > maximum)
            throw new BadRequestException(`Progress cannot exceed ${maximum}`);
        if (entry.progress > 0 && entry.status === LibraryStatus.PENDING) entry.status = LibraryStatus.IN_PROGRESS;
        if (
            maximum !== null &&
            entry.progress >= maximum &&
            entry.progress > 0 &&
            entry.status !== LibraryStatus.DROPPED
        ) {
            entry.status = LibraryStatus.COMPLETED;
        }
        if (entry.status === LibraryStatus.IN_PROGRESS && !entry.startedAt) entry.startedAt = new Date();
        if (entry.status === LibraryStatus.COMPLETED) {
            if (maximum !== null) entry.progress = maximum;
            if (!entry.startedAt) entry.startedAt = new Date();
            entry.completedAt ??= new Date();
        } else {
            entry.completedAt = null;
        }
    }

    private getMaximumProgress(mediaItem: MediaItem): number | null {
        if (mediaItem.type === MediaType.BOOK) return mediaItem.pages;
        if (mediaItem.type === MediaType.MOVIE) return mediaItem.durationMinutes;
        return null;
    }

    private matchesQuery(entry: LibraryEntry, query: LibraryQueryDto): boolean {
        const media = entry.mediaItem;
        const text = query.q?.toLowerCase();
        return (
            (!text || media.title.toLowerCase().includes(text) || media.creator.toLowerCase().includes(text)) &&
            (!query.type || media.type === query.type) &&
            (!query.genreId || media.genres.some((genre) => genre.id === query.genreId)) &&
            (query.year === undefined || media.releaseYear === query.year)
        );
    }

    private sortEntries(entries: LibraryEntry[], query: LibraryQueryDto): void {
        const direction = query.order === SortOrder.DESC ? -1 : 1;
        entries.sort((left, right) => {
            let comparison = 0;
            if (query.sortBy === LibrarySortBy.TITLE)
                comparison = left.mediaItem.title.localeCompare(right.mediaItem.title);
            if (query.sortBy === LibrarySortBy.RELEASE_YEAR)
                comparison = left.mediaItem.releaseYear - right.mediaItem.releaseYear;
            if (query.sortBy === LibrarySortBy.AVERAGE_RATING)
                comparison = Number(left.mediaItem.averageRating) - Number(right.mediaItem.averageRating);
            if (query.sortBy === LibrarySortBy.ADDED_AT) comparison = left.addedAt.getTime() - right.addedAt.getTime();
            return comparison * direction;
        });
    }

    private async recalculateRating(mediaItemId: string): Promise<void> {
        const entries = await this.repository.find({ where: { mediaItem: { id: mediaItemId } } });
        const ratings = entries.flatMap((entry) => (entry.rating === null ? [] : [entry.rating]));
        const mediaItem = await this.mediaRepository.findOne({ where: { id: mediaItemId } });
        if (!mediaItem) return;
        mediaItem.ratingsCount = ratings.length;
        mediaItem.averageRating =
            ratings.length === 0
                ? 0
                : Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1));
        await this.mediaRepository.save(mediaItem);
    }
}

export interface LibraryListResponse {
    data: LibraryEntry[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}
