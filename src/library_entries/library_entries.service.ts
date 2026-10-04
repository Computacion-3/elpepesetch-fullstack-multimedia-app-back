import { ConflictException, Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLibraryEntryDto } from './dto/create-library_entry.dto.js';
import { UpdateLibraryEntryDto } from './dto/update-library_entry.dto.js';
import { LibraryEntry, LibraryStatus } from './entities/library_entry.entity.js';
import { ActivityLogsService } from '../activity_logs/activity_logs.service.js';
import { ActivityAction } from '../activity_logs/entities/activity_log.entity.js';

@Injectable()
export class LibraryEntriesService {
    constructor(
        @Optional()
        @InjectRepository(LibraryEntry)
        private readonly repository: Repository<LibraryEntry>,
        @Optional() private readonly activityLogsService?: ActivityLogsService,
    ) {}

    async create(userId: string, dto: CreateLibraryEntryDto) {
        if (!userId) throw new BadRequestException('Authenticated user id is required');
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
        this.applyStateRules(entry);
        const saved = await this.repository.save(entry);
        await this.activityLogsService?.create(userId, {
            action: ActivityAction.ENTRY_ADDED,
            mediaItemId: entry.mediaItemId,
        });
        return saved;
    }

    async findAll(userId: string, query: LibraryQuery = {}) {
        const page = Math.max(1, query.page ?? 1);
        const limit = Math.min(50, Math.max(1, query.limit ?? 10));
        const where = {
            userId,
            ...(query.status ? { status: query.status } : {}),
            ...(query.isFavorite === undefined ? {} : { isFavorite: query.isFavorite }),
        };
        const [data, total] = await this.repository.findAndCount({
            where,
            order: { addedAt: 'ASC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    async findOne(userId: string, id: string) {
        const entry = await this.repository.findOne({ where: { id, userId } });
        if (!entry) throw new NotFoundException('Library entry not found');
        return entry;
    }

    async update(userId: string, id: string, dto: UpdateLibraryEntryDto) {
        const entry = await this.findOne(userId, id);
        const previousStatus = entry.status;
        const previousProgress = entry.progress;
        const previousFavorite = entry.isFavorite;
        Object.assign(entry, dto);
        this.applyStateRules(entry);
        const saved = await this.repository.save(entry);

        if (entry.status !== previousStatus) {
            await this.activityLogsService?.create(userId, {
                action:
                    entry.status === LibraryStatus.COMPLETED
                        ? ActivityAction.ENTRY_COMPLETED
                        : ActivityAction.STATUS_CHANGED,
                mediaItemId: entry.mediaItemId,
                metadata: { previousStatus, status: entry.status },
            });
        }
        if (entry.progress !== previousProgress) {
            await this.activityLogsService?.create(userId, {
                action: ActivityAction.PROGRESS_UPDATED,
                mediaItemId: entry.mediaItemId,
                metadata: { previousProgress, progress: entry.progress },
            });
        }
        if (entry.isFavorite !== previousFavorite) {
            await this.activityLogsService?.create(userId, {
                action: ActivityAction.FAVORITE_TOGGLED,
                mediaItemId: entry.mediaItemId,
                metadata: { isFavorite: entry.isFavorite },
            });
        }
        return saved;
    }

    async remove(userId: string, id: string) {
        const entry = await this.findOne(userId, id);
        await this.repository.remove(entry);
    }

    private applyStateRules(entry: LibraryEntry): void {
        if (entry.progress < 0) throw new BadRequestException('Progress cannot be negative');
        if (entry.rating !== null && (entry.rating < 1 || entry.rating > 10 || !Number.isInteger(entry.rating))) {
            throw new BadRequestException('Rating must be an integer between 1 and 10');
        }
        if (entry.rating !== null && entry.status === LibraryStatus.PENDING) {
            throw new BadRequestException('A pending entry cannot be rated');
        }
        if (entry.progress > 0 && entry.status === LibraryStatus.PENDING) {
            entry.status = LibraryStatus.IN_PROGRESS;
        }
        if (entry.status === LibraryStatus.IN_PROGRESS && !entry.startedAt) {
            entry.startedAt = new Date();
        }
        if (entry.status === LibraryStatus.COMPLETED) {
            if (!entry.startedAt) entry.startedAt = new Date();
            entry.completedAt = entry.completedAt ?? new Date();
        } else if (entry.completedAt) {
            entry.completedAt = null;
        }
        // TODO: once MediaItem exists, validate the type-specific maximum (pages/durationMinutes).
    }
}

interface LibraryQuery {
    status?: LibraryStatus;
    isFavorite?: boolean;
    page?: number;
    limit?: number;
}
