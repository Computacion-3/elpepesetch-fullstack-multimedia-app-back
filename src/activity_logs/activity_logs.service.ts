import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateActivityLogDto } from './dto/create-activity_log.dto.js';
import { ActivityLog } from './entities/activity_log.entity.js';

@Injectable()
export class ActivityLogsService {
    constructor(
        @Optional()
        @InjectRepository(ActivityLog)
        private readonly repository: Repository<ActivityLog>,
    ) {}

    create(userId: string, dto: CreateActivityLogDto) {
        return this.repository.save(
            this.repository.create({
                userId,
                action: dto.action,
                mediaItemId: dto.mediaItemId ?? null,
                metadata: dto.metadata ?? null,
            }),
        );
    }

    async findAll(userId: string, page = 1, limit = 10) {
        page = Math.max(1, page);
        limit = Math.min(50, Math.max(1, limit));
        const [data, total] = await this.repository.findAndCount({
            where: { userId },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }
}
