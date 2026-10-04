import { ConflictException, Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { CreateUserListDto } from './dto/create-user_list.dto.js';
import { UpdateUserListDto } from './dto/update-user_list.dto.js';
import { ListVisibility, UserList } from './entities/user_list.entity.js';
import { ActivityLogsService } from '../activity_logs/activity_logs.service.js';
import { ActivityAction } from '../activity_logs/entities/activity_log.entity.js';

@Injectable()
export class UserListsService {
    constructor(
        @Optional()
        @InjectRepository(UserList)
        private readonly repository: Repository<UserList>,
        @Optional() private readonly activityLogsService?: ActivityLogsService,
    ) {}

    async create(ownerId: string, dto: CreateUserListDto) {
        const duplicate = await this.repository.findOne({ where: { ownerId, name: dto.name } });
        if (duplicate) throw new ConflictException('List name already exists for this owner');
        const list = await this.repository.save(
            this.repository.create({
                ownerId,
                name: dto.name,
                description: dto.description ?? null,
                visibility: dto.visibility ?? ListVisibility.PRIVATE,
                itemIds: [],
            }),
        );
        await this.activityLogsService?.create(ownerId, { action: ActivityAction.LIST_CREATED });
        return list;
    }

    findAll(ownerId: string) {
        return this.repository.find({ where: { ownerId }, order: { createdAt: 'DESC' } });
    }

    async findPublic(viewerId: string, page = 1, limit = 10) {
        page = Math.max(1, page);
        limit = Math.min(50, Math.max(1, limit));
        const [data, total] = await this.repository.findAndCount({
            where: {
                visibility: ListVisibility.PUBLIC,
                ...(viewerId ? { ownerId: Not(viewerId) } : {}),
            },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    async findOne(ownerId: string, id: string) {
        const list = await this.repository.findOne({
            where: [
                { id, ownerId },
                { id, visibility: ListVisibility.PUBLIC },
            ],
        });
        if (!list) throw new NotFoundException('List not found');
        return list;
    }

    async update(ownerId: string, id: string, dto: UpdateUserListDto) {
        const list = await this.repository.findOne({ where: { id, ownerId } });
        if (!list) throw new NotFoundException('List not found');
        if (dto.name && dto.name !== list.name) {
            const duplicate = await this.repository.findOne({ where: { ownerId, name: dto.name } });
            if (duplicate) throw new ConflictException('List name already exists for this owner');
        }
        Object.assign(list, dto);
        return this.repository.save(list);
    }

    async remove(ownerId: string, id: string) {
        const list = await this.repository.findOne({ where: { id, ownerId } });
        if (!list) throw new NotFoundException('List not found');
        await this.repository.remove(list);
    }

    async addItem(ownerId: string, id: string, mediaItemId: string) {
        if (!mediaItemId) throw new BadRequestException('mediaItemId is required');
        const list = await this.repository.findOne({ where: { id, ownerId } });
        if (!list) throw new NotFoundException('List not found');
        if (list.itemIds.includes(mediaItemId)) throw new ConflictException('The media item is already in the list');
        // TODO: verify MediaItem.approvalStatus === APPROVED using the media module.
        list.itemIds = [...list.itemIds, mediaItemId];
        return this.repository.save(list);
    }

    async removeItem(ownerId: string, id: string, mediaItemId: string) {
        const list = await this.repository.findOne({ where: { id, ownerId } });
        if (!list) throw new NotFoundException('List not found');
        list.itemIds = list.itemIds.filter((itemId) => itemId !== mediaItemId);
        return this.repository.save(list);
    }
}
