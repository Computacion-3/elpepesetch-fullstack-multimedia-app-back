import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from '../entities/activity_log.entity.js';
import { CreateActivityLogDto } from './dto/create-activity_log.dto.js';
import { ActivityQueryDto } from './dto/activity-query.dto.js';
import { ActivityAction } from '../enums/library.enums.js';

export interface ActivityListResponse {
    data: ActivityLog[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

@Injectable()
export class ActivityLogsService {
    constructor(
        @Optional()
        @InjectRepository(ActivityLog)
        private readonly repository?: Repository<ActivityLog>,
    ) {}

    /**
     * Reusable activity writer for LibraryService, ListsService and ReviewsService.
     *
     * TODO: LibraryService should call this for ENTRY_ADDED, STATUS_CHANGED,
     * PROGRESS_UPDATED, ENTRY_COMPLETED and FAVORITE_TOGGLED.
     * TODO: ListsService should call this for LIST_CREATED.
     * TODO: ReviewsService should call this for REVIEW_CREATED.
     */
    async logActivity(userId: string, dto: CreateActivityLogDto): Promise<ActivityLog> {
        this.requireUserId(userId);
        if (!this.repository) throw new Error('ActivityLog repository is not configured');

        const activity = this.repository.create({
            userId,
            action: dto.action,
            mediaItemId: dto.mediaItemId ?? null,
            metadata: dto.metadata ?? null,
        });
        return this.repository.save(activity);
    }

    /**
     * Backward-compatible alias used by the existing library and lists modules.
     */
    create(userId: string, dto: CreateActivityLogDto): Promise<ActivityLog> {
        return this.logActivity(userId, dto);
    }

    async findAll(userId: string, query: ActivityQueryDto = new ActivityQueryDto()): Promise<ActivityListResponse> {
        this.requireUserId(userId);
        if (!this.repository) throw new Error('ActivityLog repository is not configured');

        const page = query.page;
        const limit = query.limit;
        const [data, total] = await this.repository.findAndCount({
            where: { userId },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return {
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    private requireUserId(userId: string): void {
        // TODO: replace x-user-id with the authenticated user from the future auth guard.
        if (!userId) throw new BadRequestException('Authenticated user id is required');
    }
}

export { ActivityAction };
export { ActivityLogsService as ActivityService };
