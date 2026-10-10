import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { ActivityLogsService } from '../activity_logs/activity_logs.service.js';
import { AddListItemDto } from './dto/add-list-item.dto.js';
import { CreateUserListDto } from './dto/create-user_list.dto.js';
import { ListQueryDto } from './dto/list-query.dto.js';
import { UpdateUserListDto } from './dto/update-user_list.dto.js';
import { UserList } from '../entities/user_list.entity.js';
import { MediaItem } from '../entities/media-item.entity.js';
import { ActivityAction, ApprovalStatus, ListVisibility } from '../enums/library.enums.js';

@Injectable()
export class UserListsService {
    constructor(
        @InjectRepository(UserList) private readonly repository: Repository<UserList>,
        @InjectRepository(MediaItem) private readonly mediaRepository: Repository<MediaItem>,
        private readonly activityLogsService: ActivityLogsService,
    ) {}

    async create(ownerId: number, dto: CreateUserListDto): Promise<UserList> {
        const duplicate = await this.repository.findOne({ where: { owner: { id: ownerId }, name: dto.name } });
        if (duplicate) throw new ConflictException('List name already exists for this owner');
        const list = await this.repository.save(this.repository.create({
            owner: { id: ownerId },
            name: dto.name,
            description: dto.description ?? null,
            visibility: dto.visibility ?? ListVisibility.PRIVATE,
            items: [],
        }));
        await this.activityLogsService.logActivity(ownerId, { action: ActivityAction.LIST_CREATED });
        return list;
    }

    findAll(ownerId: number): Promise<UserList[]> {
        return this.repository.find({
            where: { owner: { id: ownerId } },
            relations: { owner: true, items: true },
            order: { createdAt: 'DESC' },
        });
    }

    async findPublic(ownerId: number, query: ListQueryDto): Promise<PublicListsResponse> {
        const [lists, total] = await this.repository.findAndCount({
            where: { visibility: ListVisibility.PUBLIC, owner: { id: Not(ownerId) } },
            relations: { owner: true, items: true },
            order: { createdAt: 'DESC' },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        });
        return {
            data: lists.map((list) => ({ ...list, ownerUsername: list.owner.username })),
            meta: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) },
        };
    }

    async findOne(viewerId: number, id: string): Promise<UserList> {
        const list = await this.repository.findOne({ where: { id }, relations: { owner: true, items: true } });
        if (!list || (list.visibility === ListVisibility.PRIVATE && list.owner.id !== viewerId)) {
            throw new NotFoundException('List not found');
        }
        return list;
    }

    async update(ownerId: number, id: string, dto: UpdateUserListDto): Promise<UserList> {
        const list = await this.findOwnedList(ownerId, id);
        if (dto.name && dto.name !== list.name) {
            const duplicate = await this.repository.findOne({ where: { owner: { id: ownerId }, name: dto.name } });
            if (duplicate) throw new ConflictException('List name already exists for this owner');
        }
        Object.assign(list, dto);
        return this.repository.save(list);
    }

    async remove(ownerId: number, id: string): Promise<void> {
        await this.repository.remove(await this.findOwnedList(ownerId, id));
    }

    async addItem(ownerId: number, id: string, dto: AddListItemDto): Promise<UserList> {
        const list = await this.findOwnedList(ownerId, id);
        const mediaItem = await this.mediaRepository.findOne({ where: { id: dto.mediaItemId } });
        if (!mediaItem) throw new NotFoundException(`Media item ${dto.mediaItemId} not found`);
        if (mediaItem.approvalStatus !== ApprovalStatus.APPROVED) {
            throw new BadRequestException('Only approved media items can be added to a list');
        }
        if (list.items.some((item) => item.id === mediaItem.id)) throw new ConflictException('The media item is already in the list');
        list.items = [...list.items, mediaItem];
        return this.repository.save(list);
    }

    async removeItem(ownerId: number, id: string, mediaItemId: string): Promise<UserList> {
        const list = await this.findOwnedList(ownerId, id);
        if (!list.items.some((item) => item.id === mediaItemId)) throw new NotFoundException('Media item is not in the list');
        list.items = list.items.filter((item) => item.id !== mediaItemId);
        return this.repository.save(list);
    }

    private async findOwnedList(ownerId: number, id: string): Promise<UserList> {
        const list = await this.repository.findOne({ where: { id }, relations: { owner: true, items: true } });
        if (!list) throw new NotFoundException('List not found');
        if (list.owner.id !== ownerId) throw new ForbiddenException('You do not own this list');
        return list;
    }
}

export interface PublicListView extends UserList { ownerUsername: string; }
export interface PublicListsResponse {
    data: PublicListView[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}
