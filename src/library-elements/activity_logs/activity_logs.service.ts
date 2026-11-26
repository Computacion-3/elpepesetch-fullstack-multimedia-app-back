import { BadRequestException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from '../entities/activity_log.entity.js';
import { CreateActivityLogDto } from './dto/create-activity_log.dto.js';
import { ActivityQueryDto } from './dto/activity-query.dto.js';
import { ActivityAction } from '../enums/library.enums.js';
import type { ActivityCreatedEvent } from './activity-log.events.js';

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
        @InjectRepository(ActivityLog)
        private readonly repository: Repository<ActivityLog>,
        private readonly events: EventEmitter2,
    ) {}

    /**
     * Reusable activity writer for LibraryService, ListsService and ReviewsService.
     *
     */
    async logActivity(userId: number, dto: CreateActivityLogDto): Promise<ActivityLog> {
        this.requireUserId(userId);
        const activity = this.repository.create({
            user: { id: userId },
            action: dto.action,
            mediaItem: dto.mediaItemId ? { id: dto.mediaItemId } : null,
            metadata: dto.metadata ?? null,
        });
        const saved = await this.repository.save(activity);
        const event: ActivityCreatedEvent = {
            userId,
            activityId: saved.id,
            action: saved.action,
            ...(saved.mediaItem ? { mediaItemId: saved.mediaItem.id } : {}),
            createdAt: saved.createdAt,
        };
        await this.events.emitAsync('activity.created', event);
        return saved;
    }

    /**
     * Backward-compatible alias used by the existing library and lists modules.
     */
    create(userId: number, dto: CreateActivityLogDto): Promise<ActivityLog> {
        return this.logActivity(userId, dto);
    }

    async findAll(
        userId: number,
        query: ActivityQueryDto = new ActivityQueryDto(),
        loadMediaItem = false,
    ): Promise<ActivityListResponse> {
        this.requireUserId(userId);
        const page = query.page;
        const limit = query.limit;
        const [data, total] = await this.repository.findAndCount({
            where: { user: { id: userId } },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
            ...(loadMediaItem ? { relations: { mediaItem: { genres: true } } } : {}),
        });
        return {
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    private requireUserId(userId: number): void {
        if (!userId || !Number.isInteger(userId)) throw new BadRequestException('Authenticated user id is required');
    }
}

export { ActivityAction };
export { ActivityLogsService as ActivityService };
